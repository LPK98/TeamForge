<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'github_user_id', 'login', 'name', 'avatar_url', 'token'])]
#[Hidden(['token'])]
class GitHubAccount extends Model
{
    use HasFactory;

    protected $table = 'github_accounts';

    protected function casts(): array
    {
        return ['token' => 'encrypted'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
