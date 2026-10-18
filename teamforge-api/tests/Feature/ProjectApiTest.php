<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_authenticated_user_can_list_only_their_projects(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $ownedProject = Project::factory()->for($user)->create(['name' => 'Owned project']);
        Project::factory()->for($otherUser)->create(['name' => 'Private project']);
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/projects')
            ->assertOk()
            ->assertJsonCount(1, 'projects')
            ->assertJsonPath('projects.0.id', $ownedProject->id)
            ->assertJsonPath('projects.0.name', 'Owned project');
    }

    public function test_an_authenticated_user_can_create_and_view_a_project(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        $payload = [
            'name' => 'Client portal',
            'description' => 'Build the client collaboration portal.',
            'status' => 'in_progress',
            'start_date' => '2026-10-18',
            'due_date' => '2026-11-18',
        ];

        $createResponse = $this->withToken($token)->postJson('/api/projects', $payload);

        $createResponse
            ->assertCreated()
            ->assertJsonPath('project.name', $payload['name'])
            ->assertJsonPath('project.status', $payload['status']);

        $projectId = $createResponse->json('project.id');

        $this->withToken($token)
            ->getJson("/api/projects/{$projectId}")
            ->assertOk()
            ->assertJsonPath('project.description', $payload['description'])
            ->assertJsonPath('project.due_date', $payload['due_date']);
    }

    public function test_project_validation_rejects_invalid_data(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/projects', [
                'name' => '',
                'status' => 'unknown',
                'start_date' => 'not-a-date',
                'due_date' => '2026-10-01',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'status', 'start_date']);
    }

    public function test_a_user_can_update_and_delete_their_project(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->putJson("/api/projects/{$project->id}", [
                'name' => 'Updated project',
                'description' => null,
                'status' => 'completed',
                'start_date' => null,
                'due_date' => null,
            ])
            ->assertOk()
            ->assertJsonPath('project.name', 'Updated project')
            ->assertJsonPath('project.status', 'completed');

        $this->withToken($token)
            ->deleteJson("/api/projects/{$project->id}")
            ->assertOk()
            ->assertJson(['message' => 'Project deleted successfully.']);

        $this->assertDatabaseMissing('projects', ['id' => $project->id]);
    }

    public function test_a_user_cannot_access_another_users_project(): void
    {
        $user = User::factory()->create();
        $otherProject = Project::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson("/api/projects/{$otherProject->id}")
            ->assertNotFound();

        $this->withToken($token)
            ->putJson("/api/projects/{$otherProject->id}", [
                'name' => 'Attempted change',
                'status' => 'planning',
            ])
            ->assertNotFound();

        $this->withToken($token)
            ->deleteJson("/api/projects/{$otherProject->id}")
            ->assertNotFound();
    }

    public function test_project_endpoints_require_authentication(): void
    {
        $project = Project::factory()->create();

        $this->getJson('/api/projects')->assertUnauthorized();
        $this->postJson('/api/projects', [])->assertUnauthorized();
        $this->getJson("/api/projects/{$project->id}")->assertUnauthorized();
    }
}
