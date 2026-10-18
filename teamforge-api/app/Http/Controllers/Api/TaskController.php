<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TaskController extends Controller
{
    private const STATUSES = ['todo', 'in_progress', 'completed'];

    private const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'status' => ['nullable', Rule::in(self::STATUSES)],
            'priority' => ['nullable', Rule::in(self::PRIORITIES)],
        ]);

        $query = Task::query()
            ->whereHas('project', fn ($projectQuery) => $this->accessibleProjectQuery($projectQuery, $request->user()->id))
            ->with(['project:id,name', 'assignee:id,name,email,avatar_path'])
            ->latest();

        if (isset($filters['project_id'])) {
            $query->where('project_id', $filters['project_id']);
        }

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['priority'])) {
            $query->where('priority', $filters['priority']);
        }

        return response()->json([
            'tasks' => $query->get(),
        ]);
    }

    public function show(Request $request, int $task): JsonResponse
    {
        return response()->json([
            'task' => $this->ownedTask($request, $task)->load('project:id,name'),
        ]);
    }

    public function store(Request $request, ActivityLogger $activities): JsonResponse
    {
        $validated = $this->validatedData($request);
        $project = $this->accessibleProject($request, $validated['project_id']);
        $this->authorizeAssignment($request, $project, $validated['assigned_to'] ?? null);
        $task = $project->tasks()->create($validated);
        $activities->record($project, $request->user(), 'task_created', "Created task {$task->title}.", [
            'task_id' => $task->id,
            'status' => $task->status,
            'assigned_to' => $task->assigned_to,
        ]);

        return response()->json([
            'message' => 'Task created successfully.',
            'task' => $task->load(['project:id,name', 'assignee:id,name,email,avatar_path']),
        ], 201);
    }

    public function update(Request $request, int $task, ActivityLogger $activities): JsonResponse
    {
        $ownedTask = $this->ownedTask($request, $task);
        $previous = $ownedTask->only(['project_id', 'title', 'status', 'assigned_to']);
        $validated = $this->validatedData($request);
        $project = $this->accessibleProject($request, $validated['project_id']);
        $this->authorizeAssignment($request, $project, $validated['assigned_to'] ?? null);
        $ownedTask->update($validated);
        $taskChanges = ['task_id' => $ownedTask->id];
        if ($previous['status'] !== $ownedTask->status) {
            $activities->record($project, $request->user(), 'task_status_changed', "Changed {$ownedTask->title} status from {$previous['status']} to {$ownedTask->status}.", [
                ...$taskChanges, 'from' => $previous['status'], 'to' => $ownedTask->status,
            ]);
            if ($ownedTask->status === 'completed') {
                $activities->record($project, $request->user(), 'task_completed', "Completed task {$ownedTask->title}.", $taskChanges);
            }
        }
        if ($previous['assigned_to'] !== $ownedTask->assigned_to) {
            $activities->record($project, $request->user(), 'task_assigned', "Updated the assignee for {$ownedTask->title}.", [
                ...$taskChanges, 'from' => $previous['assigned_to'], 'to' => $ownedTask->assigned_to,
            ]);
        }
        $activities->record($project, $request->user(), 'task_updated', "Updated task {$ownedTask->title}.", $taskChanges);

        return response()->json([
            'message' => 'Task updated successfully.',
            'task' => $ownedTask->refresh()->load(['project:id,name', 'assignee:id,name,email,avatar_path']),
        ]);
    }

    public function destroy(Request $request, int $task, ActivityLogger $activities): JsonResponse
    {
        $ownedTask = $this->ownedTask($request, $task);
        $project = $ownedTask->project;
        $activities->record($project, $request->user(), 'task_deleted', "Deleted task {$ownedTask->title}.", ['task_id' => $ownedTask->id]);
        $ownedTask->delete();

        return response()->json([
            'message' => 'Task deleted successfully.',
        ]);
    }

    private function ownedTask(Request $request, int $task): Task
    {
        return Task::query()
            ->whereKey($task)
            ->whereHas('project', fn ($projectQuery) => $this->accessibleProjectQuery($projectQuery, $request->user()->id))
            ->firstOrFail();
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedData(Request $request): array
    {
        return $request->validate([
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'status' => ['required', Rule::in(self::STATUSES)],
            'priority' => ['required', Rule::in(self::PRIORITIES)],
            'due_date' => ['nullable', 'date'],
        ]);
    }

    private function accessibleProject(Request $request, int $project): Project
    {
        return Project::query()
            ->whereKey($project)
            ->where(fn ($query) => $this->accessibleProjectQuery($query, $request->user()->id))
            ->firstOrFail();
    }

    private function accessibleProjectQuery($query, int $userId)
    {
        return $query->where('user_id', $userId)
            ->orWhereHas('members', fn ($members) => $members->whereKey($userId));
    }

    private function authorizeAssignment(Request $request, Project $project, ?int $assignedTo): void
    {
        if ($assignedTo === null) {
            return;
        }

        abort_unless($project->members()->whereKey($assignedTo)->exists() || $project->user_id === $assignedTo, 422, 'The assignee must be a member of the project.');
        $role = $project->roleFor($request->user());
        abort_unless(
            in_array($role, ['owner', 'manager'], true)
                || ($role === 'member' && $assignedTo === $request->user()->id),
            403,
            'Only project managers can assign tasks.'
        );
    }
}
