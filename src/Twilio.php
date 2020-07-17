<?php

namespace Aloha\Twilio;

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
     * @var \Twilio\Rest\Client
     */
    protected $twilio;

    /**
     * @param string $token
     * @param string $from
     * @param string $sid
     * @param bool $sslVerify
     */
    public function __construct($sid, $token, $from, $sslVerify = true)
    {
        $this->sid = $sid;
        $this->token = $token;
        $this->from = $from;
        $this->sslVerify = $sslVerify;
    }

    /**
     * @param string $to
     * @param string $message
     * @param null|array $mediaUrls
     * @param array $params
     *
     * @see https://www.twilio.com/docs/api/messaging/send-messages Documentation
     *
     * @return \Twilio\Rest\Api\V2010\Account\MessageInstance
     */
    public function message($to, $message, $mediaUrls = null, array $params = [])
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
     * @see https://www.twilio.com/docs/api/voice/making-calls Documentation
     *
     * @return \Twilio\Rest\Api\V2010\Account\CallInstance
     */
    public function call($to, $message, array $params = [])
    {
        if ($message instanceof TwiML) {
            $params['twiml'] = $message->__toString();
        } elseif (is_callable($message)) {
            $params['twiml'] = $this->twiml($message);
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
     * @return \Twilio\Rest\Client
     */
    public function getTwilio()
    {
        if ($this->twilio) {
            return $this->twilio;
        }

        return $this->twilio = new Client($this->sid, $this->token);
    }

    /**
     * @param callable $callback
     *
     * @return string
     */
    private function twiml(callable $callback)
    {
        $message = new VoiceResponse();

        call_user_func($callback, $message);

        return (string) $message;
    }
}
