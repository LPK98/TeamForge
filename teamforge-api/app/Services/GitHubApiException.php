<?php

namespace App\Services;

use RuntimeException;

class GitHubApiException extends RuntimeException
{
    public function __construct(string $message, public readonly int $status = 502, public readonly ?int $retryAfter = null)
    {
        parent::__construct($message);
    }
}
