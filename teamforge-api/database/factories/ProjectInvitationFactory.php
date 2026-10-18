<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\ProjectInvitation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProjectInvitation>
 */
class ProjectInvitationFactory extends Factory
{
    protected $model = ProjectInvitation::class;

    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'inviter_id' => User::factory(),
            'invitee_email' => fake()->safeEmail(),
            'status' => 'pending',
            'expires_at' => now()->addDays(7),
        ];
    }
}
