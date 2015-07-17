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
     * @param string $from
     *
     * @return \Services_Twilio_Rest_Message
     */
    public function message($to, $message, $from = null)
    {
        $this->logger->info(sprintf('Sending a message ["%s"] to %s', $message, $to));

        return $this->wrapped->message($to, $message, $from);
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
        $this->logger->info(sprintf('Sending a media message ["%s"] to %s', $message, $to), $mediaUrls);

        return $this->wrapped->messageWithMedia($to, $message, $from);
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
        $this->logger->info(sprintf('Calling %s', $to), $options);

        return $this->wrapped->call($to, $message, $options, $from);
    }
}
