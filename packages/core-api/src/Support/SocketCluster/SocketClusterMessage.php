<?php

namespace Fleetbase\Support\SocketCluster;

use Illuminate\Broadcasting\Channel;
use WebSocket\Message\Message;

/**
 * Class SocketClusterMessage.
 *
 * Represents a message to be sent to a SocketCluster server.
 */
class SocketClusterMessage extends Message
{
    /**
     * The opcode for the message.
     *
     * @var string
     */
    protected $opcode = 'text';

    /**
     * The event name for publishing messages.
     */
    public const PUBLISH_EVENT = '#publish';

    /**
     * The event name for publishing messages.
     */
    public const HANDSHAKE_EVENT = '#handshake';

    /**
     * The channel name to send the message to.
     */
    public string $channel;

    /**
     * The data to be sent in the message.
     */
    public array $data;

    /**
     * The socketcluster cid.
     */
    public int $cid;

    /**
     * Create a new SocketCluster message instance.
     *
     * @param string|Channel $channel the channel name to send the message to
     * @param array          $data    the data to be sent in the message
     * @param int            $cid     the socketcluster cid to use
     */
    public function __construct(string $channel, array $data = [], int $cid = 1)
    {
        $this->cid = $cid;

        if ($channel === '#handshake') {
            $this->payload = static::createSocketClusterHandshake($cid);
        } else {
            $this->channel = $channel;
            $this->data    = $data;
            $this->payload = static::createSocketClusterPayload($data, $channel, $cid);
        }

        $this->timestamp = new \DateTime();
    }

    public static function createSocketClusterHandshake(int $cid = 1)
    {
        return static::createSocketClusterPayload([], null, $cid, self::HANDSHAKE_EVENT);
    }

    /**
     * Create a SocketCluster payload.
     *
     * @param array          $data    the data to be sent in the message
     * @param string|Channel $channel the channel name or Channel instance to send the message to
     *
     * @return string the created payload as a JSON string
     */
    public static function createSocketClusterPayload(array $data = [], $channel, int $cid = 1, $event = self::PUBLISH_EVENT)
    {
        if ($channel instanceof Channel) {
            $channel = $channel->__toString();
        }

        $eventData = [];

        if ($event === self::PUBLISH_EVENT) {
            if (!empty($channel)) {
                $eventData['channel'] = $channel;
            }

            $eventData['data'] = $data;
        }

        $eventObject = [
            'event' => $event,
            'data'  => $eventData,
            'cid'   => $cid,
        ];

        return (string) @json_encode($eventObject);
    }

    /**
     * Create a new SocketCluster message instance.
     *
     * @param string|Channel $channel the channel name or Channel instance to send the message to
     * @param mixed          $data    the data to be sent in the message
     *
     * @return Message the created message object
     */
    public static function create($channel, $data): Message
    {
        $payload = static::createSocketClusterPayload($data, $channel);

        return new Message('text', $payload);
    }
}
