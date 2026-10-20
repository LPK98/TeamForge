<?php

use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\HealthCheckController;
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

Route::get('/health', HealthCheckController::class);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::patch('/profile', [AuthController::class, 'updateProfile']);
    Route::post('/profile/photo', [AuthController::class, 'uploadProfilePhoto']);
    Route::delete('/profile/photo', [AuthController::class, 'removeProfilePhoto']);
    Route::get('/activities', [ActivityController::class, 'index']);
    Route::post('/logout', [AuthController::class, 'logout']);
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
