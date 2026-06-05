<?php

namespace App\Providers;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Psr\Http\Message\RequestInterface;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     *
     * @return void
     */
    public function register()
    {
        //
    }

    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        $this->configureOutboundHttpLogging();
    }

    protected function configureOutboundHttpLogging(): void
    {
        if (!env('HTTP_CLIENT_TRACE_ENABLED', false)) {
            return;
        }

        Http::globalMiddleware(function (callable $handler) {
            return function (RequestInterface $request, array $options) use ($handler) {
                $id      = (string) Str::uuid();
                $started = microtime(true);

                Log::info('[http:out:start]', [
                    'id'              => $id,
                    'method'          => $request->getMethod(),
                    'url'             => (string) $request->getUri(),
                    'timeout'         => $options['timeout'] ?? null,
                    'connect_timeout' => $options['connect_timeout'] ?? null,
                    'trace'           => $this->outboundHttpTrace(),
                ]);

                return $handler($request, $options)->then(
                    function ($response) use ($id, $started) {
                        Log::info('[http:out:finish]', [
                            'id'         => $id,
                            'status'     => $response->getStatusCode(),
                            'elapsed_ms' => $this->elapsedMilliseconds($started),
                        ]);

                        return $response;
                    },
                    function ($reason) use ($id, $started) {
                        Log::warning('[http:out:error]', [
                            'id'         => $id,
                            'elapsed_ms' => $this->elapsedMilliseconds($started),
                            'error'      => $reason instanceof \Throwable ? $reason->getMessage() : (string) $reason,
                        ]);

                        if ($reason instanceof \Throwable) {
                            throw $reason;
                        }

                        throw new \RuntimeException((string) $reason);
                    }
                );
            };
        });
    }

    protected function outboundHttpTrace(): array
    {
        return collect(debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 20))
            ->filter(function ($frame) {
                $file = $frame['file'] ?? null;

                return $file && !str_contains($file, '/vendor/');
            })
            ->map(fn ($frame) => $frame['file'] . ':' . ($frame['line'] ?? '?'))
            ->values()
            ->take(8)
            ->all();
    }

    protected function elapsedMilliseconds(float $started): int
    {
        return (int) ((microtime(true) - $started) * 1000);
    }
}
