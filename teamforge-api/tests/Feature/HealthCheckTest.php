<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Mockery;
use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    public function test_api_preflight_allows_the_web_application_origin(): void
    {
        $response = $this->options('/api/register', [], [
            'Origin' => 'https://teamforge-rho-six.vercel.app',
            'Access-Control-Request-Method' => 'POST',
            'Access-Control-Request-Headers' => 'content-type',
        ]);

        $response
            ->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'https://teamforge-rho-six.vercel.app')
            ->assertHeader('Access-Control-Allow-Methods')
            ->assertHeader('Access-Control-Allow-Headers');
    }

    public function test_health_check_reports_a_healthy_database(): void
    {
        $response = $this->getJson('/api/health');

        $response
            ->assertOk()
            ->assertJson([
                'status' => 'ok',
                'database' => 'connected',
            ]);
    }

    public function test_health_check_reports_when_the_database_is_unavailable(): void
    {
        $connection = Mockery::mock();
        $connection
            ->shouldReceive('getPdo')
            ->once()
            ->andThrow(new \RuntimeException('Database unavailable'));

        DB::shouldReceive('connection')
            ->once()
            ->andReturn($connection);

        $response = $this->getJson('/api/health');

        $response
            ->assertStatus(503)
            ->assertJson([
                'status' => 'error',
                'database' => 'disconnected',
            ]);
    }
}
