<?php

namespace Aloha\Twilio;

use Twilio\Exceptions\ConfigurationException;
use Twilio\Exceptions\TwilioException;
use Twilio\Rest\Api\V2010\Account\CallInstance;
use Twilio\Rest\Api\V2010\Account\MessageInstance;
use Twilio\Rest\Client;
use Twilio\TwiML\TwiML;
use Twilio\TwiML\VoiceResponse;

class Twilio implements TwilioInterface
{
    /**
     * @var string
     */
    protected $sid;

    /**
     * @var string
     */
    protected $token;

    /**
     * @var string
     */
    protected $from;

    /**
     * @var bool
     */
    protected $sslVerify;

    /**
     * @var Client
     */
    protected $twilio;

    /**
     * @param string $token
     * @param string $from
     * @param string $sid
     * @param bool $sslVerify
     */
    public function __construct(string $sid, string $token, string $from, bool $sslVerify = true)
    {
        $this->sid = $sid;
        $this->token = $token;
        $this->from = $from;
        $this->sslVerify = $sslVerify;
    }

    /**
     * @param string $to
     * @param string $message
     * @param array $mediaUrls
     * @param array $params
     *
     * @see https://www.twilio.com/docs/api/messaging/send-messages Documentation
     *
     * @throws ConfigurationException
     * @throws TwilioException
     *
     * @return MessageInstance
     */
    public function message(string $to, string $message, array $mediaUrls = [], array $params = []): MessageInstance
    {
        $params['body'] = $message;

        if (!isset($params['from'])) {
            $params['from'] = $this->from;
        }

        if (!empty($mediaUrls)) {
            $params['mediaUrl'] = $mediaUrls;
        }

        return $this->getTwilio()->messages->create($to, $params);
    }

    /**
     * @param string $to
     * @param callable|string|TwiML $message
     * @param array $params
     *
     * @throws TwilioException
     *
     * @see https://www.twilio.com/docs/api/voice/making-calls Documentation
     *
     * @return CallInstance
     */
    public function call(string $to, $message, array $params = []): CallInstance
    {
        if (is_callable($message)) {
            $message = $this->twiml($message);
        }

        if ($message instanceof TwiML) {
            $params['twiml'] = (string) $message;
        } else {
            $params['url'] = $message;
        }

        return $this->getTwilio()->calls->create(
            $to,
            $this->from,
            $params
        );
    }

    /**
     * @throws ConfigurationException
     *
     * @return Client
     */
    public function getTwilio(): Client
    {
        if ($this->twilio) {
            return $this->twilio;
        }

        return $this->twilio = new Client($this->sid, $this->token);
    }

    /**
     * @param callable $callback
     *
     * @return TwiML
     */
    private function twiml(callable $callback): TwiML
    {
        $message = new VoiceResponse();

        call_user_func($callback, $message);

        return $message;
    }
}
