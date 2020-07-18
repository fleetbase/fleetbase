<?php

namespace Aloha\Twilio;

use Twilio\Rest\Api\V2010\Account\CallInstance;
use Twilio\Rest\Api\V2010\Account\MessageInstance;
use Twilio\TwiML\TwiML;

interface TwilioInterface
{
    /**
     * @param string $to
     * @param string $message
     * @param array $mediaUrls
     * @param array $params
     *
     * @return MessageInstance
     */
    public function message(string $to, string $message, array $mediaUrls = [], array $params = []): MessageInstance;

    /**
     * @param string $to
     * @param callable|string|TwiML $message
     * @param array $params
     *
     * @return CallInstance
     */
    public function call(string $to, $message, array $params): CallInstance;
}
