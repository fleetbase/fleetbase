<?php

namespace Fleetbase\FleetOps\Http\Middleware;

use Fleetbase\FleetOps\Models\Driver;
use Fleetbase\Models\User;

class SetupDriverSession
{
    /**
     * Handle an incoming request.
     *
     * @param \Illuminate\Http\Request $request
     */
    public function handle($request, \Closure $next)
    {
        $user = $request->user();

        if ($this->isDriver($user)) {
            $this->storeDriverInSession($user->driver->uuid);
        }

        return $next($request);
    }

    /**
     * Determine if the authenticated user is a driver.
     *
     * @param User|null $user
     */
    protected function isDriver($user): bool
    {
        if ($user instanceof User) {
            $user->load('driver');

            return $user->driver instanceof Driver;
        }

        return false;
    }

    /**
     * Store the driver's UUID in the session.
     */
    protected function storeDriverInSession(string $driverUuid): void
    {
        session()->put('driver', $driverUuid);
    }
}
