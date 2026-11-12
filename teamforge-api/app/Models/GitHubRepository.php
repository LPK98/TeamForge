<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['github_repository_id', 'owner', 'name', 'full_name', 'description', 'html_url', 'clone_url', 'default_branch', 'private', 'language', 'stargazers_count', 'forks_count', 'github_updated_at'])]
class GitHubRepository extends Model
{
    use HasFactory;

    protected $table = 'github_repositories';

    protected function casts(): array
    {
        return [
            'private' => 'boolean',
            'github_updated_at' => 'datetime',
        ];
    }

    public function projectRepositories(): HasMany
    {
        return $this->hasMany(ProjectRepository::class, 'github_repository_record_id');
    }
}
