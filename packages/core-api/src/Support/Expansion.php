<?php

namespace Fleetbase\Support;

use Fleetbase\Build\Expansion as ExpansionInterface;

class Expansion
{
    public static function isExpansion($target)
    {
        return $target instanceof ExpansionInterface;
    }

    public static function isExpandable($target)
    {
        return Utils::classExists($target) && in_array('Fleetbase\\Traits\\Expandable', class_uses($target));
    }

    public static function isMacroable($target)
    {
        return Utils::classExists($target) && in_array('Illuminate\Support\Traits\Macroable', class_uses($target));
    }
}
