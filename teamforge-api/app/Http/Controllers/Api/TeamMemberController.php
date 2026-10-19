<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeamMemberController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $projects = Project::query()
            ->where(fn ($query) => $query->where('user_id', $userId)
                ->orWhereHas('members', fn ($members) => $members->whereKey($userId)))
            ->with(['user:id,name,email,avatar_path,created_at', 'members:id,name,email,avatar_path,created_at'])
            ->latest()
            ->get();

        $members = collect();
        $manageableProjects = collect();

        foreach ($projects as $project) {
            $currentRole = $project->user_id === $userId
                ? 'owner'
                : $project->members->firstWhere('id', $userId)?->pivot->role;

            if (in_array($currentRole, ['owner', 'manager'], true)) {
                $manageableProjects->push([
                    'id' => $project->id,
                    'name' => $project->name,
                    'role' => $currentRole,
                ]);
            }

            $projectMembers = collect([[
                'user' => $project->user,
                'role' => 'owner',
            ]])->merge($project->members->map(fn (User $member) => [
                'user' => $member,
                'role' => $member->pivot->role,
            ]));

            foreach ($projectMembers as $entry) {
                $member = $entry['user'];
                $existing = $members->get($member->id, [
                    'id' => $member->id,
                    'name' => $member->name,
                    'email' => $member->email,
                    'avatar_url' => $member->avatar_url,
                    'created_at' => $member->created_at?->toISOString(),
                    'projects' => [],
                ]);
                $existing['projects'][] = [
                    'id' => $project->id,
                    'name' => $project->name,
                    'role' => $entry['role'],
                ];
                $members->put($member->id, $existing);
            }
        }

        return response()->json([
            'members' => $members->values(),
            'manageable_projects' => $manageableProjects->unique('id')->values(),
        ]);
    }
}
