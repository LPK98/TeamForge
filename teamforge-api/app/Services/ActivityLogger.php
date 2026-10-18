<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\Project;
use App\Models\User;

class ActivityLogger
{
    /**
     * @param  array<string, mixed>|null  $metadata
     */
    public function record(
        ?Project $project,
        ?User $actor,
        string $type,
        string $description,
        ?array $metadata = null,
    ): Activity {
        return Activity::create([
            'project_id' => $project?->id,
            'actor_id' => $actor?->id,
            'type' => $type,
            'description' => $description,
            'metadata' => $metadata,
        ]);
    }
}
