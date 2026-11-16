<?php

namespace Tests\Feature;

use App\Models\GitHubAccount;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class GitHubApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_github_login_redirect_uses_the_configured_oauth_credentials(): void
    {
        config()->set([
            'services.github.client_id' => 'client-id',
            'services.github.client_secret' => 'client-secret',
            'services.github.login_callback_url' => 'http://127.0.0.1:8000/api/auth/github/callback',
        ]);

        $response = $this->get('/api/auth/github/redirect');

        $response->assertRedirect();
        $location = (string) $response->headers->get('Location');
        parse_str((string) parse_url($location, PHP_URL_QUERY), $query);

        $this->assertStringStartsWith('https://github.com/login/oauth/authorize?', $location);
        $this->assertSame('client-id', $query['client_id']);
        $this->assertSame('http://127.0.0.1:8000/api/auth/github/callback', $query['redirect_uri']);
        $this->assertNotEmpty($query['state']);
        $this->assertTrue(Cache::has('github.login.oauth.'.hash('sha256', $query['state'])));
    }

    public function test_sync_persists_repository_metadata_and_import_reuses_it(): void
    {
        Http::fake([
            'https://api.github.com/user/repos*' => Http::response([$this->githubRepository()], 200),
        ]);
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        GitHubAccount::create([
            'user_id' => $user->id, 'github_user_id' => '42', 'login' => 'octocat', 'token' => 'secret',
        ]);
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson('/api/github/repositories/sync')
            ->assertOk()
            ->assertJsonPath('repositories.0.owner', 'octocat')
            ->assertJsonPath('repositories.0.updated_at', null);
        $this->assertDatabaseHas('github_repositories', ['full_name' => 'octocat/hello-world']);

        Http::fake(); // Import must use the stored metadata and make no GitHub request.
        $this->withToken($token)->postJson('/api/projects/'.$project->id.'/repositories/import', [
            'owner' => 'octocat', 'name' => 'hello-world',
        ])->assertCreated();

        $this->assertDatabaseHas('project_repositories', [
            'project_id' => $project->id,
            'imported_by' => $user->id,
        ]);
        $this->assertSame(0, Http::recorded()->count());
    }

    public function test_github_rate_limit_is_returned_as_a_clear_api_error(): void
    {
        Http::fake([
            'https://api.github.com/user/repos*' => Http::response([], 403, [
                'X-RateLimit-Remaining' => '0',
                'Retry-After' => '60',
            ]),
        ]);
        $user = User::factory()->create();
        GitHubAccount::create([
            'user_id' => $user->id, 'github_user_id' => '42', 'login' => 'octocat', 'token' => 'secret',
        ]);

        $response = $this->withToken($user->createToken('test')->plainTextToken)
            ->getJson('/api/github/repositories');

        $response->assertStatus(403)
            ->assertJsonPath('message', 'GitHub API rate limit exceeded.')
            ->assertJsonPath('retry_after', 60);
    }

    public function test_github_login_creates_a_user_and_returns_a_token(): void
    {
        $this->configureGitHubLogin();
        $state = $this->loginState();

        Http::fake([
            'https://github.com/login/oauth/access_token' => Http::response(['access_token' => 'gho_test'], 200),
            'https://api.github.com/user/emails' => Http::response([
                ['email' => 'octocat@example.com', 'primary' => true, 'verified' => true],
            ], 200),
            'https://api.github.com/user' => Http::response([
                'id' => 42, 'login' => 'octocat', 'name' => 'Octo Cat',
                'email' => null, 'avatar_url' => 'https://example.com/octocat.png',
            ], 200),
        ]);

        $response = $this->get('/api/auth/github/callback?'.http_build_query(['state' => $state, 'code' => 'code']));

        $response->assertRedirect();
        $query = $this->queryFromRedirect((string) $response->headers->get('Location'));

        $this->assertArrayHasKey('oauth_token', $query);
        $this->assertDatabaseHas('users', ['email' => 'octocat@example.com']);
        $this->assertDatabaseHas('github_accounts', ['github_user_id' => '42', 'login' => 'octocat']);
    }

    public function test_github_login_falls_back_to_the_public_profile_email_when_the_email_list_is_forbidden(): void
    {
        $this->configureGitHubLogin();
        $state = $this->loginState();

        Http::fake([
            'https://github.com/login/oauth/access_token' => Http::response(['access_token' => 'gho_test'], 200),
            'https://api.github.com/user/emails' => Http::response(['message' => 'Resource not accessible by integration'], 403),
            'https://api.github.com/user' => Http::response([
                'id' => 43, 'login' => 'octocat', 'name' => 'Octo Cat', 'email' => 'public@example.com',
            ], 200),
        ]);

        $response = $this->get('/api/auth/github/callback?'.http_build_query(['state' => $state, 'code' => 'code']));

        $response->assertRedirect();
        $query = $this->queryFromRedirect((string) $response->headers->get('Location'));

        $this->assertArrayHasKey('oauth_token', $query);
        $this->assertDatabaseHas('users', ['email' => 'public@example.com']);
    }

    public function test_github_login_reports_when_no_email_is_available(): void
    {
        $this->configureGitHubLogin();
        $state = $this->loginState();

        Http::fake([
            'https://github.com/login/oauth/access_token' => Http::response(['access_token' => 'gho_test'], 200),
            'https://api.github.com/user/emails' => Http::response(['message' => 'Resource not accessible by integration'], 403),
            'https://api.github.com/user' => Http::response([
                'id' => 44, 'login' => 'octocat', 'name' => 'Octo Cat', 'email' => null,
            ], 200),
        ]);

        $response = $this->get('/api/auth/github/callback?'.http_build_query(['state' => $state, 'code' => 'code']));

        $response->assertRedirect();
        $query = $this->queryFromRedirect((string) $response->headers->get('Location'));

        $this->assertArrayNotHasKey('oauth_token', $query);
        $this->assertStringContainsString('email', (string) ($query['oauth_error'] ?? ''));
        $this->assertDatabaseCount('users', 0);
    }

    public function test_github_login_reports_invalid_client_credentials(): void
    {
        $this->configureGitHubLogin();
        $state = $this->loginState();

        Http::fake([
            'https://github.com/login/oauth/access_token' => Http::response([
                'error' => 'incorrect_client_credentials',
                'error_description' => 'The client_id and/or client_secret passed are incorrect.',
            ], 200),
        ]);

        $response = $this->get('/api/auth/github/callback?'.http_build_query(['state' => $state, 'code' => 'code']));

        $response->assertRedirect();
        $query = $this->queryFromRedirect((string) $response->headers->get('Location'));

        $this->assertArrayNotHasKey('oauth_token', $query);
        $this->assertStringContainsString('client credentials', (string) ($query['oauth_error'] ?? ''));
    }

    public function test_github_login_rejects_an_unknown_state(): void
    {
        $this->configureGitHubLogin();

        $response = $this->get('/api/auth/github/callback?'.http_build_query(['state' => 'unknown', 'code' => 'code']));

        $response->assertRedirect();
        $query = $this->queryFromRedirect((string) $response->headers->get('Location'));

        $this->assertArrayHasKey('oauth_error', $query);
        $this->assertDatabaseCount('users', 0);
    }

    public function test_github_api_errors_include_the_github_message(): void
    {
        Http::fake([
            'https://api.github.com/user/repos*' => Http::response(['message' => 'Bad credentials'], 401),
        ]);
        $user = User::factory()->create();
        GitHubAccount::create([
            'user_id' => $user->id, 'github_user_id' => '42', 'login' => 'octocat', 'token' => 'secret',
        ]);

        $response = $this->withToken($user->createToken('test')->plainTextToken)
            ->getJson('/api/github/repositories');

        $response->assertStatus(401)
            ->assertJsonPath('message', 'GitHub API request failed with status 401: Bad credentials.');
    }

    /** @return array<string, mixed> */
    private function queryFromRedirect(string $location): array
    {
        parse_str((string) parse_url($location, PHP_URL_QUERY), $query);

        return $query;
    }

    private function configureGitHubLogin(): void
    {
        config()->set([
            'services.github.client_id' => 'client-id',
            'services.github.client_secret' => 'client-secret',
            'services.github.login_callback_url' => 'https://example.test/api/auth/github/callback',
            'services.github.login_frontend_redirect_url' => 'https://example.test/login',
        ]);
    }

    private function loginState(): string
    {
        $state = Str::random(64);
        Cache::put('github.login.oauth.'.hash('sha256', $state), true, now()->addMinutes(10));

        return $state;
    }

    /** @return array<string, mixed> */
    private function githubRepository(): array
    {
        return [
            'id' => 123, 'name' => 'hello-world', 'full_name' => 'octocat/hello-world',
            'owner' => ['login' => 'octocat'], 'description' => 'Example',
            'html_url' => 'https://github.com/octocat/hello-world',
            'clone_url' => 'https://github.com/octocat/hello-world.git',
            'default_branch' => 'main', 'private' => false,
        ];
    }
}
