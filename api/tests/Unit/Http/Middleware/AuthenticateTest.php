<?php

namespace Tests\Unit\Http\Middleware;

use App\Http\Middleware\Authenticate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use ReflectionMethod;
use Tests\TestCase;

/**
 * The `auth` middleware alias overrides redirectTo() so an unauthenticated API
 * request gets Fleetbase's JSON error envelope instead of a redirect to a
 * `login` route this app does not define. Guarding that here because the
 * override's return type disagrees with the inherited docblock — returning a
 * response rather than a path is the whole point of it.
 */
class AuthenticateTest extends TestCase
{
    public function test_unauthenticated_requests_get_the_fleetbase_json_error_envelope(): void
    {
        $middleware = new Authenticate($this->app['auth']);

        $method = new ReflectionMethod($middleware, 'redirectTo');
        $method->setAccessible(true);

        $response = $method->invoke($middleware, Request::create('/int/v1/me', 'GET'));

        $this->assertInstanceOf(JsonResponse::class, $response);
        $this->assertSame(400, $response->getStatusCode());
        $this->assertSame(['errors' => ['Unauthenticated.']], $response->getData(true));
    }
}
