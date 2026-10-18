<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ActivityController extends Controller
{
    private const TYPES = [
        'project_created', 'project_updated', 'project_deleted',
        'task_created', 'task_updated', 'task_status_changed', 'task_completed',
        'task_assigned', 'task_deleted', 'member_invited', 'invitation_accepted',
        'invitation_rejected', 'member_added', 'member_removed', 'member_role_changed',
    ];

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'type' => ['nullable', Rule::in(self::TYPES)],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);
        $userId = $request->user()->id;
        $query = Activity::query()
            ->whereHas('project', fn ($project) => $project->where('user_id', $userId)
                ->orWhereHas('members', fn ($members) => $members->whereKey($userId)))
            ->with(['actor:id,name,email,avatar_path', 'project:id,name'])
            ->latest();

        if (isset($filters['project_id'])) {
            $query->where('project_id', $filters['project_id']);
        }
        if (isset($filters['type'])) {
            $query->where('type', $filters['type']);
        }
        if (isset($filters['from'])) {
            $query->where('created_at', '>=', $filters['from']);
        }
        if (isset($filters['to'])) {
            $query->where('created_at', '<=', $filters['to']);
        }

        return response()->json($query->paginate($filters['per_page'] ?? 15));
    }
}
