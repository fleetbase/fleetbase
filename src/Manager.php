<?php

namespace Aloha\Twilio;

use InvalidArgumentException;
use Twilio\Rest\Api\V2010\Account\CallInstance;
use Twilio\Rest\Api\V2010\Account\MessageInstance;
use Twilio\TwiML\TwiML;

class Manager implements TwilioInterface
{
    /**
     * @var string
     */
    protected $default;

    /**
     * @var array
     */
    protected $settings;

    /**
     * @param string $default
     * @param array $settings
     */
    public function __construct(string $default, array $settings)
    {
        $this->default = $default;
        $this->settings = $settings;
    }

    /**
     * @param string $method
     * @param array $arguments
     *
     * @return mixed
     */
    public function __call(string $method, array $arguments)
    {
        return call_user_func_array([$this->defaultConnection(), $method], $arguments);
    }

    /**
     * @param string $connection
     *
     * @return TwilioInterface
     */
    public function from(string $connection): TwilioInterface
    {
        if (!isset($this->settings[$connection])) {
            throw new InvalidArgumentException("Connection \"{$connection}\" is not configured.");
        }

        $settings = $this->settings[$connection];

        return new Twilio($settings['sid'], $settings['token'], $settings['from']);
    }

    /**
     * @param string $to
     * @param string $message
     * @param array $mediaUrls
     * @param array $params
     *
     * @return MessageInstance
     */
    public function message(string $to, string $message, array $mediaUrls = [], array $params = []): MessageInstance
    {
        return $this->defaultConnection()->message($to, $message, $mediaUrls, $params);
    }

    /**
     * @param string $to
     * @param callable|string|TwiML $message
     * @param array $params
     *
     * @return CallInstance
     */
    public function call(string $to, $message, array $params = []): CallInstance
    {
        return $this->defaultConnection()->call($to, $message, $params);
    }

    /**
     * @return TwilioInterface
     */
    public function defaultConnection(): TwilioInterface
    {
        return $this->from($this->default);
    }
}
