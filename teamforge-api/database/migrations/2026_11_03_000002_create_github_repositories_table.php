<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('github_repositories', function (Blueprint $table) {
            $table->id();
            $table->string('github_repository_id')->unique();
            $table->string('owner');
            $table->string('name');
            $table->string('full_name')->unique();
            $table->text('description')->nullable();
            $table->string('html_url');
            $table->string('clone_url')->nullable();
            $table->string('default_branch')->nullable();
            $table->boolean('private')->default(false);
            $table->string('language')->nullable();
            $table->unsignedInteger('stargazers_count')->default(0);
            $table->unsignedInteger('forks_count')->default(0);
            $table->timestamp('github_updated_at')->nullable();
            $table->timestamps();
        });

        Schema::table('project_repositories', function (Blueprint $table) {
            $table->foreignId('imported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('github_repository_record_id')->nullable()->constrained('github_repositories')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('project_repositories', function (Blueprint $table) {
            $table->dropForeign(['imported_by']);
            $table->dropForeign(['github_repository_record_id']);
            $table->dropColumn(['imported_by', 'github_repository_record_id']);
        });
        Schema::dropIfExists('github_repositories');
    }
};
