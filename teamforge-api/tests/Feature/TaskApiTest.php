<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TaskApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_authenticated_user_can_list_tasks_with_filters_and_project_progress_is_real(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        Task::factory()->for($project)->create(['status' => 'completed', 'priority' => 'high']);
        Task::factory()->for($project)->create(['status' => 'todo', 'priority' => 'low']);
        Task::factory()->for($project)->create(['status' => 'completed', 'priority' => 'low']);
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/tasks?project_id='.$project->id.'&status=completed')
            ->assertOk()
            ->assertJsonCount(2, 'tasks');

        $this->withToken($token)
            ->getJson("/api/projects/{$project->id}")
            ->assertOk()
            ->assertJsonPath('project.tasks_count', 3)
            ->assertJsonPath('project.completed_tasks_count', 2)
            ->assertJsonPath('project.progress', 67);
    }

    public function test_a_user_can_create_retrieve_update_and_delete_a_task(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->for($user)->create();
        $token = $user->createToken('test')->plainTextToken;
        $payload = [
            'project_id' => $project->id,
            'title' => 'Prepare launch checklist',
            'description' => 'Review the release criteria.',
            'status' => 'in_progress',
            'priority' => 'urgent',
            'due_date' => '2026-11-01',
        ];

        $createResponse = $this->withToken($token)->postJson('/api/tasks', $payload);

        $createResponse
            ->assertCreated()
            ->assertJsonPath('task.title', $payload['title'])
            ->assertJsonPath('task.project.id', $project->id);

        $taskId = $createResponse->json('task.id');

        $this->withToken($token)
            ->getJson("/api/tasks/{$taskId}")
            ->assertOk()
            ->assertJsonPath('task.priority', 'urgent');

        $this->withToken($token)
            ->putJson("/api/tasks/{$taskId}", [...$payload, 'status' => 'completed'])
            ->assertOk()
            ->assertJsonPath('task.status', 'completed');

        $this->withToken($token)
            ->deleteJson("/api/tasks/{$taskId}")
            ->assertOk()
            ->assertJson(['message' => 'Task deleted successfully.']);

        $this->assertDatabaseMissing('tasks', ['id' => $taskId]);
    }

    public function test_task_validation_rejects_invalid_values_and_unauthorized_projects(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $otherProject = Project::factory()->for($otherUser)->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/tasks', [
                'project_id' => $otherProject->id,
                'title' => '',
                'status' => 'blocked',
                'priority' => 'critical',
                'due_date' => 'not-a-date',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'status', 'priority', 'due_date']);

        $this->withToken($token)
            ->postJson('/api/tasks', [
                'project_id' => $otherProject->id,
                'title' => 'Unauthorized task',
                'status' => 'todo',
                'priority' => 'medium',
            ])
            ->assertNotFound();
    }

    public function test_a_user_cannot_access_another_users_task_and_endpoints_require_authentication(): void
    {
        $user = User::factory()->create();
        $otherTask = Task::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson("/api/tasks/{$otherTask->id}")->assertNotFound();
        $this->withToken($token)->putJson("/api/tasks/{$otherTask->id}", [
            'project_id' => $otherTask->project_id,
            'title' => 'Attempted change',
            'status' => 'todo',
            'priority' => 'low',
        ])->assertNotFound();
        $this->withToken($token)->deleteJson("/api/tasks/{$otherTask->id}")->assertNotFound();

    }

    public function test_task_endpoints_require_authentication(): void
    {
        $task = Task::factory()->create();

        $this->getJson('/api/tasks')->assertUnauthorized();
        $this->postJson('/api/tasks', [])->assertUnauthorized();
        $this->getJson("/api/tasks/{$task->id}")->assertUnauthorized();
    }
}
