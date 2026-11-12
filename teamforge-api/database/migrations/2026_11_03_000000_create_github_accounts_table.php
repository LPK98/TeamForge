<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('github_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('github_user_id');
            $table->string('login');
            $table->string('name')->nullable();
            $table->string('avatar_url')->nullable();
            $table->text('token');
            $table->timestamps();

            $table->unique('user_id');
            $table->unique(['github_user_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('github_accounts');
    }
};
