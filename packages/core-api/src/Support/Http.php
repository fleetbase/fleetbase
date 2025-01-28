<?php

namespace Fleetbase\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http as HttpClient;
use Illuminate\Support\Str;

class Http extends HttpClient
{
    public static function isInternalRequest(?Request $request = null): bool
    {
        $request = $request ?? request();
        $route   = $request->route();

        if ($route === null) {
            return false;
        }

        $action    = data_get($route, 'action');
        $namespace = data_get($action, 'namespace');

        return Str::contains($namespace, 'Internal') || Str::contains($route->uri(), '/int/');
    }

    public static function isPublicRequest(?Request $request = null): bool
    {
        return !static::isInternalRequest($request);
    }

    /**
     * Parses the sort request parameter and returns the sort param and direction of sort.
     */
    public static function useSort($sort): array
    {
        if ($sort instanceof Request) {
            $sort = $sort->input('sort');
        }

        if (is_array($sort)) {
            return $sort;
        }

        $param     = $sort;
        $direction = 'asc';

        if (Str::startsWith($sort, '-')) {
            $direction = Str::startsWith($sort, '-') ? 'desc' : 'asc';
            $param     = Str::startsWith($sort, '-') ? substr($sort, 1) : $sort;
        } else {
            $sd = explode(':', $sort);

            if ($sd && count($sd) > 0) {
                $direction = $sd[1] ?? $direction;
                $param     = $sd[0];
            } else {
                $param = $sort;
            }
        }

        return [$param, $direction];
    }

    public static function trace($key = null)
    {
        $response = HttpClient::get('https://www.cloudflare.com/cdn-cgi/trace');
        $body     = $response->body();
        $data     = array_values(explode("\n", $body));
        $trace    = [];

        foreach ($data as $datum) {
            $kv = explode('=', $datum);

            if (count($kv) < 2) {
                continue;
            }

            $trace[$kv[0]] = $kv[1];
        }

        if (is_string($key)) {
            return Utils::get($trace, $key);
        }

        return $trace;
    }

    public static function isPublicIp($ip = null)
    {
        $ip = $ip === null ? request()->ip() : $ip;

        return filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_IPV4 | FILTER_FLAG_IPV6 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        ) === $ip ? true : false;
    }

    public static function isPrivateIp($ip = null)
    {
        return !static::isPublicIp($ip);
    }

    /**
     * Looks up a user client info w/ api.
     *
     * @param string $ip
     *
     * @return stdClass
     */
    public static function lookupIp($ip = null)
    {
        if ($ip instanceof Request) {
            $ip = $ip->ip();
        }

        if ($ip === null) {
            $ip = request()->ip();
        }

        if (static::isPrivateIp($ip)) {
            $ip = static::trace('ip');
        }

        $ipInfoApiKey = config('fleetbase.services.ipinfo.api_key');
        $lookupUrl    = empty($ipInfoApiKey) ? 'https://json.geoiplookup.io/' . $ip : 'https://api.ipdata.co/' . $ip;
        $query        =  empty($ipInfoApiKey) ? [] : ['api-key' => config('fleetbase.services.ipinfo.api_key')];

        $response = HttpClient::get($lookupUrl, $query);

        if ($response->failed()) {
            throw new \Exception($response->json('message') ?? 'IP lookup failed.');
        }

        return $response->json();
    }

    public static function action(?string $verb = null)
    {
        $verb   = $verb ? $verb : (isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : null);
        $action = Str::lower($verb);

        switch ($verb) {
            case 'POST':
                $action = 'create';
                break;

            case 'GET':
                $action = 'query';
                break;

            case 'PUT':
            case 'PATCH':
                $action = 'update';
                break;

            case 'DELETE':
                $action = 'delete';
                break;
        }

        return $action;
    }
}
