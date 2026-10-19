<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\Notification;
use App\Models\Project;
use App\Models\ProjectInvitation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CollaborationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_invite_a_registered_user_and_the_intended_user_can_accept(): void
    {
        $owner = User::factory()->create();
        $invitee = User::factory()->create(['email' => 'invitee@example.test']);
        $project = Project::factory()->for($owner)->create();
        $ownerToken = $owner->createToken('test')->plainTextToken;
        $inviteeToken = $invitee->createToken('test')->plainTextToken;

        $create = $this->withToken($ownerToken)
            ->postJson("/api/projects/{$project->id}/invitations", ['email' => $invitee->email])
            ->assertCreated()
            ->assertJsonMissingPath('invitation.token');

        $invitationId = $create->json('invitation.id');

        Auth::forgetGuards();
        $this->withToken($inviteeToken)
            ->getJson('/api/invitations')
            ->assertOk()
            ->assertJsonPath('invitations.0.id', $invitationId);

        $this->withToken($inviteeToken)
            ->postJson("/api/invitations/{$invitationId}/accept")
            ->assertOk();

        $this->withToken($inviteeToken)
            ->getJson("/api/projects/{$project->id}/members")
            ->assertOk()
            ->assertJsonFragment(['email' => $invitee->email, 'role' => 'member']);
    }

    public function test_duplicate_pending_invites_and_self_invites_are_rejected(): void
    {
        $owner = User::factory()->create();
        $invitee = User::factory()->create();
        $project = Project::factory()->for($owner)->create();
        $token = $owner->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson("/api/projects/{$project->id}/invitations", ['email' => $owner->email])->assertUnprocessable();
        $this->withToken($token)->postJson("/api/projects/{$project->id}/invitations", ['email' => $invitee->email])->assertCreated();
        $this->withToken($token)->postJson("/api/projects/{$project->id}/invitations", ['email' => $invitee->email])->assertUnprocessable();
    }

    public function test_wrong_user_and_expired_invitation_cannot_accept(): void
    {
        $owner = User::factory()->create();
        $invitee = User::factory()->create();
        $wrongUser = User::factory()->create();
        $project = Project::factory()->for($owner)->create();
        $invitation = ProjectInvitation::factory()->create([
            'project_id' => $project->id,
            'inviter_id' => $owner->id,
            'invitee_email' => $invitee->email,
            'expires_at' => now()->addDay(),
        ]);

        $this->withToken($wrongUser->createToken('test')->plainTextToken)
            ->postJson("/api/invitations/{$invitation->id}/accept")
            ->assertNotFound();

        $invitation->update(['expires_at' => now()->subMinute()]);
        Auth::forgetGuards();
        $this->withToken($invitee->createToken('test')->plainTextToken)
            ->postJson("/api/invitations/{$invitation->id}/accept")
            ->assertUnprocessable();
    }

    public function test_owner_can_manage_members_but_cannot_remove_themselves(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $project = Project::factory()->for($owner)->create();
        $project->members()->attach($member->id, ['role' => 'member']);
        $token = $owner->createToken('test')->plainTextToken;

        $this->withToken($token)->patchJson("/api/projects/{$project->id}/members/{$member->id}", ['role' => 'manager'])->assertOk();
        $this->withToken($token)->deleteJson("/api/projects/{$project->id}/members/{$member->id}")->assertOk();
        $this->withToken($token)->deleteJson("/api/projects/{$project->id}/members/{$owner->id}")->assertUnprocessable();
    }

    public function test_task_assignment_requires_a_project_member(): void
    {
        $owner = User::factory()->create();
        $unrelated = User::factory()->create();
        $project = Project::factory()->for($owner)->create();
        $token = $owner->createToken('test')->plainTextToken;
        $payload = [
            'project_id' => $project->id,
            'assigned_to' => $unrelated->id,
            'title' => 'Restricted task',
            'status' => 'todo',
            'priority' => 'medium',
        ];

        $this->withToken($token)->postJson('/api/tasks', $payload)->assertUnprocessable();

        $project->members()->attach($unrelated->id, ['role' => 'member']);
        $this->withToken($token)->postJson('/api/tasks', $payload)->assertCreated()->assertJsonPath('task.assignee.id', $unrelated->id);
    }

    public function test_invitation_notifications_are_private_and_can_be_marked_read(): void
    {
        $owner = User::factory()->create();
        $invitee = User::factory()->create(['email' => 'notify@example.test']);
        $otherUser = User::factory()->create();
        $project = Project::factory()->for($owner)->create();
        $ownerToken = $owner->createToken('test')->plainTextToken;
        $inviteeToken = $invitee->createToken('test')->plainTextToken;

        $created = $this->withToken($ownerToken)
            ->postJson("/api/projects/{$project->id}/invitations", ['email' => $invitee->email])
            ->assertCreated();
        $notificationId = Notification::query()->firstOrFail()->id;

        Auth::forgetGuards();
        $this->withToken($inviteeToken)
            ->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('unread_count', 1)
            ->assertJsonPath('notifications.0.invitation.id', $created->json('invitation.id'))
            ->assertJsonPath('notifications.0.invitation.inviter.id', $owner->id)
            ->assertJsonPath('notifications.0.invitation.inviter.avatar_url', null);

        Auth::forgetGuards();
        $this->withToken($otherUser->createToken('test')->plainTextToken)
            ->patchJson("/api/notifications/{$notificationId}/read")
            ->assertNotFound();

        Auth::forgetGuards();
        $this->withToken($inviteeToken)
            ->patchJson("/api/notifications/{$notificationId}/read")
            ->assertOk();

        $this->withToken($inviteeToken)
            ->getJson('/api/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('unread_count', 0);
    }

    public function test_accepting_an_invitation_marks_its_notification_read(): void
    {
        $owner = User::factory()->create();
        $invitee = User::factory()->create();
        $project = Project::factory()->for($owner)->create();
        $invitation = ProjectInvitation::factory()->create([
            'project_id' => $project->id,
            'inviter_id' => $owner->id,
            'invitee_email' => $invitee->email,
        ]);
        $notification = Notification::create([
            'user_id' => $invitee->id,
            'project_invitation_id' => $invitation->id,
            'type' => 'project_invitation',
            'title' => 'New project invitation',
            'message' => 'You have been invited.',
        ]);

        $this->withToken($invitee->createToken('test')->plainTextToken)
            ->postJson("/api/invitations/{$invitation->id}/accept")
            ->assertOk();

        $this->assertNotNull($notification->fresh()->read_at);
    }

    public function test_team_members_are_deduplicated_and_scoped_to_accessible_projects(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $outsideOwner = User::factory()->create();
        $sharedProject = Project::factory()->for($owner)->create(['name' => 'Shared project']);
        $secondProject = Project::factory()->for($owner)->create(['name' => 'Second project']);
        Project::factory()->for($outsideOwner)->create(['name' => 'Private project']);
        $sharedProject->members()->attach($member->id, ['role' => 'member']);
        $secondProject->members()->attach($member->id, ['role' => 'manager']);

        $this->withToken($owner->createToken('test')->plainTextToken)
            ->getJson('/api/team-members')
            ->assertOk()
            ->assertJsonCount(2, 'members')
            ->assertJsonCount(2, 'members.1.projects')
            ->assertJsonFragment(['name' => 'Shared project', 'role' => 'member'])
            ->assertJsonFragment(['name' => 'Second project', 'role' => 'manager'])
            ->assertJsonMissing(['name' => 'Private project']);
    }

    public function test_member_responses_include_each_members_public_avatar_url(): void
    {
        Storage::fake('public');
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $member->update(['avatar_path' => 'avatars/member.webp']);
        Storage::disk('public')->put('avatars/member.webp', 'image');
        $project = Project::factory()->for($owner)->create();
        $project->members()->attach($member->id, ['role' => 'member']);
        $token = $owner->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/team-members')
            ->assertOk()
            ->assertJsonPath('members.1.avatar_url', Storage::disk('public')->url('avatars/member.webp'));

        $this->withToken($token)
            ->getJson("/api/projects/{$project->id}/members")
            ->assertOk()
            ->assertJsonPath('members.1.avatar_url', Storage::disk('public')->url('avatars/member.webp'));
    }

    public function test_activity_records_actor_and_isolated_project_events(): void
    {
        $owner = User::factory()->create();
        $otherOwner = User::factory()->create();
        $project = Project::factory()->for($owner)->create();
        $privateProject = Project::factory()->for($otherOwner)->create();

        $this->withToken($owner->createToken('test')->plainTextToken)
            ->postJson('/api/projects', [
                'name' => 'Tracked project',
                'description' => '',
                'status' => 'planning',
            ])->assertCreated();

        $activity = Activity::query()->where('type', 'project_created')->latest()->firstOrFail();
        $this->assertSame($owner->id, $activity->actor_id);

        Activity::create([
            'project_id' => $privateProject->id,
            'actor_id' => $otherOwner->id,
            'type' => 'task_created',
            'description' => 'Private event',
        ]);

        $this->withToken($owner->createToken('activity-test')->plainTextToken)
            ->getJson('/api/activities?type=project_created&per_page=1')
            ->assertOk()
            ->assertJsonPath('data.0.actor_id', $owner->id)
            ->assertJsonPath('per_page', 1)
            ->assertJsonMissing(['description' => 'Private event']);

        $this->withToken($owner->createToken('activity-filter')->plainTextToken)
            ->getJson("/api/activities?project_id={$privateProject->id}")
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }
}
