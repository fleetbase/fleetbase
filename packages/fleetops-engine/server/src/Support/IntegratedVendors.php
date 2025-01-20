<?php

namespace Fleetbase\FleetOps\Support;

use Fleetbase\FleetOps\Integrations\Lalamove\Lalamove;
use Fleetbase\FleetOps\Integrations\Lalamove\LalamoveMarket;
use Fleetbase\FleetOps\Integrations\Lalamove\LalamoveServiceType;
use Fleetbase\FleetOps\Models\IntegratedVendor;
use Illuminate\Support\Str;

class ResolvedIntegratedVendor
{
    private IntegratedVendor $vendor;

    public function __construct(array $config)
    {
        foreach ($config as $key => $value) {
            $this->{$key} = $value;
        }

        $this->logo = static::logo($config['code']);
    }

    public function __get(string $key)
    {
        $key = strtolower($key);

        if (isset($this->{$key})) {
            return $this->{$key};
        }

        return null;
    }

    public function __call(string $key, $arguments)
    {
        if (Str::startsWith($key, 'get')) {
            $property = strtolower(Str::replaceFirst('get', '', $key));

            if (isset($this->{$property})) {
                return $this->{$property};
            }
        }

        if (Str::startsWith($key, 'set')) {
            $property = strtolower(Str::replaceFirst('set', '', $key));

            $this->{$property} = $arguments[0];

            return $this;
        }

        return null;
    }

    public static function logo(string $code): string
    {
        return Utils::assetFromFleetbase('integrated-vendors/' . $code . '.png');
    }

    public function setIntegratedVendor(IntegratedVendor $vendor)
    {
        $this->vendor = $vendor;

        return $this;
    }

    public function getBridgeParams()
    {
        return $this->bridgeParams;
    }

    public function resolveBridgeParams()
    {
        $bridgeParams   = $this->getBridgeParams();
        $resolvedParams = $this->resolveIntegratedVendorParams($bridgeParams);

        return $resolvedParams;
    }

    public function resolveIntegratedVendorParams($params = [])
    {
        $resolvedParams = [];

        foreach ($params as $key => $path) {
            if (!$this->vendor || !Utils::isset($this->vendor, $path)) {
                continue;
            }

            if ($key === 'sandbox') {
                $resolvedParams[$key] = Utils::castBoolean(data_get($this->vendor, $path));
                continue;
            }

            $resolvedParams[$key] = data_get($this->vendor, $path);
        }

        return $resolvedParams;
    }

    public function getBridgeInstance()
    {
        if (!$this->bridge) {
            return null;
        }

        $params = $this->resolveBridgeParams();

        return app($this->bridge, $params);
    }

    public function getServiceBridgeInstance()
    {
        if (!$this->svc_bridge) {
            return null;
        }

        return app($this->svc_bridge);
    }

    public function getServiceTypes()
    {
        if ($this->svc_bridge) {
            return $this->svc_bridge::all();
        }

        return [];
    }

    public function geIso2ccBridgeInstance()
    {
        if (!$this->iso2cc_bridge) {
            return null;
        }

        return app($this->iso2cc_bridge);
    }

    public function getCountries()
    {
        if ($this->iso2cc_bridge) {
            return $this->iso2cc_bridge::codes();
        }

        return [];
    }

    public function getLogo()
    {
        return static::logo($this->code);
    }

    public function toArray()
    {
        return [
            'name'              => $this->name,
            'code'              => $this->code,
            'logo'              => $this->getLogo(),
            'host'              => $this->host,
            'sandbox'           => $this->sandbox,
            'namespace'         => $this->namespace,
            'credential_params' => $this->credentialParams,
            'option_params'     => $this->optionParams,
        ];
    }

    public function toJson()
    {
        return json_encode($this->toArray());
    }

    public function callback(?string $callback = null, ...$callbackParams)
    {
        if (!is_string($callback)) {
            return;
        }

        $callbacks = data_get($this->callbacks, $callback, []);
        $api       = $this->getBridgeInstance();

        if (is_array($callbacks)) {
            foreach ($callbacks as $callback => $params) {
                $resolvedParams = $this->resolveIntegratedVendorParams($params);
                $resolvedParams = array_filter(array_merge($callbackParams, $resolvedParams));

                if (method_exists($api, $callback)) {
                    $api->{$callback}(...$resolvedParams);
                }
            }
        }
    }
}

class IntegratedVendors
{
    public static array $supported = [
        [
            'name'             => 'Lalamove',
            'code'             => 'lalamove',
            'host'             => 'https://rest.lalamove.com/',
            'sandbox'          => 'https://rest.sandbox.lalamove.com/',
            'namespace'        => 'v3',
            'bridge'           => Lalamove::class,
            'svc_bridge'       => LalamoveServiceType::class,
            'iso2cc_bridge'    => LalamoveMarket::class,
            'credentialParams' => [
                ['key' => 'api_key'],
                ['key' => 'api_secret'],
            ],
            'optionParams' => [
                ['key' => 'market', 'options' => LalamoveMarket::markets, 'optionValue' => 'code', 'optionLabel' => 'key'],
            ],
            'bridgeParams' => [
                'apiKey'    => 'credentials.api_key',
                'apiSecret' => 'credentials.api_secret',
                'sandbox'   => 'sandbox',
                'market'    => 'options.market',
            ],
            'callbacks' => [
                'onCreated' => [
                    'setWebhook' => ['webhook_url'],
                ],
                'onUpdated' => [
                    'setWebhook' => ['webhook_url'],
                ],
                'onDeleted' => [
                    'cancelFromFleetbaseOrder' => [],
                ],
                'onCanceled' => [
                    'cancelFromFleetbaseOrder' => [],
                ],
            ],
        ],
    ];

    public static function all()
    {
        return collect(static::$supported)->mapInto(ResolvedIntegratedVendor::class);
    }

    public static function find($code)
    {
        if (is_callable($code)) {
            return static::all()->first($code);
        }

        if (is_string($code)) {
            return static::all()->first(
                function ($detail) use ($code) {
                    return isset($detail->code) && strtolower($detail->code) === strtolower($code);
                }
            );
        }

        return null;
    }

    public static function resolverFromIntegratedVendor(IntegratedVendor $vendor): ?ResolvedIntegratedVendor
    {
        return static::find($vendor->provider)->setIntegratedVendor($vendor);
    }

    public static function bridgeFromIntegratedVendor(IntegratedVendor $vendor)
    {
        $resolver = static::resolverFromIntegratedVendor($vendor);
        $params   = $resolver->resolveBridgeParams();

        $api = app($resolver->bridge, $params);

        if (method_exists($api, 'setIntegratedVendor')) {
            $api->setIntegratedVendor($vendor);
        }

        return $api;
    }

    public static function getServiceTypes(IntegratedVendor $vendor)
    {
        $resolver = static::resolverFromIntegratedVendor($vendor);

        if ($resolver->svc_bridge) {
            return $resolver->svc_bridge::all();
        }

        return [];
    }
}
