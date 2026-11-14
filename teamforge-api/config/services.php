<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'github' => [
        'client_id' => env('GITHUB_CLIENT_ID'),
        'client_secret' => env('GITHUB_CLIENT_SECRET'),
        'callback_url' => env('GITHUB_CALLBACK_URL'),
        'login_callback_url' => env('GITHUB_LOGIN_CALLBACK_URL', 'http://127.0.0.1:8000/api/auth/github/callback'),
        'frontend_redirect_url' => env('GITHUB_FRONTEND_REDIRECT_URL'),
        'login_frontend_redirect_url' => env('GITHUB_LOGIN_FRONTEND_REDIRECT_URL', 'http://localhost:5173/login'),
        'api_url' => env('GITHUB_API_URL', 'https://api.github.com'),
        'scope' => env('GITHUB_SCOPE', 'read:user user:email repo'),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
        'frontend_redirect_url' => env('GOOGLE_FRONTEND_REDIRECT_URL', 'http://localhost:5173/login'),
    ],

];
