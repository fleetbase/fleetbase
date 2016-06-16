<?php
namespace Aloha\Twilio;

use Psr\Log\LoggerInterface;

class LoggingDecorator implements TwilioInterface
{
    /**
     * @var \Psr\Log\LoggerInterface
     */
    private $logger;

    /**
     * @var \Aloha\Twilio\TwilioInterface
     */
    private $wrapped;

    /**
     * @param \Psr\Log\LoggerInterface $logger
     * @param \Aloha\Twilio\TwilioInterface $wrapped
     */
    public function __construct(LoggerInterface $logger, TwilioInterface $wrapped)
    {
        $this->logger = $logger;
        $this->wrapped = $wrapped;
    }

    /**
     * @param string $to
     * @param string $message
     *
     * @return \Services_Twilio_Rest_Message
     */
    public function message($to, $message)
    {
        $this->logger->info(sprintf('Sending a message ["%s"] to %s', $message, $to));

        return call_user_func_array([$this->wrapped, 'message'], func_get_args());
    }

    /**
     * @param string $to
     * @param string|callable $message
     *
     * @return \Services_Twilio_Rest_Call
     */
    public function call($to, $message)
    {
        $this->logger->info(sprintf('Calling %s', $to));

        return call_user_func_array([$this->wrapped, 'call'], func_get_args());
    }
}
