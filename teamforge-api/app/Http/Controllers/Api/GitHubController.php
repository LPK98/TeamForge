<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GitHubAccount;
use App\Models\Project;
use App\Models\GitHubRepository;
use App\Services\GitHubApiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Throwable;

class GitHubController extends Controller
{
    public function status(Request $request): JsonResponse
    {
        $account = $request->user()->githubAccount;

        return response()->json([
            'connected' => (bool) $account,
            'account' => $account ? [
                'id' => $account->github_user_id,
                'login' => $account->login,
                'name' => $account->name,
                'avatar_url' => $account->avatar_url,
            ] : null,
        ]);
    }

    public function connect(Request $request, GitHubApiService $github): JsonResponse
    {
        abort_unless(config('services.github.client_id') && config('services.github.client_secret'), 503, 'GitHub OAuth is not configured.');

        $state = Str::random(64);
        Cache::put($this->stateKey($state), $request->user()->id, now()->addMinutes(10));

        return response()->json(['url' => $github->authorizationUrl($state)]);
    }

    public function callback(Request $request, GitHubApiService $github): JsonResponse|RedirectResponse
    {
        $state = (string) $request->query('state');
        $userId = $state !== '' ? Cache::pull($this->stateKey($state)) : null;
        if (! $userId || $request->query('error')) {
            return $this->oauthResult(false, $request->query('error_description', 'Invalid or expired GitHub OAuth state.'));
        }

        try {
            $token = $github->exchangeCode((string) $request->query('code'));
            $profile = $github->user($token);
            GitHubAccount::updateOrCreate(
                ['user_id' => $userId],
                [
                    'github_user_id' => (string) $profile['id'],
                    'login' => $profile['login'],
                    'name' => $profile['name'] ?? null,
                    'avatar_url' => $profile['avatar_url'] ?? null,
                    'token' => $token,
                ],
            );
        } catch (Throwable $exception) {
            report($exception);

            return $this->oauthResult(false, 'Unable to connect GitHub.');
        }

        return $this->oauthResult(true);
    }

    public function disconnect(Request $request): JsonResponse
    {
        $request->user()->githubAccount()?->delete();

        return response()->json(['message' => 'GitHub account disconnected.']);
    }

    public function sync(Request $request, GitHubApiService $github): JsonResponse
    {
        $account = $this->account($request);
        $repositories = $github->repositories($account->token);

        $stored = $this->storeRepositories($repositories);

        return response()->json(['repositories' => array_map([$this, 'repositoryData'], $stored)]);
    }

    public function repositories(Request $request, GitHubApiService $github): JsonResponse
    {
        $account = $this->account($request);
        $repositories = $this->storeRepositories($github->repositories($account->token));
        $search = mb_strtolower((string) $request->query('search', ''));
        if ($search !== '') {
            $repositories = array_values(array_filter($repositories, fn (array $repository) => str_contains(mb_strtolower($repository['full_name'] ?? ''), $search)));
        }
        $visibility = $request->query('visibility', 'all');
        if (in_array($visibility, ['public', 'private'], true)) {
            $repositories = array_values(array_filter($repositories, fn (array $repository) => (bool) ($repository['private'] ?? false) === ($visibility === 'private')));
        }
        $perPage = min(max((int) $request->query('per_page', 30), 1), 100);
        $page = max((int) $request->query('page', 1), 1);
        $total = count($repositories);
        $repositories = array_slice($repositories, ($page - 1) * $perPage, $perPage);

        return response()->json([
            'repositories' => array_map([$this, 'repositoryData'], $repositories),
            'current_page' => $page,
            'last_page' => (int) max(1, ceil($total / $perPage)),
            'per_page' => $perPage,
            'total' => $total,
        ]);
    }

    public function showRepository(Request $request, string $owner, string $name, GitHubApiService $github): JsonResponse
    {
        $repository = $github->repository($this->account($request)->token, $owner, $name);
        $repository = $this->storeRepository($repository);
        $repository->load('projectRepositories.project', 'projectRepositories.importedBy');

        return response()->json(['repository' => $this->repositoryData($repository)]);
    }

