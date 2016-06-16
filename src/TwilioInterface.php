<?php
namespace Aloha\Twilio;

interface TwilioInterface
{
    /**
     * @param string $to
     * @param string $message
     *
     * @return \Services_Twilio_Rest_Message
     */
    public function message($to, $message);

    /**
     * @param string $to
     * @param string|callable $message
     *
     * @return \Services_Twilio_Rest_Call
     */
    public function call($to, $message);
}
