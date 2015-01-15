<?php
namespace Aloha\Twilio;

class Twilio
{
    private $config;

    public function __construct($config)
    {
        $this->config = $config;
    }

    public function message($to, $message, $from=null)
    {
        $twilio = $this->getTwilio();
        // Send SMS via Twilio SDK
        return $twilio->account->messages->sendMessage(
            is_null($from) ? $this->config['from'] : $from,
            $to,
            $message
        );
    }

    public function call($to, $url, $options=array(), $from=null)
    {
        $twilio = $this->getTwilio();
        // Create Call via Twilio SDK
        return $twilio->account->calls->create(
            is_null($from) ? $this->config['from'] : $from,
            $to,
            $url,
            $options);
    }

    public function twiml($callback)
    {
        $message = new \Services_Twilio_Twiml();

        if ($callback instanceof \Closure) {
            call_user_func($callback, $message);
        } else {
            throw new \InvalidArgumentException("Callback is not valid.");
        }

        return $message->__toString();
    }

    private function getTwilio()
    {
        return new \Services_Twilio($this->config['sid'], $this->config['token']);
    }
}
