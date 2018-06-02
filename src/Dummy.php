<?php
namespace Aloha\Twilio;

class Dummy implements TwilioInterface
{
    /**
     * @param string $to
     * @param string $message
     *
     * @return \Twilio\Rest\Api\V2010\Account\MessageInstance|void
     */
    public function message($to, $message)
    {
    }

    /**
     * @param string $to
     * @param string|callable $message
     *
     * @return \Twilio\Rest\Api\V2010\Account\CallInstance|void
     */
    public function call($to, $message)
    {
    }
}
