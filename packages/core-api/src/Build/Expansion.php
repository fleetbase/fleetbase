<?php

namespace Fleetbase\Build;

interface Expansion
{
    /**
     * Get the target class to expand.
     *
     * @return string|Class
     */
    public static function target();
}
