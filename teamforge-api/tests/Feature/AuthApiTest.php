<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
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
}
