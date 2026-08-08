<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * Verifies the host application boots and serves its two unauthenticated
 * liveness endpoints. This is the in-process complement to the install-smoke
 * CI job (which curls the same routes against a running container).
 */
class HealthCheckTest extends TestCase
{
    public function test_root_route_returns_welcome_payload(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
        $response->assertJsonPath('message', 'Fleetbase API');
        $response->assertJsonStructure(['message', 'version', 'fleetbase', 'ms']);
    }

    public function test_health_route_reports_ok(): void
    {
        $response = $this->get('/health');

        $response->assertStatus(200);
        $response->assertJsonPath('status', 'ok');
        $response->assertJsonStructure(['status', 'time']);
    }
}
