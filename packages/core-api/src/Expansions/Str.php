<?php

namespace Fleetbase\Expansions;

use Fleetbase\Build\Expansion;

class Str implements Expansion
{
    /**
     * Get the target class to expand.
     *
     * @return string|Class
     */
    public static function target()
    {
        return \Illuminate\Support\Str::class;
    }

    public function humanize()
    {
        return function (?string $string, bool $uppercase = true) {
            if (!is_string($string)) {
                return '';
            }

            $forbidden = [];
            $uppercase = ['api', 'vat', 'id', 'sku', 'usa', 'faq', '3pl'];

            $humanized = trim(strtolower((string) preg_replace(['/([A-Z])/', sprintf('/[%s\s]+/', '-'), sprintf('/[%s\s]+/', '_')], ['_$1', ' ', ' '], $string)));
            $humanized = trim(str_replace($forbidden, '', $humanized));
            $humanized = trim(
                str_replace(
                    $uppercase,
                    array_map(
                        function ($w) {
                            return strtoupper($w);
                        },
                        $uppercase
                    ),
                    $humanized
                )
            );

            return $uppercase ? ucfirst($humanized) : $humanized;
        };
    }

    public function domain()
    {
        return function (string $url) {
            $parsedUrl = parse_url($url);
            $host      = explode('.', $parsedUrl['host']);
            $domain    = $host[count($host) - 2] . '.' . $host[count($host) - 1];

            return $domain;
        };
    }
}
