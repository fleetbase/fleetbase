<?php

namespace Tests\Unit\Http\Middleware;

use App\Http\Middleware\TrustHosts;
use Tests\TestCase;

/**
 * TrustHosts is currently commented out of App\Http\Kernel's global stack, but
 * the host pattern it would apply is still worth pinning: if it is ever enabled
 * with a broken pattern the app silently starts rejecting its own hostname.
 *
 * Laravel returns the pattern without delimiters (Symfony adds them when it
 * matches), so the assertions below supply their own.
 */
class TrustHostsTest extends TestCase
{
    public function test_trusts_the_application_host_and_all_of_its_subdomains(): void
    {
        config(['app.url' => 'https://fleetbase.example.com']);

        $hosts = (new TrustHosts($this->app))->hosts();

        $this->assertCount(1, $hosts);
        $this->assertNotNull($hosts[0]);

        $pattern = '#' . $hosts[0] . '#';

        $this->assertMatchesRegularExpression($pattern, 'fleetbase.example.com');
        $this->assertMatchesRegularExpression($pattern, 'tenant.fleetbase.example.com');
        $this->assertDoesNotMatchRegularExpression($pattern, 'fleetbase.example.com.evil.test');
    }
}
