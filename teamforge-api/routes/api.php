<?php

use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\HealthCheckController;
use App\Http\Controllers\Api\GitHubController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\ProjectInvitationController;
use App\Http\Controllers\Api\ProjectMemberController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\TeamMemberController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register'])
    ->middleware('throttle:5,1');

Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:5,1');

Route::get('/auth/google/redirect', [AuthController::class, 'redirectToGoogle']);
Route::get('/auth/google/callback', [AuthController::class, 'handleGoogleCallback']);
Route::get('/auth/github/redirect', [GitHubController::class, 'redirectToLogin']);
Route::get('/auth/github/callback', [GitHubController::class, 'handleLoginCallback']);

Route::get('/health', HealthCheckController::class);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::patch('/profile', [AuthController::class, 'updateProfile']);
    Route::post('/profile/photo', [AuthController::class, 'uploadProfilePhoto']);
    Route::delete('/profile/photo', [AuthController::class, 'removeProfilePhoto']);
    Route::get('/activities', [ActivityController::class, 'index']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/github/status', [GitHubController::class, 'status']);
    Route::get('/github/connect', [GitHubController::class, 'connect']);
    Route::post('/github/disconnect', [GitHubController::class, 'disconnect']);
    Route::delete('/github/connect', [GitHubController::class, 'disconnect']);
    Route::post('/github/repos/sync', [GitHubController::class, 'sync']);
    Route::post('/github/repositories/sync', [GitHubController::class, 'sync']);
    Route::get('/github/repos', [GitHubController::class, 'repositories']);
    Route::get('/github/repos/{owner}/{name}', [GitHubController::class, 'showRepository']);
    Route::get('/github/repositories', [GitHubController::class, 'repositories']);
    Route::get('/github/repositories/{owner}/{name}', [GitHubController::class, 'showRepository']);
    Route::post('/github/repositories/{owner}/{name}/import', [GitHubController::class, 'importByRepository']);
    Route::post('/projects/{project}/repositories/import', [GitHubController::class, 'import']);
    Route::get('/projects/{project}/repositories', [GitHubController::class, 'projectRepositories']);
    Route::delete('/projects/{project}/repositories/{repository}', [GitHubController::class, 'removeProjectRepository']);
    Route::apiResource('projects', ProjectController::class)->except(['create', 'edit']);
    Route::apiResource('tasks', TaskController::class)->except(['create', 'edit']);
    Route::get('/team-members', [TeamMemberController::class, 'index']);
    Route::get('/projects/{project}/members', [ProjectMemberController::class, 'index']);
    Route::patch('/projects/{project}/members/{user}', [ProjectMemberController::class, 'update']);
    Route::delete('/projects/{project}/members/{user}', [ProjectMemberController::class, 'destroy']);
    Route::get('/invitations', [ProjectInvitationController::class, 'index']);
    Route::post('/projects/{project}/invitations', [ProjectInvitationController::class, 'store']);
    Route::post('/invitations/{invitation}/accept', [ProjectInvitationController::class, 'accept']);
    Route::post('/invitations/{invitation}/reject', [ProjectInvitationController::class, 'reject']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'read']);
    Route::post('/notifications/read-all', [NotificationController::class, 'readAll']);
});

Route::get('/github/callback', [GitHubController::class, 'callback']);