    public function import(Request $request, int $project, GitHubApiService $github): JsonResponse
    {
        $projectModel = $this->accessibleProject($request, $project);
        $account = $this->account($request);
        $validated = $request->validate([
            'owner' => ['required', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
        ]);
        $repository = GitHubRepository::where('full_name', $validated['owner'].'/'.$validated['name'])->first();
        if (! $repository) {
            $repository = $this->storeRepository($github->repository($account->token, $validated['owner'], $validated['name']));
        }
        $data = $this->repositoryData($repository);

        if ($projectModel->repositories()->where('full_name', $data['full_name'])->exists()) {
            return response()->json(['message' => 'This repository is already imported.', 'repository' => $projectModel->repositories()->where('full_name', $data['full_name'])->first()], 409);
        }

        $imported = $projectModel->repositories()->create(array_merge($data, [
            'imported_by' => $request->user()->id,
            'github_repository_record_id' => $repository->id,
        ]));

        return response()->json(['message' => 'Repository imported successfully.', 'repository' => $imported], 201);
    }

    public function importByRepository(Request $request, string $owner, string $name, GitHubApiService $github): JsonResponse
    {
        $request->merge(['owner' => $owner, 'name' => $name]);
        $project = $request->validate(['project_id' => ['required', 'integer']])['project_id'];

        return $this->import($request, $project, $github);
    }

    public function projectRepositories(Request $request, int $project): JsonResponse
    {
        return response()->json(['repositories' => $this->accessibleProject($request, $project)->repositories()->latest()->get()]);
    }

    public function removeProjectRepository(Request $request, int $project, int $repository): JsonResponse
    {
        $projectModel = $this->accessibleProject($request, $project);
        $deleted = $projectModel->repositories()->whereKey($repository)->delete();
        abort_unless($deleted, 404);

        return response()->json(['message' => 'Repository removed from project.']);
    }

    private function account(Request $request): GitHubAccount
    {
        abort_unless($account = $request->user()->githubAccount, 422, 'Connect a GitHub account first.');

        return $account;
    }

    private function accessibleProject(Request $request, int $project): Project
    {
        $userId = $request->user()->id;

        return Project::query()->whereKey($project)
            ->where(fn ($query) => $query->where('user_id', $userId)->orWhereHas('members', fn ($members) => $members->whereKey($userId)))
            ->firstOrFail();
    }

    /** @param array<string, mixed>|GitHubRepository $repository */
    private function repositoryData(array|GitHubRepository $repository): array
    {
        $storedModel = $repository instanceof GitHubRepository;
        if ($storedModel) {
            $repository = $repository->toArray();
            $repository['id'] = $repository['github_repository_id'];
            $repository['owner'] = $repository['owner'] ?? '';
            $repository['updated_at'] = $repository['github_updated_at'] ?? null;
        }

        $owner = is_array($repository['owner'] ?? null)
            ? ($repository['owner']['login'] ?? '')
            : (string) ($repository['owner'] ?? '');
        $data = [
            'id' => $repository['id'] ?? null,
            'github_repository_id' => (string) ($repository['id'] ?? ''),
            'owner' => $owner,
            'name' => $repository['name'] ?? '',
            'full_name' => $repository['full_name'] ?? '',
            'description' => $repository['description'] ?? null,
            'html_url' => $repository['html_url'] ?? '',
            'clone_url' => $repository['clone_url'] ?? null,
            'default_branch' => $repository['default_branch'] ?? null,
            'private' => (bool) ($repository['private'] ?? false),
            'language' => $repository['language'] ?? null,
            'stargazers_count' => $repository['stargazers_count'] ?? 0,
            'forks_count' => $repository['forks_count'] ?? 0,
            'updated_at' => $repository['updated_at'] ?? null,
        ];

        if ($storedModel && isset($repository['project_repositories'])) {
            $data['projects'] = collect($repository['project_repositories'])->map(fn (array $association) => [
                'id' => $association['project']['id'] ?? null,
                'name' => $association['project']['name'] ?? null,
                'imported_by' => $association['imported_by'] ?? null,
                'imported_at' => $association['created_at'] ?? null,
            ])->values()->all();
            $data['last_synced_at'] = $repository['updated_at'];
        }

        return $data;
    }

    /** @param array<int, array<string, mixed>|GitHubRepository> $repositories */
    private function storeRepositories(array $repositories): array
    {
        return array_map(fn (array|GitHubRepository $repository) => $repository instanceof GitHubRepository
            ? $repository
            : $this->storeRepository($repository), $repositories);
    }

    /** @param array<string, mixed> $repository */
    private function storeRepository(array $repository): GitHubRepository
    {
        $data = $this->repositoryData($repository);

        return GitHubRepository::updateOrCreate(
            ['github_repository_id' => $data['github_repository_id']],
            [
                ...$data,
                'github_updated_at' => $repository['updated_at'] ?? null,
            ],
        );
    }

    private function stateKey(string $state): string
    {
        return 'github.oauth.'.hash('sha256', $state);
    }

    private function oauthResult(bool $success, ?string $error = null): JsonResponse|RedirectResponse
    {
        $url = config('services.github.frontend_redirect_url');
        if ($url) {
            return redirect()->away($url.'?'.http_build_query($success ? ['github' => 'connected'] : ['github' => 'error', 'message' => $error]));
        }

        return response()->json($success ? ['message' => 'GitHub account connected.'] : ['message' => $error], $success ? 200 : 400);
    }
}
