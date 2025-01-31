<?php

namespace Fleetbase\FleetOps\Support\Encoding;

/**
 * Polyline.
 *
 * PHP Version 5.3
 *
 * A simple class to handle polyline-encoding for Google Maps
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * @category  Mapping
 *
 * @author    E. McConville <emcconville@emcconville.com>
 * @copyright 2009-2015 E. McConville
 * @license   http://www.gnu.org/licenses/lgpl.html LGPL v3
 *
 * @version   GIT: $Id$
 *
 * @see      https://github.com/emcconville/google-map-polyline-encoding-tool
 */

/**
 * Polyline encoding & decoding class.
 *
 * Convert list of points to encoded string following Google's Polyline
 * Algorithm.
 *
 * @category Mapping
 *
 * @author   E. McConville <emcconville@emcconville.com>
 * @license  http://www.gnu.org/licenses/lgpl.html LGPL v3
 *
 * @see     https://github.com/emcconville/google-map-polyline-encoding-tool
 */
class Polyline
{
    /**
     * Default precision level of 1e-5.
     *
     * Overwrite this property in extended class to adjust precision of numbers.
     * !!!CAUTION!!!
     * 1) Adjusting this value will not guarantee that third party
     *    libraries will understand the change.
     * 2) Float point arithmetic IS NOT real number arithmetic. PHP's internal
     *    float precision may contribute to undesired rounding.
     *
     * @var int
     */
    protected static $precision = 5;

    /**
     * Apply Google Polyline algorithm to list of points.
     *
     * @param array $points List of points to encode. Can be a list of tuples,
     *                      or a flat, one-dimensional array.
     *
     * @return string encoded string
     */
    final public static function encode($points)
    {
        $points        = self::flatten($points);
        $encodedString = '';
        $index         = 0;
        $previous      = [0, 0];
        foreach ($points as $number) {
            $number               = (float) $number;
            $number               = (int) round($number * pow(10, static::$precision));
            $diff                 = $number - $previous[$index % 2];
            $previous[$index % 2] = $number;
            $number               = $diff;
            $index++;
            $number = ($number < 0) ? ~($number << 1) : ($number << 1);
            $chunk  = '';
            while ($number >= 0x20) {
                $chunk .= chr((0x20 | ($number & 0x1F)) + 63);
                $number >>= 5;
            }
            $chunk .= chr($number + 63);
            $encodedString .= $chunk;
        }

        return $encodedString;
    }

    /**
     * Reverse Google Polyline algorithm on encoded string.
     *
     * @param string $string encoded string to extract points from
     *
     * @return array points
     */
    public static function decode(string $string): array
    {
        $points   = [];
        $index    = $i = 0;
        $previous = [0, 0];
        $lat      = $lng = 0;
        while ($i < strlen($string)) {
            $shift = $result = 0x00;
            do {
                $bit = ord($string[$i++] ?? '') - 63; // Using nullsafe operator
                $result |= ($bit & 0x1F) << $shift;
                $shift += 5;
            } while ($bit >= 0x20);

            $diff                 = ($result & 1) ? ~($result >> 1) : ($result >> 1);
            $number               = $previous[$index % 2] + $diff;
            $previous[$index % 2] = $number;

            if ($index % 2 == 0) {
                $lng = $number * 1 / (10 ** static::$precision); // Using ** operator for pow
            } else {
                $lat      = $number * 1 / (10 ** static::$precision);
                $points[] = new \Fleetbase\LaravelMysqlSpatial\Types\Point($lat, $lng); // Create Point object and add to the array
            }

            $index++;
        }

        return $points;
    }

    /**
     * Reduce multi-dimensional to single list.
     *
     * @param array $array subject array to flatten
     *
     * @return array flattened
     */
    final public static function flatten($array)
    {
        $flatten = [];
        array_walk_recursive(
            $array, // @codeCoverageIgnore
            function ($current) use (&$flatten) {
                $flatten[] = $current;
            }
        );

        return $flatten;
    }

    /**
     * Concat list into pairs of points.
     *
     * @param array $list one-dimensional array to segment into list of tuples
     *
     * @return array pairs
     */
    final public static function pair($list)
    {
        return is_array($list) ? array_chunk($list, 2) : [];
    }
}
