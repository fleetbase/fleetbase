<?php
namespace Aloha\Twilio;

use Services_Twilio;
use Services_Twilio_TinyHttp;
use Services_Twilio_Twiml;

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
     *
     * @return \Services_Twilio_Rest_Message
     */
    public function message($to, $message)
    {
        $twilio = $this->getTwilio();

        return $twilio->account->messages->sendMessage($this->from, $to, $message);
    }

    /**
     * @param string $to
     * @param string|callable $message
     *
     * @return \Services_Twilio_Rest_Call
     */
    public function call($to, $message)
    {
        $twilio = $this->getTwilio();

        if (is_callable($message)) {
            $query = http_build_query([
                'Twiml' => $this->twiml($message),
            ]);

            $message = 'https://twimlets.com/echo?'.$query;
        }

        return $twilio->account->calls->create($this->from, $to, $message);
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

        return $this->twilio = new Services_Twilio($this->sid, $this->token, null, isset($http) ? $http : null);
    }

    /**
     * @param callable $callback
     *
     * @return string
     */
    private function twiml(callable $callback)
    {
        $message = new Services_Twilio_Twiml();

        call_user_func($callback, $message);

        return (string) $message;
    }
}
