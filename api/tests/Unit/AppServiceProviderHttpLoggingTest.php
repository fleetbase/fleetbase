<?php

namespace Tests\Unit;

use App\Providers\AppServiceProvider;
use GuzzleHttp\Promise\Create;
use GuzzleHttp\Psr7\Request as PsrRequest;
use GuzzleHttp\Psr7\Response as PsrResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Psr\Http\Message\RequestInterface;
use ReflectionMethod;
use Tests\Concerns\InteractsWithEnvironmentFlags;
use Tests\TestCase;

/**
 * Covers the HTTP_CLIENT_TRACE_ENABLED outbound request logging in
 * AppServiceProvider.
 *
 * The middleware is pulled back off the Http factory and invoked with a stub
 * handler rather than driven through Http::fake(). That is deliberate: the
 * rejection branch has to be reached with both a Throwable and a non-Throwable
 * reason, and Guzzle only ever produces the former in practice.
 */
class AppServiceProviderHttpLoggingTest extends TestCase
{
    use InteractsWithEnvironmentFlags;

    protected function setUp(): void
    {
        // Off for the boot parent::setUp() performs, so the provider under test
        // is the only thing that registers the middleware — otherwise a local
        // api/.env with tracing on would register it twice.
        $this->setEnvironmentFlag('HTTP_CLIENT_TRACE_ENABLED', 'false');

        parent::setUp();

        $this->setEnvironmentFlag('HTTP_CLIENT_TRACE_ENABLED', 'true');
    }

    protected function tearDown(): void
    {
        $this->restoreEnvironmentFlags();

        parent::tearDown();
    }

    private function invoke(string $method, array $args = []): mixed
    {
        $provider = new AppServiceProvider($this->app);

        $ref = new ReflectionMethod($provider, $method);
        $ref->setAccessible(true);

        return $ref->invokeArgs($provider, $args);
    }

    /**
     * Register the middleware and hand back the wrapped handler under test.
     */
    private function wrap(callable $handler): callable
    {
        $this->invoke('configureOutboundHttpLogging');

        $middleware = Http::getFacadeRoot()->getGlobalMiddleware();

        $this->assertNotEmpty($middleware, 'the provider registered no global middleware');

        return end($middleware)($handler);
    }

    private function request(): RequestInterface
    {
        return new PsrRequest('GET', 'https://api.example.com/v1/things?token=supersecret&page=2');
    }

    public function test_it_registers_no_middleware_when_tracing_is_disabled(): void
    {
        $this->setEnvironmentFlag('HTTP_CLIENT_TRACE_ENABLED', 'false');

        $before = count(Http::getFacadeRoot()->getGlobalMiddleware());

        $this->invoke('configureOutboundHttpLogging');

        $this->assertCount($before, Http::getFacadeRoot()->getGlobalMiddleware());
    }

    public function test_a_successful_request_logs_start_and_finish_with_a_redacted_url(): void
    {
        Log::spy();

        $handler = $this->wrap(
            fn (RequestInterface $request, array $options) => Create::promiseFor(new PsrResponse(204))
        );

        $response = $handler($this->request(), ['timeout' => 5, 'connect_timeout' => 2])->wait();

        $this->assertSame(204, $response->getStatusCode());

        Log::shouldHaveReceived('info')
            ->withArgs(function (string $message, array $context) {
                return $message === '[http:out:start]'
                    && $context['method'] === 'GET'
                    && !str_contains($context['url'], 'supersecret')
                    && str_contains($context['url'], 'token=[redacted]')
                    && str_contains($context['url'], 'page=2')
                    && $context['timeout'] === 5
                    && $context['connect_timeout'] === 2
                    && is_array($context['trace']);
            })
            ->once();

        Log::shouldHaveReceived('info')
            ->withArgs(function (string $message, array $context) {
                return $message === '[http:out:finish]'
                    && $context['status'] === 204
                    && is_int($context['elapsed_ms']);
            })
            ->once();
    }

    public function test_missing_timeout_options_are_logged_as_null(): void
    {
        Log::spy();

        $handler = $this->wrap(
            fn (RequestInterface $request, array $options) => Create::promiseFor(new PsrResponse(200))
        );

        $handler($this->request(), [])->wait();

        Log::shouldHaveReceived('info')
            ->withArgs(function (string $message, array $context) {
                return $message === '[http:out:start]'
                    && $context['timeout'] === null
                    && $context['connect_timeout'] === null;
            })
            ->once();
    }

    public function test_a_failed_request_logs_a_warning_and_rethrows_the_original_exception(): void
    {
        Log::spy();

        $original = new \RuntimeException('connection refused');

        $handler = $this->wrap(
            fn (RequestInterface $request, array $options) => Create::rejectionFor($original)
        );

        try {
            $handler($this->request(), [])->wait();
            $this->fail('the rejection should have been rethrown');
        } catch (\RuntimeException $e) {
            // Rethrown as-is so callers keep the original type and stack.
            $this->assertSame($original, $e);
        }

        Log::shouldHaveReceived('warning')
            ->withArgs(function (string $message, array $context) {
                return $message === '[http:out:error]'
                    && $context['error'] === 'connection refused'
                    && is_int($context['elapsed_ms']);
            })
            ->once();
    }

    public function test_a_non_throwable_rejection_reason_is_wrapped_in_a_runtime_exception(): void
    {
        Log::spy();

        $handler = $this->wrap(
            fn (RequestInterface $request, array $options) => Create::rejectionFor('handler gave up')
        );

        try {
            $handler($this->request(), [])->wait();
            $this->fail('the rejection should have been rethrown');
        } catch (\RuntimeException $e) {
            $this->assertSame('handler gave up', $e->getMessage());
        }

        Log::shouldHaveReceived('warning')
            ->withArgs(function (string $message, array $context) {
                return $context['error'] === 'handler gave up';
            })
            ->once();
    }
}
