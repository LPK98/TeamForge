<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
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
        return Socialite::driver('google')
            ->stateless()
            ->redirect();
    }

    public function handleGoogleCallback(): RedirectResponse
    {
        $frontendUrl = config('services.google.frontend_redirect_url', 'http://localhost:5173/login');

        try {
            $googleUser = Socialite::driver('google')
                ->stateless()
                ->user();
        } catch (\Throwable $exception) {
            Log::warning('Google OAuth callback failed.', [
                'exception' => $exception::class,
                'message' => $exception->getMessage(),
            ]);

            return redirect()->away($this->googleFrontendUrl($frontendUrl, [
                'oauth_error' => 'Google sign-in could not be completed. Please try again.',
            ]));
        }

        $email = trim((string) $googleUser->getEmail());

        if ($email === '') {
            return redirect()->away($this->googleFrontendUrl($frontendUrl, [
                'oauth_error' => 'Google did not provide an email address for this account.',
            ]));
        }

        $user = User::where('email', $email)->first();

        if (! $user) {
            $user = User::create([
                'name' => trim((string) ($googleUser->getName() ?: $googleUser->getNickname() ?: 'TeamForge user')),
                'email' => $email,
                'password' => Str::random(40),
            ]);
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        $token = $user->createToken('teamforge-web')->plainTextToken;

        return redirect()->away($this->googleFrontendUrl($frontendUrl, [
            'oauth_token' => $token,
        ]));
    }

    private function googleFrontendUrl(string $frontendUrl, array $parameters): string
    {
        return $frontendUrl.'?'.http_build_query($parameters);
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
