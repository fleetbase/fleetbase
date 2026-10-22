<?php

namespace Tests\Unit\Http\Middleware;

use App\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;
use Tests\TestCase;

/**
 * Rate limiting and request logs key on $request->ip(). Behind the bundled httpd or a
 * cloud load balancer that is the proxy's address unless the proxy is trusted, which
 * made every caller on the platform share a single rate-limit bucket.
 */
class TrustProxiesTest extends TestCase
{
    public function test_a_private_network_proxy_forwards_the_client_ip_by_default(): void
    {
        $this->assertSame('41.0.0.1', $this->resolveIp('172.18.0.9', '41.0.0.1'));
    }

    public function test_a_public_caller_cannot_spoof_its_ip_by_default(): void
    {
        $this->assertSame('198.51.100.20', $this->resolveIp('198.51.100.20', '41.0.0.1'));
    }

    public function test_every_private_hop_is_skipped_to_reach_the_client(): void
    {
        $this->assertSame('41.0.0.1', $this->resolveIp('172.18.0.9', '41.0.0.1, 10.0.4.12'));
    }

    public function test_the_configured_list_replaces_the_default(): void
    {
        config(['trustedproxy.proxies' => ['35.191.0.0/16']]);

        $this->assertSame('41.0.0.1', $this->resolveIp('35.191.2.3', '41.0.0.1'));
        $this->assertSame('172.18.0.9', $this->resolveIp('172.18.0.9', '41.0.0.1'));
    }

    public function test_a_wildcard_trusts_the_connecting_proxy(): void
    {
        config(['trustedproxy.proxies' => '*']);

        $this->assertSame('41.0.0.1', $this->resolveIp('198.51.100.20', '41.0.0.1'));
    }

    private function resolveIp(string $remoteAddr, string $forwardedFor): string
    {
        $request = Request::create('/v1/orders', 'GET', [], [], [], [
            'REMOTE_ADDR'          => $remoteAddr,
            'HTTP_X_FORWARDED_FOR' => $forwardedFor,
        ]);

        $ip = null;
        (new TrustProxies())->handle($request, function (Request $request) use (&$ip) {
            $ip = $request->ip();

            return response('ok');
        });

        Request::setTrustedProxies([], Request::HEADER_X_FORWARDED_FOR);

        return $ip;
    }
}
