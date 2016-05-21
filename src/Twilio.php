<?php
namespace Aloha\Twilio;

use InvalidArgumentException;
use Services_Twilio;
use Services_Twilio_TinyHttp;
use Services_Twilio_Twiml;

class Twilio implements TwilioInterface
{
    /**
     * @var string
     */
    protected $token;

    /**
     * @var string
     */
    protected $from;

    /**
     * @var string
     */
    protected $sid;

    /**
     * @var bool
     */
    protected $sslVerify;
    
    /**
     * @var \Services_Twilio
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
     * @param string $from
     *
     * @return \Services_Twilio_Rest_Message
     */
    public function message($to, $message, $from = null)
    {
        $twilio = $this->getTwilio();

        return $twilio->account->messages->sendMessage($from ?: $this->from, $to, $message);
    }

    /**
     * @param string $to
     * @param string $message
     * @param array $mediaUrls
     * @param string $from
     *
     * @return \Services_Twilio_Rest_Message
     */
    public function messageWithMedia($to, $message, array $mediaUrls = null, $from = null)
    {
        $twilio = $this->getTwilio();

        return $twilio->account->messages->sendMessage($from ?: $this->from, $to, $message, $mediaUrls);
    }

    /**
     * @param string $to
     * @param string|callable $message
     * @param array $options
     * @param string $from
     *
     * @return \Services_Twilio_Rest_Call
     */
    public function call($to, $message, array $options = [], $from = null)
    {
        $twilio = $this->getTwilio();

        if (is_callable($message)) {
            $query = http_build_query([
                'Twiml' => $this->twiml($message),
            ]);

            $message = 'https://twimlets.com/echo?'.$query;
        }

        return $twilio->account->calls->create($from ?: $this->from, $to, $message, $options);
    }

    /**
     * @return \Services_Twilio
     */
    public function getTwilio()
    {
        if ($this->twilio) {
            return $this->twilio;
        }
        
        if (!$this->sslVerify) {
            $http = new Services_Twilio_TinyHttp(
                'https://api.twilio.com',
                [
                    'curlopts' => [
                        CURLOPT_SSL_VERIFYPEER => false,
                        CURLOPT_SSL_VERIFYHOST => 2,
                    ],
                ]
            );
        }
        
        $this->twilio = new Services_Twilio($this->sid, $this->token, null, isset($http) ? $http : null);

        return $this->twilio;
    }

    /**
     * @param callable $callback
     *
     * @return string
     */
    private function twiml(callable $callback)
    {
        $message = new Services_Twilio_Twiml();

        if (!is_callable($callback)) {
            throw new InvalidArgumentException('Callback is not valid.');
        }

        call_user_func($callback, $message);

        return (string) $message;
    }
}
