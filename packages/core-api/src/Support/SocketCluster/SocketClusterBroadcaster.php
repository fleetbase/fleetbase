<?php

namespace Fleetbase\Support\SocketCluster;

use Illuminate\Contracts\Broadcasting\Broadcaster;

class SocketClusterBroadcaster implements Broadcaster
{
    /**
     * @var \Fleetbase\Suppoer\SocketCluster\SocketClusterService
     */
    protected SocketClusterService $socketcluster;

    /**
     * Construct.
     *
     * @param void
     */
    public function __construct(SocketClusterService $socketcluster)
    {
        $this->socketcluster = $socketcluster;
    }

    /**
     * Authenticate the incoming request for a given channel.
     *
     * @param \Illuminate\Http\Request $request
     */
    public function auth($request)
    {
    }

    /**
     * Return the valid authentication response.
     *
     * @param \Illuminate\Http\Request $request
     */
    public function validAuthenticationResponse($request, $result)
    {
    }

    /**
     * Broadcast.
     *
     * @param string $event
     *
     * @return void
     */
    public function broadcast(array $channels, $event, array $payload = [])
    {
        foreach ($channels as $channel) {
            $this->socketcluster->send($channel, $payload);
        }
    }
}
