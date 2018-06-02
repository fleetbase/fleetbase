<?php
namespace Aloha\Twilio;

interface TwilioInterface
{
    /**
     * @param string $to
     * @param string $message
     *
     * @return \Twilio\Rest\Api\V2010\Account\MessageInstance
     */
    public function message($to, $message);

    /**
     * @param string $to
     * @param string|callable $message
     *
     * @return \Twilio\Rest\Api\V2010\Account\CallInstance
     */
    public function call($to, $message);
}
