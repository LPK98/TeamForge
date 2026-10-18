<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\ProjectInvitation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->backfillInvitationNotifications($request->user()->id, $request->user()->email);

        $notifications = $request->user()->notifications()
            ->with('projectInvitation.project:id,name')
            ->with('projectInvitation.inviter:id,name,email,avatar_path')
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn (Notification $notification) => $this->serialize($notification));

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $request->user()->notifications()->whereNull('read_at')->count(),
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $this->backfillInvitationNotifications($request->user()->id, $request->user()->email);

        return response()->json([
            'unread_count' => $request->user()->notifications()->whereNull('read_at')->count(),
        ]);
    }

    public function read(Request $request, int $notification): JsonResponse
    {
        $ownedNotification = $request->user()->notifications()->findOrFail($notification);
        $ownedNotification->update(['read_at' => now()]);

        return response()->json(['message' => 'Notification marked as read.']);
    }

    public function readAll(Request $request): JsonResponse
    {
        $request->user()->notifications()->whereNull('read_at')->update(['read_at' => now()]);

        return response()->json(['message' => 'Notifications marked as read.']);
    }

    private function backfillInvitationNotifications(int $userId, string $email): void
    {
        $invitations = ProjectInvitation::query()
            ->whereRaw('LOWER(invitee_email) = ?', [strtolower($email)])
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->whereDoesntHave('notification')
            ->with('project:id,name')
            ->get();

        if ($invitations->isEmpty()) {
            return;
        }

        DB::transaction(function () use ($invitations, $userId) {
            foreach ($invitations as $invitation) {
                Notification::create([
                    'user_id' => $userId,
                    'project_invitation_id' => $invitation->id,
                    'type' => 'project_invitation',
                    'title' => 'New project invitation',
                    'message' => "You have been invited to join {$invitation->project->name}.",
                ]);
            }
        });
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(Notification $notification): array
    {
        return [
            'id' => $notification->id,
            'type' => $notification->type,
            'title' => $notification->title,
            'message' => $notification->message,
            'is_read' => $notification->is_read,
            'read_at' => $notification->read_at?->toISOString(),
            'created_at' => $notification->created_at->toISOString(),
            'invitation' => $notification->projectInvitation ? [
                'id' => $notification->projectInvitation->id,
                'project_id' => $notification->projectInvitation->project_id,
                'project_name' => $notification->projectInvitation->project->name,
                'inviter' => $notification->projectInvitation->inviter ? [
                    'id' => $notification->projectInvitation->inviter->id,
                    'name' => $notification->projectInvitation->inviter->name,
                    'avatar_url' => $notification->projectInvitation->inviter->avatar_url,
                ] : null,
                'status' => $notification->projectInvitation->status,
                'expires_at' => $notification->projectInvitation->expires_at->toISOString(),
            ] : null,
        ];
    }
}
