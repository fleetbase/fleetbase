<?php
namespace Aloha\Twilio;

use InvalidArgumentException;
use Services_Twilio;
use Services_Twilio_Twiml;

class Twilio {

    /**
     * @var string
     */
    protected $token;

    /**
     * @var string
     */
    protected $from;

    /**
     * @var string
     */
    protected $sid;

    /**
     * @param string $token
     * @param string $from
     * @param string $sid
     */
    public function __construct($token, $from, $sid)
    {
        $this->token = $token;
        $this->from = $from;
        $this->sid = $sid;
    }

    /**
     * @param string $to
     * @param string $message
     * @param string $from
     */
    public function message($to, $message, $from = null)
    {
        $twilio = $this->getTwilio();

        return $twilio->account->messages->sendMessage($from ?: $this->from, $to, $message);
    }

    /**
     * @param string $to
     * @param string $url
     * @param array $options
     * @param string $from
     */
    public function call($to, $url, array $options = array(), $from = null)
    {
        $twilio = $this->getTwilio();

        return $twilio->account->calls->create($from ?: $this->from, $to, $url, $options);
    }

    /**
     * @param callable $callback
     *
     * @return string
     */
    public function twiml($callback)
    {
        $message = new Services_Twilio_Twiml();

        if (is_callable($callback)) {
            call_user_func($callback, $message);
        } else {
            throw new InvalidArgumentException('Callback is not valid.');
        }

        return (string) $message;
    }

    /**
     * @return Services_Twilio
     */
    private function getTwilio()
    {
        return new Services_Twilio($this->sid, $this->token);
    }
}
