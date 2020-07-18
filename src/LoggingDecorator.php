<?php

namespace Aloha\Twilio;

use Psr\Log\LoggerInterface;
use Twilio\Rest\Api\V2010\Account\CallInstance;
use Twilio\Rest\Api\V2010\Account\MessageInstance;

class LoggingDecorator implements TwilioInterface
{
    /**
     * @var LoggerInterface
     */
    private $logger;

    /**
     * @var TwilioInterface
     */
    private $wrapped;

    /**
     * @param LoggerInterface $logger
     * @param TwilioInterface $wrapped
     */
    public function __construct(LoggerInterface $logger, TwilioInterface $wrapped)
    {
        $this->logger = $logger;
        $this->wrapped = $wrapped;
    }

    /**
     * @param string $to
     * @param string $message
     * @param array $mediaUrls
     * @param array $params
     *
     * @return MessageInstance
     */
    public function message($to, $message, array $mediaUrls = [], array $params = []): MessageInstance
    {
        $this->logger->info(sprintf('Sending a message ["%s"] to %s', $message, $to));

        return $this->wrapped->message($to, $message, $mediaUrls, $params);
    }

    /**
     * @param string $to
     * @param callable|string $message
     * @param array $params
     *
     * @return CallInstance
     */
    public function call(string $to, $message, array $params = []): CallInstance
    {
        $this->logger->info(sprintf('Calling %s', $to));

        return $this->wrapped->call($to, $message, $params);
    }
}
