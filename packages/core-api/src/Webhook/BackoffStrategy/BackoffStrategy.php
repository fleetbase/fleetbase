<?php

namespace Fleetbase\Webhook\BackoffStrategy;

interface BackoffStrategy
{
    public function waitInSecondsAfterAttempt(int $attempt): int;
}
