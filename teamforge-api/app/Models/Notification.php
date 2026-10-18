<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'project_invitation_id', 'type', 'title', 'message', 'read_at'])]
class Notification extends Model
{
    protected function casts(): array
    {
        return ['read_at' => 'datetime'];
    }

    protected function isRead(): Attribute
    {
        return Attribute::get(fn (): bool => $this->read_at !== null);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function projectInvitation(): BelongsTo
    {
        return $this->belongsTo(ProjectInvitation::class);
    }
}
