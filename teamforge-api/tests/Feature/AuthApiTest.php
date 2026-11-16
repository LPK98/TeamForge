<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_register_and_receive_a_sanctum_token(): void
    {
        $payload = [
            'name' => 'Taylor Teamforge',
            'email' => 'taylor@example.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ];

        $response = $this->postJson('/api/register', $payload);

        $response
            ->assertCreated()
            ->assertJsonStructure([
                'message',
                'user' => ['id', 'name', 'email'],
                'token',
            ])
            ->assertJsonMissingPath('user.password');

        $user = User::where('email', $payload['email'])->firstOrFail();

        $this->assertTrue(Hash::check($payload['password'], $user->getRawOriginal('password')));
        $this->assertDatabaseHas('personal_access_tokens', [
            'tokenable_id' => $user->id,
            'tokenable_type' => User::class,
            'name' => 'teamforge-web',
        ]);
    }

    public function test_registration_validates_required_fields_unique_email_and_password_confirmation(): void
    {
        User::factory()->create(['email' => 'existing@example.test']);

        $response = $this->postJson('/api/register', [
            'name' => '',
            'email' => 'existing@example.test',
            'password' => 'short',
            'password_confirmation' => 'different',
        ]);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_registration_rejects_a_whitespace_only_name(): void
    {
        $this->postJson('/api/register', [
            'name' => '   ',
            'email' => 'blank-name@example.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);

        $this->assertDatabaseMissing('users', [
            'email' => 'blank-name@example.test',
        ]);
    }

    public function test_registration_trims_and_returns_the_saved_name(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => '  Taylor Teamforge  ',
            'email' => 'trimmed-name@example.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('user.name', 'Taylor Teamforge');

        $this->assertDatabaseHas('users', [
            'email' => 'trimmed-name@example.test',
            'name' => 'Taylor Teamforge',
        ]);
    }

    public function test_a_user_can_login_and_access_the_authenticated_user_endpoint(): void
    {
        $user = User::factory()->create([
            'email' => 'login@example.test',
            'password' => 'password123',
        ]);

        $loginResponse = $this->postJson('/api/login', [
            'email' => 'login@example.test',
            'password' => 'password123',
        ]);

        $loginResponse
            ->assertOk()
            ->assertJsonStructure([
                'message',
                'user' => ['id', 'name', 'email'],
                'token',
            ])
            ->assertJsonMissingPath('user.password');

        $token = $loginResponse->json('token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonMissingPath('user.password');
    }

    public function test_login_rejects_invalid_credentials(): void
    {
        User::factory()->create([
            'email' => 'login-failure@example.test',
            'password' => 'password123',
        ]);

        $this->postJson('/api/login', [
            'email' => 'login-failure@example.test',
            'password' => 'incorrect-password',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_protected_endpoints_reject_missing_and_invalid_tokens(): void
    {
        $this->getJson('/api/user')->assertUnauthorized();
        $this->withToken('invalid-token')->getJson('/api/user')->assertUnauthorized();
        $this->withToken('invalid-token')->postJson('/api/logout')->assertUnauthorized();
    }

    public function test_logout_revokes_the_current_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('teamforge-web')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/logout')
            ->assertOk()
            ->assertJson(['message' => 'Logged out successfully.']);

        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $user->id,
            'tokenable_type' => User::class,
        ]);

        Auth::forgetGuards();
        $this->withToken($token)->getJson('/api/user')->assertUnauthorized();
    }

    public function test_authenticated_user_can_update_only_their_profile_name(): void
    {
        $user = User::factory()->create(['name' => 'Old Name']);
        $token = $user->createToken('teamforge-web')->plainTextToken;

        $this->withToken($token)
            ->patchJson('/api/profile', [
                'name' => '  Updated Name  ',
                'id' => 9999,
                'email' => 'changed@example.test',
                'password' => 'changed-password',
            ])
            ->assertOk()
            ->assertJsonPath('user.name', 'Updated Name')
            ->assertJsonPath('user.email', $user->email)
            ->assertJsonMissingPath('user.password');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Updated Name',
            'email' => $user->email,
        ]);
    }

    public function test_profile_update_rejects_missing_or_whitespace_only_names_and_requires_authentication(): void
    {
        $this->patchJson('/api/profile', ['name' => '   '])
            ->assertUnauthorized();

        $user = User::factory()->create();
        $token = $user->createToken('teamforge-web')->plainTextToken;

        $this->withToken($token)
            ->patchJson('/api/profile', ['name' => '   '])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);
    }

    public function test_authenticated_user_can_upload_and_replace_a_profile_picture(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $token = $user->createToken('teamforge-web')->plainTextToken;
        $firstPhoto = UploadedFile::fake()->image('first.jpg');

        $firstResponse = $this->withToken($token)
            ->postJson('/api/profile/photo', ['photo' => $firstPhoto])
            ->assertOk()
            ->assertJsonPath('user.name', $user->name);

        $firstPath = User::findOrFail($user->id)->avatar_path;
        $this->assertIsString($firstPath);
        Storage::disk('public')->assertExists($firstPath);
        $firstResponse->assertJsonPath('user.avatar_url', Storage::disk('public')->url($firstPath));

        $secondPhoto = UploadedFile::fake()->image('second.png');
        $this->withToken($token)->postJson('/api/profile/photo', ['photo' => $secondPhoto])->assertOk();
        $secondPath = User::findOrFail($user->id)->avatar_path;

        $this->assertNotSame($firstPath, $secondPath);
        Storage::disk('public')->assertMissing($firstPath);
        Storage::disk('public')->assertExists($secondPath);
    }

    public function test_profile_picture_upload_requires_authentication_and_validates_type_and_size(): void
    {
        Storage::fake('public');

        $this->postJson('/api/profile/photo', [
            'photo' => UploadedFile::fake()->image('avatar.jpg'),
        ])->assertUnauthorized();

        $user = User::factory()->create();
        $token = $user->createToken('teamforge-web')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/profile/photo', [
                'photo' => UploadedFile::fake()->create('avatar.txt', 20, 'text/plain'),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['photo']);

        $this->withToken($token)
            ->postJson('/api/profile/photo', [
                'photo' => UploadedFile::fake()->image('large.jpg')->size(5121),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['photo']);
    }

    public function test_authenticated_user_can_remove_a_profile_picture_or_remove_nothing(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $token = $user->createToken('teamforge-web')->plainTextToken;

        $this->withToken($token)->deleteJson('/api/profile/photo')->assertOk()->assertJsonPath('user.avatar_url', null);

        $this->withToken($token)->postJson('/api/profile/photo', [
            'photo' => UploadedFile::fake()->image('avatar.webp'),
        ])->assertOk();
        $path = User::findOrFail($user->id)->avatar_path;

        $this->withToken($token)
            ->deleteJson('/api/profile/photo')
            ->assertOk()
            ->assertJsonPath('user.avatar_url', null);

        Storage::disk('public')->assertMissing($path);
        $this->assertDatabaseHas('users', ['id' => $user->id, 'avatar_path' => null]);
    }

    public function test_google_redirect_returns_503_when_oauth_is_not_configured(): void
    {
        config()->set('services.google.client_id', null);

        $this->get('/api/auth/google/redirect')->assertStatus(503);
    }

    public function test_google_redirect_sends_the_user_to_google_with_the_configured_client_and_state(): void
    {
        $this->configureGoogleOAuth();

        $response = $this->get('/api/auth/google/redirect')->assertRedirect();
        $location = (string) $response->headers->get('Location');
        $query = $this->redirectQuery($response);

        $this->assertStringStartsWith('https://accounts.google.com/o/oauth2/auth?', $location);
        $this->assertNotSame('', $query['state'] ?? '');
        $this->assertSame('test-google-client-id', $query['client_id']);
        $this->assertSame('http://127.0.0.1:8000/api/auth/google/callback', $query['redirect_uri']);
    }

    public function test_github_login_uses_minimal_scope_and_returns_a_working_token(): void
    {
        config()->set([
            'services.github.client_id' => 'test-github-client-id',
            'services.github.client_secret' => 'test-github-client-secret',
            'services.github.login_callback_url' => 'http://127.0.0.1:8000/api/auth/github/callback',
            'services.github.login_frontend_redirect_url' => 'http://localhost:5173/login',
        ]);
        Http::fake([
            'https://github.com/login/oauth/access_token' => Http::response(['access_token' => 'github-token'], 200),
            'https://api.github.com/user' => Http::response([
                'id' => 12345,
                'login' => 'github-person',
                'name' => 'GitHub Person',
                'avatar_url' => 'https://avatars.githubusercontent.com/u/12345',
            ], 200),
            'https://api.github.com/user/emails' => Http::response([
                ['email' => 'github-person@example.test', 'primary' => true, 'verified' => true],
            ], 200),
        ]);

        $redirect = $this->get('/api/auth/github/redirect')->assertRedirect();
        $redirectQuery = $this->redirectQuery($redirect);

        $this->assertSame('read:user user:email', $redirectQuery['scope']);
        $this->assertSame('http://127.0.0.1:8000/api/auth/github/callback', $redirectQuery['redirect_uri']);

        $callback = $this->get('/api/auth/github/callback?state='.$redirectQuery['state'].'&code=test-code')->assertRedirect();
        $query = $this->redirectQuery($callback);
        $user = User::where('email', 'github-person@example.test')->firstOrFail();

        $this->assertArrayHasKey('oauth_token', $query);
        $this->assertDatabaseHas('github_accounts', [
            'user_id' => $user->id,
            'github_user_id' => '12345',
            'login' => 'github-person',
        ]);
        $this->withToken($query['oauth_token'])->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('user.id', $user->id);
    }

    public function test_github_login_matches_existing_email_case_insensitively_and_preserves_frontend_query(): void
    {
        config()->set([
            'services.github.client_id' => 'test-github-client-id',
            'services.github.client_secret' => 'test-github-client-secret',
            'services.github.login_callback_url' => 'http://127.0.0.1:8000/api/auth/github/callback',
            'services.github.login_frontend_redirect_url' => 'http://localhost:5173/login?next=%2Fprojects',
        ]);
        $user = User::factory()->create(['email' => 'Existing@Example.Test']);
        Http::fake([
            'https://github.com/login/oauth/access_token' => Http::response(['access_token' => 'github-token'], 200),
            'https://api.github.com/user' => Http::response(['id' => 67890, 'login' => 'existing-person'], 200),
            'https://api.github.com/user/emails' => Http::response([
                ['email' => 'existing@example.test', 'primary' => true, 'verified' => true],
            ], 200),
        ]);

        $redirect = $this->get('/api/auth/github/redirect')->assertRedirect();
        $callback = $this->get('/api/auth/github/callback?state='.$this->redirectQuery($redirect)['state'].'&code=test-code')->assertRedirect();
        $query = $this->redirectQuery($callback);

        $this->assertStringStartsWith('http://localhost:5173/login?next=%2Fprojects&oauth_token=', (string) $callback->headers->get('Location'));
        $this->assertSame(1, User::count());
        $this->assertNotNull($user->fresh()->email_verified_at);
        $this->assertArrayHasKey('oauth_token', $query);
    }

    public function test_github_callback_rejects_missing_code_and_expired_state(): void
    {
        config()->set([
            'services.github.client_id' => 'test-github-client-id',
            'services.github.client_secret' => 'test-github-client-secret',
            'services.github.login_callback_url' => 'http://127.0.0.1:8000/api/auth/github/callback',
            'services.github.login_frontend_redirect_url' => 'http://localhost:5173/login',
        ]);

        $missingState = $this->get('/api/auth/github/callback?code=test-code')->assertRedirect();
        $this->assertSame('Your GitHub sign-in session expired. Please try again.', $this->redirectQuery($missingState)['oauth_error']);

        $state = (string) $this->redirectQuery($this->get('/api/auth/github/redirect'))['state'];
        $missingCode = $this->get('/api/auth/github/callback?state='.$state)->assertRedirect();
        $this->assertSame('GitHub did not return an authorization code. Please try again.', $this->redirectQuery($missingCode)['oauth_error']);
    }

    public function test_google_callback_creates_a_verified_user_and_returns_a_working_token(): void
    {
        $this->configureGoogleOAuth();
        $state = $this->startGoogleRedirect();

        Socialite::fake('google', SocialiteUser::fake([
            'id' => 'google-123',
            'name' => 'Google Person',
            'email' => 'google-person@example.test',
        ]));

        $response = $this->get("/api/auth/google/callback?state={$state}&code=test-code")->assertRedirect();
        $query = $this->redirectQuery($response);

        $this->assertStringStartsWith('http://localhost:5173/login?', (string) $response->headers->get('Location'));
        $this->assertArrayHasKey('oauth_token', $query);

        $user = User::where('email', 'google-person@example.test')->firstOrFail();

        $this->assertNotNull($user->email_verified_at);

        $this->withToken($query['oauth_token'])->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('user.id', $user->id);
    }

    public function test_google_callback_logs_into_an_existing_account_ignoring_email_case(): void
    {
        $this->configureGoogleOAuth();
        $state = $this->startGoogleRedirect();
        $user = User::factory()->create(['email' => 'CaseUser@Example.Test']);

        Socialite::fake('google', SocialiteUser::fake([
            'email' => 'caseuser@example.test',
            'name' => 'Case User',
        ]));

        $response = $this->get("/api/auth/google/callback?state={$state}&code=test-code")->assertRedirect();
        $query = $this->redirectQuery($response);

        $this->assertDatabaseCount('users', 1);
        $this->assertNotNull($user->fresh()->email_verified_at);
        $this->assertArrayHasKey('oauth_token', $query);

        $this->withToken($query['oauth_token'])->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('user.id', $user->id);
    }

    public function test_google_callback_redirects_with_an_error_when_the_state_is_missing_or_unknown(): void
    {
        $this->configureGoogleOAuth();

        $missingState = $this->get('/api/auth/google/callback?code=test-code')->assertRedirect();
        $unknownState = $this->get('/api/auth/google/callback?state=unknown&code=test-code')->assertRedirect();

        $this->assertSame(
            'Your Google sign-in session expired. Please try again.',
            $this->redirectQuery($missingState)['oauth_error'] ?? null
        );
        $this->assertSame(
            'Your Google sign-in session expired. Please try again.',
            $this->redirectQuery($unknownState)['oauth_error'] ?? null
        );
        $this->assertDatabaseCount('users', 0);
    }

    public function test_google_callback_redirects_the_denial_message_when_google_denies_access(): void
    {
        $this->configureGoogleOAuth();
        $state = $this->startGoogleRedirect();

        $response = $this->get(
            "/api/auth/google/callback?state={$state}&error=access_denied&error_description=The+user+denied+access"
        )->assertRedirect();

        $this->assertSame('The user denied access', $this->redirectQuery($response)['oauth_error'] ?? null);
        $this->assertDatabaseCount('users', 0);
    }

    public function test_google_callback_redirects_with_an_error_when_google_returns_no_email(): void
    {
        $this->configureGoogleOAuth();
        $state = $this->startGoogleRedirect();

        Socialite::fake('google', SocialiteUser::fake(['email' => '']));

        $response = $this->get("/api/auth/google/callback?state={$state}&code=test-code")->assertRedirect();

        $this->assertSame(
            'Google did not provide an email address for this account.',
            $this->redirectQuery($response)['oauth_error'] ?? null
        );
        $this->assertDatabaseCount('users', 0);
    }

    public function test_google_callback_appends_the_error_to_a_frontend_url_that_already_has_a_query_string(): void
    {
        $this->configureGoogleOAuth();
        config()->set('services.google.frontend_redirect_url', 'http://localhost:5173/login?next=%2Fprojects');

        $response = $this->get('/api/auth/google/callback?code=test-code')->assertRedirect();
        $location = (string) $response->headers->get('Location');

        $this->assertStringStartsWith('http://localhost:5173/login?next=%2Fprojects&oauth_error=', $location);
        $this->assertSame(
            'Your Google sign-in session expired. Please try again.',
            $this->redirectQuery($response)['oauth_error'] ?? null
        );
    }

    private function configureGoogleOAuth(): void
    {
        config()->set([
            'services.google.client_id' => 'test-google-client-id',
            'services.google.client_secret' => 'test-google-client-secret',
            'services.google.redirect' => 'http://127.0.0.1:8000/api/auth/google/callback',
            'services.google.frontend_redirect_url' => 'http://localhost:5173/login',
        ]);
    }

    private function startGoogleRedirect(): string
    {
        $response = $this->get('/api/auth/google/redirect')->assertRedirect();

        return (string) ($this->redirectQuery($response)['state'] ?? '');
    }

    /**
     * @return array<string, mixed>
     */
    private function redirectQuery(TestResponse $response): array
    {
        parse_str((string) parse_url((string) $response->headers->get('Location'), PHP_URL_QUERY), $query);

        return $query;
    }
}
