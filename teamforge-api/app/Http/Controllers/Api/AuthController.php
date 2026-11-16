<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Facades\Socialite;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $request->merge([
            'name' => trim((string) $request->input('name')),
        ]);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
        ]);

        $token = $user->createToken('teamforge-web')->plainTextToken;

        return response()->json([
            'message' => 'Registration successful.',
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($credentials)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user = User::where('email', $credentials['email'])->firstOrFail();
        $token = $user->createToken('teamforge-web')->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function redirectToGoogle(): RedirectResponse
    {
        abort_unless(
            config('services.google.client_id')
                && config('services.google.client_secret')
                && config('services.google.redirect'),
            503,
            'Google OAuth is not configured.'
        );

        $state = Str::random(64);
        Cache::put($this->googleLoginStateKey($state), true, now()->addMinutes(10));

        return Socialite::driver('google')
            ->stateless()
            ->with(['state' => $state])
            ->redirect();
    }

    public function handleGoogleCallback(Request $request): RedirectResponse
    {
        $frontendUrl = (string) config('services.google.frontend_redirect_url', 'http://localhost:5173/login');

        $state = $request->query('state');
        $isValidState = is_string($state) && $state !== '' && Cache::pull($this->googleLoginStateKey($state));

        if (! $isValidState) {
            return $this->googleErrorRedirect($frontendUrl, 'Your Google sign-in session expired. Please try again.');
        }

        if ($request->query('error')) {
            return $this->googleErrorRedirect(
                $frontendUrl,
                $this->queryString($request, 'error_description', 'Google sign-in was cancelled.')
            );
        }

        try {
            $googleUser = Socialite::driver('google')
                ->stateless()
                ->user();
        } catch (\Throwable $exception) {
            Log::warning('Google OAuth callback failed.', [
                'exception' => $exception::class,
                'message' => $exception->getMessage(),
            ]);

            return $this->googleErrorRedirect($frontendUrl, 'Google sign-in could not be completed. Please try again.');
        }

        $email = mb_strtolower(trim((string) $googleUser->getEmail()));

        if ($email === '') {
            return $this->googleErrorRedirect($frontendUrl, 'Google did not provide an email address for this account.');
        }

        $name = trim((string) ($googleUser->getName() ?: $googleUser->getNickname() ?: 'TeamForge user'));

        try {
            $user = User::query()
                ->whereRaw('LOWER(email) = ?', [$email])
                ->first();

            if (! $user) {
                $user = User::create([
                    'name' => $name === '' ? 'TeamForge user' : Str::limit($name, 255, ''),
                    'email' => $email,
                    'password' => Str::random(40),
                ]);
            }

            if ($user->email_verified_at === null) {
                $user->forceFill(['email_verified_at' => now()])->save();
            }
        } catch (\Throwable $exception) {
            report($exception);

            return $this->googleErrorRedirect($frontendUrl, 'Google sign-in could not be completed. Please try again.');
        }

        return redirect()->away($this->googleFrontendUrl($frontendUrl, [
            'oauth_token' => $user->createToken('teamforge-web')->plainTextToken,
        ]));
    }

    private function googleLoginStateKey(string $state): string
    {
        return 'google.login.oauth.'.hash('sha256', $state);
    }

    /**
     * Read a query string value, falling back when it is missing or not a string.
     */
    private function queryString(Request $request, string $key, string $default): string
    {
        $value = $request->query($key);

        return is_string($value) && $value !== '' ? $value : $default;
    }

    private function googleErrorRedirect(string $frontendUrl, string $message): RedirectResponse
    {
        return redirect()->away($this->googleFrontendUrl($frontendUrl, [
            'oauth_error' => $message,
        ]));
    }

    private function googleFrontendUrl(string $frontendUrl, array $parameters): string
    {
        $separator = str_contains($frontendUrl, '?') ? '&' : '?';

        return $frontendUrl.$separator.http_build_query($parameters);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user(),
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $request->merge([
            'name' => trim((string) $request->input('name')),
        ]);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $user = $request->user();
        $user->update([
            'name' => $validated['name'],
        ]);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $user->fresh(),
        ]);
    }

    public function uploadProfilePhoto(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'photo' => [
                'required',
                'file',
                'image',
                'mimetypes:image/jpeg,image/png,image/webp',
                'max:5120',
            ],
        ]);

        $disk = Storage::disk('public');
        $user = $request->user();
        $oldPath = $user->avatar_path;
        $newPath = $validated['photo']->store('avatars', 'public');

        if (! is_string($newPath) || $newPath === '') {
            return response()->json([
                'message' => 'The profile picture could not be stored.',
            ], 503);
        }

        try {
            $user->update(['avatar_path' => $newPath]);
        } catch (\Throwable $exception) {
            $disk->delete($newPath);

            throw $exception;
        }

        if ($oldPath && $oldPath !== $newPath) {
            $disk->delete($oldPath);
        }

        return response()->json([
            'message' => 'Profile picture updated successfully.',
            'user' => $user->fresh(),
        ]);
    }

    public function removeProfilePhoto(Request $request): JsonResponse
    {
        $user = $request->user();
        $path = $user->avatar_path;

        if ($path) {
            Storage::disk('public')->delete($path);
            $user->update(['avatar_path' => null]);
        }

        return response()->json([
            'message' => 'Profile picture removed successfully.',
            'user' => $user->fresh(),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }
}
