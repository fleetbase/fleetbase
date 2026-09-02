<?php

namespace Tests\Unit\Http\Middleware;

use App\Http\Middleware\RedirectIfAuthenticated;
use App\Providers\RouteServiceProvider;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Mockery;
use Tests\TestCase;

/**
 * Covers the `guest` middleware alias registered in App\Http\Kernel.
 *
 * The guard is faked rather than driven through a real session so the test
 * stays a unit test: what matters here is which branch the middleware takes
 * for a checked/unchecked guard, not how the guard reaches its answer.
 */
class RedirectIfAuthenticatedTest extends TestCase
{
    private function guardReturning(bool $check): void
    {
        $guard = Mockery::mock();
        $guard->shouldReceive('check')->andReturn($check);

        Auth::shouldReceive('guard')->andReturn($guard);
    }

    public function test_passes_the_request_to_the_next_handler_when_no_guard_is_authenticated(): void
    {
        $this->guardReturning(false);

        $response = (new RedirectIfAuthenticated())->handle(
            Request::create('/login', 'GET'),
            fn () => new Response('next reached')
        );

        $this->assertSame('next reached', $response->getContent());
    }

    public function test_redirects_home_when_a_guard_reports_the_request_as_authenticated(): void
    {
        $this->guardReturning(true);

        $response = (new RedirectIfAuthenticated())->handle(
            Request::create('/login', 'GET'),
            fn () => new Response('next reached')
        );

        $this->assertInstanceOf(RedirectResponse::class, $response);
        $this->assertSame(url(RouteServiceProvider::HOME), $response->getTargetUrl());
    }

    public function test_honors_explicitly_named_guards_instead_of_the_default(): void
    {
        $guard = Mockery::mock();
        $guard->shouldReceive('check')->andReturn(true);

        // The non-empty branch of `empty($guards) ? [null] : $guards`.
        Auth::shouldReceive('guard')->with('sanctum')->andReturn($guard);

        $response = (new RedirectIfAuthenticated())->handle(
            Request::create('/login', 'GET'),
            fn () => new Response('next reached'),
            'sanctum'
        );

        $this->assertInstanceOf(RedirectResponse::class, $response);
    }
}
