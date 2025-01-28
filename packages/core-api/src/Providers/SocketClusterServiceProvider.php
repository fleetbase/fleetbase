<?php

namespace Fleetbase\Providers;

use Fleetbase\Support\SocketCluster\SocketClusterBroadcaster;
use Fleetbase\Support\SocketCluster\SocketClusterService;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\ServiceProvider;

class SocketClusterServiceProvider extends ServiceProvider
{
    /**
     * Register new BroadcastManager in boot.
     *
     * @return void
     */
    public function boot()
    {
        Broadcast::extend('socketcluster', function ($broadcasting, $config) {
            return new SocketClusterBroadcaster(new SocketClusterService());
        });
    }
}
