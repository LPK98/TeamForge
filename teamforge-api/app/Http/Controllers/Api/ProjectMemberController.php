<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProjectMemberController extends Controller
{
    public function index(Request $request, int $project): JsonResponse
    {
        $ownedProject = $this->accessibleProject($request, $project);
        $members = $ownedProject->members()->select('users.id', 'users.name', 'users.email', 'users.avatar_path')->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->pivot->role,
            ])->values();

        return response()->json([
            'members' => collect([[
                'id' => $ownedProject->user->id,
                'name' => $ownedProject->user->name,
                'email' => $ownedProject->user->email,
                'role' => 'owner',
            ]])->merge($members)->values(),
        ]);
    }

    public function update(Request $request, int $project, int $user, ActivityLogger $activities): JsonResponse
    {
        $ownedProject = $this->accessibleProject($request, $project);
        abort_unless($ownedProject->canManageMembers($request->user()), 403);
        abort_if($ownedProject->user_id === $user, 422, 'The project owner role cannot be changed.');

        $validated = $request->validate([
            'role' => ['required', Rule::in(['manager', 'member'])],
        ]);

        abort_unless($ownedProject->members()->whereKey($user)->exists(), 404);
        $ownedProject->members()->updateExistingPivot($user, ['role' => $validated['role']]);
        $member = User::findOrFail($user);
        $activities->record($ownedProject, $request->user(), 'member_role_changed', "Changed {$member->name}'s role to {$validated['role']}.", [
            'member_id' => $user, 'role' => $validated['role'],
        ]);

        return response()->json(['message' => 'Member role updated successfully.']);
    }

    public function destroy(Request $request, int $project, int $user, ActivityLogger $activities): JsonResponse
    {
        $ownedProject = $this->accessibleProject($request, $project);
        abort_unless($ownedProject->canManageMembers($request->user()), 403);
        abort_if($ownedProject->user_id === $user, 422, 'The project owner cannot be removed.');
        abort_unless($ownedProject->members()->whereKey($user)->exists(), 404);

        $ownedProject->members()->detach($user);
        $member = User::findOrFail($user);
        $activities->record($ownedProject, $request->user(), 'member_removed', "Removed {$member->name} from the project.", ['member_id' => $user]);

        return response()->json(['message' => 'Member removed successfully.']);
    }

    private function accessibleProject(Request $request, int $project): Project
    {
        $userId = $request->user()->id;

        return Project::query()
            ->whereKey($project)
            ->where(fn ($query) => $query->where('user_id', $userId)
                ->orWhereHas('members', fn ($members) => $members->whereKey($userId)))
            ->with('user:id,name,email,avatar_path')
            ->firstOrFail();
    }
}
