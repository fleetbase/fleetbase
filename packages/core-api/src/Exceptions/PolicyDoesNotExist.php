<?php

namespace Fleetbase\Exceptions;

class PolicyDoesNotExist extends \InvalidArgumentException
{
    public static function named(string $policyName)
    {
        return new static("There is no policy named `{$policyName}`.");
    }

    public static function withId(int $policyId)
    {
        return new static("There is no policy with id `{$policyId}`.");
    }
}
