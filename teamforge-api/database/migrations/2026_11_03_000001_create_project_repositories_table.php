<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_repositories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->string('github_repository_id');
            $table->string('owner');
            $table->string('name');
            $table->string('full_name');
            $table->text('description')->nullable();
            $table->string('html_url');
            $table->string('clone_url')->nullable();
            $table->string('default_branch')->nullable();
            $table->boolean('private')->default(false);
            $table->timestamps();

            $table->unique(['project_id', 'full_name']);
            $table->index('github_repository_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_repositories');
    }
};
