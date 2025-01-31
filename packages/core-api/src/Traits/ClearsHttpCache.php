<?php

namespace Fleetbase\Traits;

use Fleetbase\Observers\HttpCacheObserver;

trait ClearsHttpCache
{
    /**
     * Add observer to clear https cache after updates and creations/ deletions.
     *
     * @return void
     */
    public static function bootClearsHttpCache()
    {
        static::observe(new HttpCacheObserver());
    }
}
