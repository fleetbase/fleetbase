<?php

namespace Fleetbase\Observers;

use Spatie\ResponseCache\Facades\ResponseCache;

class HttpCacheObserver
{
    /**
     * Listen to the entity created event.
     *
     * @return void
     */
    public function created()
    {
        ResponseCache::clear();
    }

    /**
     * Listen to the entity updated event.
     *
     * @return void
     */
    public function updated()
    {
        ResponseCache::clear();
    }

    /**
     * Listen to the entity deleted event.
     *
     * @return void
     */
    public function deleted()
    {
        ResponseCache::clear();
    }
}
