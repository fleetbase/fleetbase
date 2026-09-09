<?php

namespace Tests\Feature;

use App\Providers\RouteServiceProvider;
use Illuminate\Http\Request;

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

    /**
     * Exercises the /health handler that App\Providers\RouteServiceProvider
     * registers, rather than whichever route wins the match.
     *
     * The extension packages register their own GET /health, and Laravel's
     * RouteCollection is keyed by method+URI — so the last package to register
     * replaces this provider's closure outright, and the request test above can
     * pass without it ever running. Booting the provider again puts its route
     * back on top, which is the only way to assert on the handler this app owns.
     */
    public function test_the_route_service_provider_health_handler_reports_ok(): void
    {
        // Put this provider's route back on top, then go through the kernel so
        // the handler runs exactly as it does in production.
        (new RouteServiceProvider($this->app))->boot();

        $response = $this->get('/health');

        $response->assertStatus(200);
        $response->assertJsonPath('status', 'ok');
        $response->assertJsonStructure(['status', 'time']);
    }
}
