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
     * @return Twilio
     */
    public function from($connection)
    {
        if (!isset($this->settings[$connection])) {
            throw new InvalidArgumentException("Connection \"$connection\" is not configured.");
        }

        return new Twilio($this->settings[$connection]);
    }

    /**
     * @param string $to
     * @param string $message
     * @param string $from
     *
     * @return Services_Twilio_Rest_Message
     */
    public function message($to, $message, $from = null)
    {
        $this->defaultConnection()->message($to, $message, $from);
    }

    /**
     * @param string $to
     * @param string $url
     * @param array  $options
     * @param string $from
     *
     * @return mixed
     */
    public function call($to, $url, $options = array(), $from = null)
    {
        $this->defaultConnection()->call($to, $url, $options, $from);
    }

    /**
     * @param callable $callback
     *
     * @return Services_Twilio_Twiml
     */
    public function twiml($callback)
    {
        $this->defaultConnection()->twiml($callback);
    }

    /**
     * @return Twilio
     */
    protected function defaultConnection()
    {
        return $this->from($this->default);
    }
}