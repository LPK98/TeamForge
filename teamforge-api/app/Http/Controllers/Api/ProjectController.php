<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProjectController extends Controller
{
    private const STATUSES = ['planning', 'in_progress', 'completed', 'on_hold'];

    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        return response()->json([
            'projects' => Project::query()
                ->where(fn ($query) => $query->where('user_id', $userId)
                    ->orWhereHas('members', fn ($members) => $members->whereKey($userId)))
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
            'project' => $this->withProgress($this->accessibleProject($request, $project)
                ->loadCount('tasks')
                ->loadCount(['tasks as completed_tasks_count' => fn ($query) => $query->where('status', 'completed')])),
        ]);
    }

    public function store(Request $request, ActivityLogger $activities): JsonResponse
    {
        $project = $request->user()->projects()->create($this->validatedData($request));
        $activities->record($project, $request->user(), 'project_created', "Created project {$project->name}.");

        return response()->json([
            'message' => 'Project created successfully.',
            'project' => $this->withProgress($project),
        ], 201);
    }

    public function update(Request $request, int $project, ActivityLogger $activities): JsonResponse
    {
        $ownedProject = $this->ownedProject($request, $project);
        $previousName = $ownedProject->name;
        $ownedProject->update($this->validatedData($request));
        $activities->record($ownedProject, $request->user(), 'project_updated', "Updated project {$ownedProject->name}.", [
            'previous_name' => $previousName,
        ]);

        return response()->json([
            'message' => 'Project updated successfully.',
            'project' => $ownedProject->refresh(),
        ]);
    }

    public function destroy(Request $request, int $project, ActivityLogger $activities): JsonResponse
    {
        $ownedProject = $this->ownedProject($request, $project);
        $activities->record($ownedProject, $request->user(), 'project_deleted', "Deleted project {$ownedProject->name}.");
        $ownedProject->delete();

        return response()->json([
            'message' => 'Project deleted successfully.',
        ]);
    }

    private function ownedProject(Request $request, int $project): Project
    {
        return $request->user()->projects()->findOrFail($project);
    }

    private function accessibleProject(Request $request, int $project): Project
    {
        $userId = $request->user()->id;

        return Project::query()
            ->whereKey($project)
            ->where(fn ($query) => $query->where('user_id', $userId)
                ->orWhereHas('members', fn ($members) => $members->whereKey($userId)))
            ->firstOrFail();
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
