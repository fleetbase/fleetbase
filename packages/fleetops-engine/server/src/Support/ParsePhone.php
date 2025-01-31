<?php

namespace Fleetbase\FleetOps\Support;

use Fleetbase\FleetOps\Models\Contact;
use Fleetbase\FleetOps\Models\Place;
use Fleetbase\Support\ParsePhone as ParsePhoneUtil;
use libphonenumber\PhoneNumberFormat;

class ParsePhone extends ParsePhoneUtil
{
    public static function fromContact(Contact $contact, $options = [], $format = PhoneNumberFormat::E164)
    {
        return static::fromModel($contact, $options, $format);
    }

    public static function fromPlace(Place $place, $options = [], $format = PhoneNumberFormat::E164)
    {
        return static::fromModel($place, $options, $format);
    }
}
