<?php

namespace Aloha\Twilio;

use Twilio\Exceptions\ConfigurationException;
use Twilio\Rest\Api;
use Twilio\Rest\Api\V2010;
use Twilio\Rest\Api\V2010\Account\CallInstance;
use Twilio\Rest\Api\V2010\Account\MessageInstance;
use Twilio\Rest\Client;

class Dummy implements TwilioInterface
{
    /**
     * @param string $to
     * @param string $message
     * @param array $mediaUrls
     * @param array $params
     *
     * @throws ConfigurationException
     *
     * @return MessageInstance
     */
    public function message(string $to, string $message, array $mediaUrls = [], array $params = []): MessageInstance
    {
        return new MessageInstance(new V2010(new Api(new Client('nonsense', 'nonsense'))), [], '');
    }

    /**
     * @param string $to
     * @param callable|string $message
     * @param array $params
     *
     * @throws ConfigurationException
     *
     * @return CallInstance
     */
    public function call(string $to, $message, array $params = []): CallInstance
    {
        return new CallInstance(new V2010(new Api(new Client('nonsense', 'nonsense'))), [], '');
    }
}
