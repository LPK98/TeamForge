<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class GitHubApiService
{
    public function authorizationUrl(string $state, ?string $callbackUrl = null): string
    {
        return 'https://github.com/login/oauth/authorize?'.http_build_query([
            'client_id' => config('services.github.client_id'),
            'redirect_uri' => $callbackUrl ?? config('services.github.callback_url'),
            'scope' => config('services.github.scope', 'read:user user:email repo'),
            'state' => $state,
        ]);
    }

    public function exchangeCode(string $code, ?string $callbackUrl = null): string
    {
        if ($code === '') {
            throw new RuntimeException('GitHub did not return an authorization code.');
        }

        try {
            $response = Http::asForm()->acceptJson()->post('https://github.com/login/oauth/access_token', [
                'client_id' => config('services.github.client_id'),
                'client_secret' => config('services.github.client_secret'),
                'code' => $code,
                'redirect_uri' => $callbackUrl ?? config('services.github.callback_url'),
            ])->throw()->json();
        } catch (RequestException $exception) {
            throw $this->apiException($exception);
        }

        if (! is_array($response)) {
            throw new RuntimeException('GitHub returned an unexpected token response.');
        }

        if (empty($response['access_token'])) {
            $error = (string) ($response['error'] ?? 'unknown_error');
            $description = (string) ($response['error_description'] ?? 'GitHub did not return an access token.');

            throw new RuntimeException("GitHub OAuth token exchange failed ({$error}): {$description}");
        }

        return (string) $response['access_token'];
    }

    /** @return array<string, mixed> */
    public function user(string $token): array
    {
        return $this->call(fn () => $this->request($token)->get('/user')->throw()->json());
    }

    public function primaryEmail(string $token): ?string
    {
        try {
            $emails = $this->call(fn () => $this->request($token)->get('/user/emails')->throw()->json());
        } catch (GitHubApiException $exception) {
            // GitHub Apps need the "Email addresses" account permission to read
            // this endpoint. Fall back to the profile email instead of failing.
            if (in_array($exception->status, [403, 404], true)) {
                Log::warning('GitHub did not grant access to the user email list; falling back to the profile email.', [
                    'status' => $exception->status,
                    'reason' => $exception->getMessage(),
                ]);

                return null;
            }

            throw $exception;
        }

        foreach ($emails as $email) {
            if (($email['primary'] ?? false) && ($email['verified'] ?? false) && ! empty($email['email'])) {
                return (string) $email['email'];
            }
        }

        foreach ($emails as $email) {
            if (($email['verified'] ?? false) && ! empty($email['email'])) {
                return (string) $email['email'];
            }
        }

        return null;
    }

    /** @return array<int, array<string, mixed>> */
    public function repositories(string $token): array
    {
        $repositories = [];
        $page = 1;

        do {
            $pageRepositories = $this->call(fn () => $this->request($token)->get('/user/repos', [
                'visibility' => 'all',
                'affiliation' => 'owner,collaborator,organization_member',
                'sort' => 'updated',
                'per_page' => 100,
                'page' => $page++,
            ])->throw()->json());
            $repositories = array_merge($repositories, $pageRepositories);
        } while (count($pageRepositories) === 100);

        return $repositories;
    }

    /** @return array<string, mixed> */
    public function repository(string $token, string $owner, string $name): array
    {
        return $this->call(fn () => $this->request($token)->get("/repos/{$owner}/{$name}")->throw()->json());
    }

    private function request(string $token): PendingRequest
    {
        return Http::baseUrl(config('services.github.api_url', 'https://api.github.com'))
            ->withToken($token)
            ->acceptJson()
            ->withHeaders(['X-GitHub-Api-Version' => '2022-11-28']);
    }

    private function call(\Closure $request): array
    {
        try {
            $result = $request();
        } catch (RequestException $exception) {
            throw $this->apiException($exception);
        }

        return is_array($result) ? $result : [];
    }

    private function apiException(RequestException $exception): GitHubApiException
    {
        $response = $exception->response;
        $status = $response->status();
        $retryAfter = $response->header('Retry-After') ? (int) $response->header('Retry-After') : null;

        if ($status === 403 && $response->header('X-RateLimit-Remaining') === '0') {
            return new GitHubApiException('GitHub API rate limit exceeded.', $status, $retryAfter);
        }

        $details = trim((string) $response->json('message', ''));
        $message = sprintf(
            'GitHub API request failed with status %d%s.',
            $status,
            $details !== '' ? ": {$details}" : '',
        );

        return new GitHubApiException($message, $status >= 400 ? $status : 502, $retryAfter);
    }
}
