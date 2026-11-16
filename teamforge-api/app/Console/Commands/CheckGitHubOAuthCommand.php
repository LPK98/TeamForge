<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Throwable;

class CheckGitHubOAuthCommand extends Command
{
    protected $signature = 'github:oauth-check';

    protected $description = 'Verify the configured GitHub OAuth credentials, callback URL, and APP_KEY';

    public function handle(): int
    {
        $clientId = (string) config('services.github.client_id');
        $clientSecret = (string) config('services.github.client_secret');
        $callbackUrl = (string) config('services.github.login_callback_url');
        $frontendUrl = (string) config('services.github.login_frontend_redirect_url');

        $this->components->twoColumnDetail('GitHub client ID', $clientId !== '' ? $clientId : '<fg=red>missing</>');
        $this->components->twoColumnDetail('GitHub client secret', $clientSecret !== '' ? 'set' : '<fg=red>missing</>');
        $this->components->twoColumnDetail('Callback URL', $callbackUrl !== '' ? $callbackUrl : '<fg=red>missing</>');
        $this->components->twoColumnDetail('Frontend login URL', $frontendUrl !== '' ? $frontendUrl : '<fg=red>missing</>');
        $this->components->twoColumnDetail('APP_KEY', $this->appKeyStatus());

        if ($clientId === '' || $clientSecret === '') {
            $this->components->error('Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET before using GitHub sign-in.');

            return self::FAILURE;
        }

        try {
            $response = Http::asForm()->acceptJson()->post('https://github.com/login/oauth/access_token', [
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'code' => '00000000000000000000',
                'redirect_uri' => $callbackUrl,
            ]);
        } catch (Throwable $exception) {
            $this->components->error('Could not reach GitHub: '.$exception->getMessage());

            return self::FAILURE;
        }

        $error = (string) $response->json('error', '');
        $description = (string) $response->json('error_description', '');

        if ($error === 'bad_verification_code') {
            $this->components->info('GitHub accepted the client ID and client secret. Only the dummy code was rejected, which is expected.');

            return self::SUCCESS;
        }

        if ($error === 'incorrect_client_credentials') {
            $this->components->error('GitHub rejected the credentials. GITHUB_CLIENT_SECRET is wrong or out of date.');

            return self::FAILURE;
        }

        if ($error === 'redirect_uri_mismatch') {
            $this->components->error('GitHub rejected the callback URL. Register '.$callbackUrl.' on the GitHub App or OAuth App.');

            return self::FAILURE;
        }

        if (! $response->successful()) {
            $this->components->error('GitHub returned HTTP '.$response->status().($description !== '' ? ": {$description}" : '.'));

            return self::FAILURE;
        }

        $this->components->error('Unexpected GitHub response'.($error !== '' ? ": {$error} - {$description}" : '.'));

        return self::FAILURE;
    }

    private function appKeyStatus(): string
    {
        if ((string) config('app.key') === '') {
            return '<fg=red>missing</>';
        }

        try {
            $value = 'teamforge-oauth-check';

            return Crypt::decryptString(Crypt::encryptString($value)) === $value
                ? '<fg=green>set and valid</>'
                : '<fg=red>set but failed a round-trip</>';
        } catch (Throwable) {
            return '<fg=red>set but invalid</>';
        }
    }
}
