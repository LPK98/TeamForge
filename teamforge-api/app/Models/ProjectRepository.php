<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['github_repository_id', 'owner', 'name', 'full_name', 'description', 'html_url', 'clone_url', 'default_branch', 'private', 'imported_by', 'github_repository_record_id'])]
class ProjectRepository extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return ['private' => 'boolean'];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function githubRepository(): BelongsTo
    {
        return $this->belongsTo(GitHubRepository::class, 'github_repository_record_id');
    }

    public function importedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'imported_by');
    }
}
