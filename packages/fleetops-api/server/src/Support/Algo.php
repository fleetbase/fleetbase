<?php

namespace Fleetbase\FleetOps\Support;

use Webit\Util\EvalMath\EvalMath;

class Algo
{
    /**
     * Execute an algorithm strig.
     *
     * @return int
     */
    public static function exec($algorithm, $variables = [], $round = false)
    {
        $m                  = new EvalMath();
        $m->suppress_errors = true;

        foreach ($variables as $key => $value) {
            $algorithm = str_replace('{' . $key . '}', $value, $algorithm);
        }

        $result = $m->evaluate($algorithm);

        if ($round) {
            return round($result, 2); // precision 2 cuz most likely dealing with $
        }

        return $result;
    }
}
