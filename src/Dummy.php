<?php
namespace Aloha\Twilio;

class Dummy implements TwilioInterface
{
    /**
     * @param string $to
     * @param string $message
     *
     * @return \Services_Twilio_Rest_Call|void
     */
    public function message($to, $message)
    {
    }

    /**
     * @param string $to
     * @param string|callable $message
     *
     * @return \Services_Twilio_Rest_Call|void
     */
    public function call($to, $message)
    {
    }
}
