<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProjectController extends Controller
{
    private const STATUSES = ['planning', 'in_progress', 'completed', 'on_hold'];

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'projects' => $request->user()->projects()
                ->withCount('tasks')
                ->withCount(['tasks as completed_tasks_count' => fn ($query) => $query->where('status', 'completed')])
                ->latest()
                ->get()
                ->map(fn (Project $project) => $this->withProgress($project)),
        ]);
    }

    public function show(Request $request, int $project): JsonResponse
    {
        return response()->json([
            'project' => $this->withProgress($this->ownedProject($request, $project)
                ->loadCount('tasks')
                ->loadCount(['tasks as completed_tasks_count' => fn ($query) => $query->where('status', 'completed')])),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $project = $request->user()->projects()->create($this->validatedData($request));

        return response()->json([
            'message' => 'Project created successfully.',
            'project' => $this->withProgress($project),
        ], 201);
    }

    public function update(Request $request, int $project): JsonResponse
    {
        $ownedProject = $this->ownedProject($request, $project);
        $ownedProject->update($this->validatedData($request));

        return response()->json([
            'message' => 'Project updated successfully.',
            'project' => $ownedProject->refresh(),
        ]);
    }

    public function destroy(Request $request, int $project): JsonResponse
    {
        $this->ownedProject($request, $project)->delete();

        return response()->json([
            'message' => 'Project deleted successfully.',
        ]);
    }

    private function ownedProject(Request $request, int $project): Project
    {
        return $request->user()->projects()->findOrFail($project);
    }

    private function withProgress(Project $project): Project
    {
        $total = (int) ($project->tasks_count ?? 0);
        $completed = (int) ($project->completed_tasks_count ?? 0);
        $project->setAttribute('progress', $total === 0 ? 0 : (int) round(($completed / $total) * 100));

        return $project;
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedData(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'status' => ['required', 'string', Rule::in(self::STATUSES)],
            'start_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:start_date'],
        ]);
    }
}
