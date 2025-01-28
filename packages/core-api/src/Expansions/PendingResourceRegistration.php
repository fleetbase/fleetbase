<?php

namespace Fleetbase\Expansions;

use Fleetbase\Build\Expansion;
use Illuminate\Routing\Router;

class PendingResourceRegistration implements Expansion
{
    public static function target()
    {
        return \Illuminate\Routing\PendingResourceRegistration::class;
    }

    public function setRouter()
    {
        return function (Router $router) {
            /* @var \Illuminate\Routing\PendingResourceRegistration $this */
            $this->router = $router;

            return $this;
        };
    }

    public function extend()
    {
        return function (?\Closure $callback = null) {
            /** @var \Illuminate\Routing\PendingResourceRegistration $this */
            if ($this->router instanceof Router && is_callable($callback)) {
                $callback($this->router);
            }

            return $this;
        };
    }
}
