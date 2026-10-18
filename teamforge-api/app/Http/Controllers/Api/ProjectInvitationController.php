<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Project;
use App\Models\ProjectInvitation;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProjectInvitationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $invitations = ProjectInvitation::query()
            ->whereRaw('LOWER(invitee_email) = ?', [strtolower($request->user()->email)])
            ->with('project:id,name')
            ->latest()
            ->get()
            ->map(function (ProjectInvitation $invitation) {
                if ($invitation->status === 'pending' && $invitation->expires_at->isPast()) {
                    $invitation->update(['status' => 'expired']);
                }

                return $invitation->fresh('project:id,name');
            });

        return response()->json(['invitations' => $invitations]);
    }

    public function store(Request $request, int $project, ActivityLogger $activities): JsonResponse
    {
        $ownedProject = $this->accessibleProject($request, $project);
        abort_unless($ownedProject->canManageMembers($request->user()), 403);

        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);
        $email = strtolower($validated['email']);

        abort_if($email === strtolower($request->user()->email), 422, 'You cannot invite yourself.');
        abort_if($ownedProject->members()->whereRaw('LOWER(users.email) = ?', [$email])->exists(), 422, 'This user is already a project member.');
        abort_if(ProjectInvitation::query()->where('project_id', $ownedProject->id)->whereRaw('LOWER(invitee_email) = ?', [$email])->where('status', 'pending')->exists(), 422, 'A pending invitation already exists.');

        $invitation = $ownedProject->invitations()->create([
            'inviter_id' => $request->user()->id,
            'invitee_email' => $email,
            'status' => 'pending',
            'expires_at' => now()->addDays(7),
        ]);
        $invitee = User::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->first();

        if ($invitee) {
            Notification::create([
                'user_id' => $invitee->id,
                'project_invitation_id' => $invitation->id,
                'type' => 'project_invitation',
                'title' => 'New project invitation',
                'message' => "You have been invited to join {$ownedProject->name}.",
            ]);
        }
        $activities->record($ownedProject, $request->user(), 'member_invited', "Invited {$email} to {$ownedProject->name}.", [
            'invitation_id' => $invitation->id,
        ]);

        return response()->json([
            'message' => 'Invitation created. The invitee can review it in TeamForge.',
            'invitation' => $invitation->load('project:id,name'),
        ], 201);
    }

    public function accept(Request $request, int $invitation, ActivityLogger $activities): JsonResponse
    {
        return $this->respondToInvitation($request, $invitation, 'accepted', $activities);
    }

    public function reject(Request $request, int $invitation, ActivityLogger $activities): JsonResponse
    {
        return $this->respondToInvitation($request, $invitation, 'rejected', $activities);
    }

    private function respondToInvitation(Request $request, int $invitation, string $status, ActivityLogger $activities): JsonResponse
    {
        $invite = ProjectInvitation::query()
            ->whereKey($invitation)
            ->whereRaw('LOWER(invitee_email) = ?', [strtolower($request->user()->email)])
            ->where('status', 'pending')
            ->firstOrFail();

        abort_if($invite->expires_at->isPast(), 422, 'This invitation has expired.');

        DB::transaction(function () use ($invite, $request, $status) {
            if ($status === 'accepted') {
                $invite->project->members()->syncWithoutDetaching([
                    $request->user()->id => ['role' => 'member'],
                ]);
            }

            $invite->update([
                'status' => $status,
                'responded_at' => now(),
            ]);
            $invite->notification?->update(['read_at' => now()]);
        });
        $activities->record($invite->project, $request->user(), "invitation_{$status}", "{$request->user()->name} {$status} the invitation to {$invite->project->name}.", [
            'invitation_id' => $invite->id,
        ]);
        if ($status === 'accepted') {
            $activities->record($invite->project, $request->user(), 'member_added', "Added {$request->user()->name} to {$invite->project->name}.", [
                'member_id' => $request->user()->id,
            ]);
        }

        return response()->json([
            'message' => $status === 'accepted' ? 'Invitation accepted.' : 'Invitation rejected.',
        ]);
    }

    private function accessibleProject(Request $request, int $project): Project
    {
        return Project::query()
            ->whereKey($project)
            ->where(fn ($query) => $query->where('user_id', $request->user()->id)
                ->orWhereHas('members', fn ($members) => $members->whereKey($request->user()->id)))
            ->firstOrFail();
    }
}
