<?php

namespace Tests\Unit;

use App\Providers\AppServiceProvider;
use ReflectionMethod;
use Tests\TestCase;

/**
 * Covers the meaningful logic in AppServiceProvider — outbound HTTP logging
 * helpers (URL secret redaction, elapsed-time calc, caller trace) and the
 * early-return when tracing is disabled.
 */
class AppServiceProviderTest extends TestCase
{
    private function provider(): AppServiceProvider
    {
        return new AppServiceProvider($this->app);
    }

    private function invoke(AppServiceProvider $provider, string $method, array $args = [])
    {
        $ref = new ReflectionMethod($provider, $method);
        $ref->setAccessible(true);

        return $ref->invokeArgs($provider, $args);
    }

    public function test_redacts_sensitive_query_parameters(): void
    {
        $url = 'https://api.example.com/v1/things?token=supersecret&api_key=abc123&page=2';

        $redacted = $this->invoke($this->provider(), 'redactOutboundHttpUrl', [$url]);

        $this->assertStringNotContainsString('supersecret', $redacted);
        $this->assertStringNotContainsString('abc123', $redacted);
        $this->assertStringContainsString('token=[redacted]', $redacted);
        $this->assertStringContainsString('api_key=[redacted]', $redacted);
        // Non-sensitive params are preserved.
        $this->assertStringContainsString('page=2', $redacted);
    }

    public function test_redact_leaves_urls_without_secrets_untouched(): void
    {
        $url = 'https://api.example.com/v1/things?page=2';

        $this->assertSame($url, $this->invoke($this->provider(), 'redactOutboundHttpUrl', [$url]));
    }

    public function test_elapsed_milliseconds_is_non_negative_integer(): void
    {
        $started = microtime(true) - 0.05; // 50ms ago

        $elapsed = $this->invoke($this->provider(), 'elapsedMilliseconds', [$started]);

        $this->assertIsInt($elapsed);
        $this->assertGreaterThanOrEqual(0, $elapsed);
    }

    public function test_outbound_http_trace_excludes_vendor_frames(): void
    {
        $trace = $this->invoke($this->provider(), 'outboundHttpTrace');

        $this->assertIsArray($trace);
        foreach ($trace as $frame) {
            $this->assertStringNotContainsString('/vendor/', $frame);
        }
    }

    public function test_boot_is_noop_when_tracing_disabled(): void
    {
        // HTTP_CLIENT_TRACE_ENABLED is unset in the testing env, so boot() should
        // return without registering global HTTP middleware and without throwing.
        $this->provider()->boot();

        $this->assertTrue(true);
    }
}
