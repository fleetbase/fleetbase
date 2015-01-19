<?php
namespace Aloha\Twilio;

interface TwilioInterface
{
    /**
     * @param string $to
     * @param string $message
     * @param string $from
     *
     * @return \Services_Twilio_Rest_Message
     */
    public function message($to, $message, $from = null);

    /**
     * @param string $to
     * @param string $url
     * @param array $options
     * @param string $from
     *
     * @return \Services_Twilio_Rest_Call
     */
    public function call($to, $url, array $options = array(), $from = null);

    /**
     * @param callable $callback
     *
     * @return \Services_Twilio_Twiml
     */
    public function twiml($callback);
}