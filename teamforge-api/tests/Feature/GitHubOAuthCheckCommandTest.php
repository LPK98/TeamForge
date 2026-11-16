<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GitHubOAuthCheckCommandTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set([
            'services.github.client_id' => 'client-id',
            'services.github.client_secret' => 'client-secret',
            'services.github.login_callback_url' => 'https://example.test/api/auth/github/callback',
        ]);
    }

    public function test_it_confirms_valid_credentials(): void
    {
        Http::fake([
            'https://github.com/login/oauth/access_token' => Http::response(['error' => 'bad_verification_code'], 200),
        ]);

        $this->artisan('github:oauth-check')->assertSuccessful();
    }

    public function test_it_fails_when_the_client_secret_is_rejected(): void
    {
        Http::fake([
            'https://github.com/login/oauth/access_token' => Http::response(['error' => 'incorrect_client_credentials'], 200),
        ]);

        $this->artisan('github:oauth-check')->assertFailed();
    }

    public function test_it_fails_when_credentials_are_missing(): void
    {
        config()->set('services.github.client_secret', null);

        $this->artisan('github:oauth-check')->assertFailed();
    }
}
