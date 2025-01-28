<?php

namespace Fleetbase\Webhook\Exceptions;

use Fleetbase\Webhook\Signer\Signer;

class InvalidSigner extends \Exception
{
    public static function doesNotImplementSigner(string $invalidClassName): self
    {
        $signerInterface = Signer::class;

        return new static("`{$invalidClassName}` is not a valid signer class because it does not implement `$signerInterface`");
    }
}
