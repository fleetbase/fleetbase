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
     * @param string $message
     * @param array $mediaUrls
     * @param string $from
     *
     * @return \Services_Twilio_Rest_Message
     */
    public function messageWithMedia($to, $message, array $mediaUrls = null, $from = null);

    /**
     * @param string $to
     * @param string|callable $message
     * @param array $options
     * @param string $from
     *
     * @return \Services_Twilio_Rest_Call
     */
    public function call($to, $message, array $options = [], $from = null);
}
