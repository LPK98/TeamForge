<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
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
            ->whereHas('project', fn ($projectQuery) => $projectQuery->where('user_id', $request->user()->id))
            ->with('project:id,name')
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

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validatedData($request);
        $project = $request->user()->projects()->findOrFail($validated['project_id']);
        $task = $project->tasks()->create($validated);

        return response()->json([
            'message' => 'Task created successfully.',
            'task' => $task->load('project:id,name'),
        ], 201);
    }

    public function update(Request $request, int $task): JsonResponse
    {
        $ownedTask = $this->ownedTask($request, $task);
        $validated = $this->validatedData($request);
        $project = $request->user()->projects()->findOrFail($validated['project_id']);
        $ownedTask->update($validated);

        return response()->json([
            'message' => 'Task updated successfully.',
            'task' => $ownedTask->refresh()->load('project:id,name'),
        ]);
    }

    public function destroy(Request $request, int $task): JsonResponse
    {
        $this->ownedTask($request, $task)->delete();

        return response()->json([
            'message' => 'Task deleted successfully.',
        ]);
    }

    private function ownedTask(Request $request, int $task): Task
    {
        return Task::query()
            ->whereKey($task)
            ->whereHas('project', fn ($projectQuery) => $projectQuery->where('user_id', $request->user()->id))
            ->firstOrFail();
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedData(Request $request): array
    {
        return $request->validate([
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'status' => ['required', Rule::in(self::STATUSES)],
            'priority' => ['required', Rule::in(self::PRIORITIES)],
            'due_date' => ['nullable', 'date'],
        ]);
    }
}
