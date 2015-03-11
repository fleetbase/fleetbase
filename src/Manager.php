<?php
namespace Aloha\Twilio;

use InvalidArgumentException;
use Services_Twilio_Rest_Message;
use Services_Twilio_Twiml;

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
    public function __construct($default, array $settings)
    {
        $this->default = $default;
        $this->settings = $settings;
    }

    /**
     * @param string $connection
     *
     * @return \Aloha\Twilio\TwilioInterface
     */
    public function from($connection)
    {
        if (!isset($this->settings[$connection])) {
            throw new InvalidArgumentException("Connection \"$connection\" is not configured.");
        }

        $settings = $this->settings[$connection];

        if (isset($settings['ssl_verify'])) {
            return new Twilio($settings['token'], $settings['from'], $settings['sid'], $settings['ssl_verify']);
        }

        // Let the Twilio constructor decide the default value for ssl_verify
        return new Twilio($settings['token'], $settings['from'], $settings['sid']);
    }

    /**
     * @param string $to
     * @param string $message
     * @param string $from
     *
     * @return \Services_Twilio_Rest_Message
     */
    public function message($to, $message, $from = null)
    {
        $this->defaultConnection()->message($to, $message, $from);
    }

    /**
     * @param string          $to
     * @param string|callable $message
     * @param array           $options
     * @param string          $from
     *
     * @return \Services_Twilio_Rest_Call
     */
    public function call($to, $message, array $options = array(), $from = null)
    {
        $this->defaultConnection()->call($to, $message, $options, $from);
    }

    /**
     * @param callable $callback
     *
     * @return \Services_Twilio_Twiml
     */
    public function twiml($callback)
    {
        return $this->defaultConnection()->twiml($callback);
    }

    /**
     * @return \Aloha\Twilio\TwilioInterface
     */
    public function defaultConnection()
    {
        return $this->from($this->default);
    }
}
