<?php

namespace Fleetbase\FleetOps\Integrations\Lalamove;

use Fleetbase\FleetOps\Exceptions\IntegratedVendorException;
use Fleetbase\FleetOps\Models\Contact;
use Fleetbase\FleetOps\Models\IntegratedVendor;
use Fleetbase\FleetOps\Models\Order;
use Fleetbase\FleetOps\Models\Payload;
use Fleetbase\FleetOps\Models\Place;
use Fleetbase\FleetOps\Models\ServiceQuote;
use Fleetbase\FleetOps\Models\ServiceQuoteItem;
use Fleetbase\FleetOps\Support\ParsePhone;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Support\Auth;
use GuzzleHttp\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class Lalamove
{
    /**
     * API Host URL.
     */
    private string $host = 'https://rest.lalamove.com/';

    /**
     * API Sandbox Host URL.
     */
    private string $sandboxHost = 'https://rest.sandbox.lalamove.com/';

    /**
     * API Namespace.
     */
    private string $namespace = 'v3';

    /**
     * Determines if instance is sandbox instance.
     */
    private bool $isSandbox = false;

    /**
     * API Key.
     */
    private ?string $apiKey;

    /**
     * API Secret.
     */
    private ?string $apiSecret;

    /**
     * Applicable request ID.
     */
    private ?string $requestId;

    /**
     * Applicable options.
     */
    private array $options = [];

    /**
     * HTTP Client Instance.
     */
    private Client $client;

    /**
     * The current Lalamove Market.
     */
    private LalamoveMarket $market;

    /**
     * The current integrated vendor accessing instance.
     */
    private ?IntegratedVendor $integratedVendor = null;

    public function __construct(?string $apiKey = null, ?string $apiSecret = null, bool $sandbox = false, $market = null)
    {
        if ($apiKey === null) {
            $apiKey = config('services.lalamove.key');
        }

        if ($apiSecret === null) {
            $apiSecret = config('services.lalamove.secret');
        }

        if ($market === null) {
            // check company session first
            $company = Auth::getCompany(['uuid', 'country']);

            if ($company && is_string($company->country) && LalamoveMarket::codes()->contains(strtoupper($company->country))) {
                $market = strtoupper($company->country);
            } else {
                $market = config('services.lalamove.market', 'SG');
            }
        }

        $this->isSandbox = $sandbox;
        $this->apiKey    = $apiKey;
        $this->apiSecret = $apiSecret;
        $this->setMarket($market);

        $this->client = new Client(
            [
                'base_uri' => $this->buildRequestUrl(),
            ]
        );
    }

    public static function instance(?string $apiKey = null, ?string $apiSecret = null, bool $sandbox = false, $market = null): Lalamove
    {
        return new static($apiKey, $apiSecret, $market, $sandbox);
    }

    public static function __callStatic($name, $arguments)
    {
        if ($name === 'instance') {
            return static::instance(...$arguments);
        }

        $sandbox = false;

        if (Str::contains($name, 'FromSandbox')) {
            $name    = lcfirst(Str::replaceLast('FromSandbox', '', $name));
            $sandbox = true;
        } else {
            $name = Str::replaceFirst('fromHost', '', $name);
        }

        $instance = static::instance(null, null, $sandbox, null);

        if (method_exists($instance, $name)) {
            return $instance->{$name}(...$arguments);
        }

        return null;
    }

    public static function asCents($number)
    {
        return Utils::numbersOnly((string) $number * 100);
    }

    public function setRequestId(?string $requestId): Lalamove
    {
        $this->requestId = $requestId;

        return $this;
    }

    public function setOptions(?array $options = []): Lalamove
    {
        $this->options = array_merge($this->options, $options);

        return $this;
    }

    public function getOptions(): array
    {
        return $this->options;
    }

    public function setIntegratedVendor(IntegratedVendor $integratedVendor): Lalamove
    {
        $this->integratedVendor = $integratedVendor;

        return $this;
    }

    public static function createServiceQuoteFromQuotation($quotation, $requestId = null, $integratedVendor = null, ?Payload $payload = null): ServiceQuote
    {
        $serviceQuote = static::serviceQuoteFromQuotation($quotation, $requestId, $integratedVendor, $payload);
        $serviceQuote->save();

        foreach ($serviceQuote->items as $serviceQuoteItem) {
            $serviceQuoteItem->service_quote_uuid = $serviceQuote->uuid;
            $serviceQuoteItem->save();
        }

        return $serviceQuote->load(['items']);
    }

    public static function serviceQuoteFromQuotation($quotation = null, $requestId = null, $integratedVendor = null, ?Payload $payload = null): ServiceQuote
    {
        if (!$quotation) {
            return null;
        }

        if (isset($quotation->data)) {
            return static::serviceQuoteFromQuotation($quotation->data, $requestId, $integratedVendor, $payload);
        }

        $id       = ServiceQuote::generateUuid();
        $currency = $quotation->priceBreakdown->currency;

        $serviceQuote = new ServiceQuote(
            [
                'uuid'         => $id,
                'request_id'   => $requestId,
                'company_uuid' => session('company'),
                'payload_uuid' => $payload instanceof Payload ? $payload->uuid : null,
                'amount'       => static::asCents($quotation->priceBreakdown->total),
                'currency'     => $currency,
                'meta'         => [
                    'provider' => 'lalamove',
                    'data'     => $quotation,
                ],
            ]
        );

        // set integrated vendor to meta if applicable
        if ($integratedVendor instanceof IntegratedVendor) {
            $serviceQuote->integrated_vendor_uuid = $integratedVendor->uuid;
            $serviceQuote->setMeta('from_integrated_vendor', $integratedVendor->public_id);
        }

        // create service quote items
        $serviceQuoteItemKeys = ['base', 'extraMileage', 'vat'];
        $items                = [];

        foreach ($serviceQuoteItemKeys as $itemKey) {
            if (empty($quotation->priceBreakdown->{$itemKey})) {
                continue;
            }

            $items[] = new ServiceQuoteItem(
                [
                    'service_quote_uuid' => $id,
                    'amount'             => static::asCents($quotation->priceBreakdown->{$itemKey}),
                    'currency'           => $currency,
                    'details'            => Utils::humanize($itemKey) . ' fee',
                    'code'               => strtoupper(Str::snake($itemKey . 'Fee')),
                ]
            );
        }

        $serviceQuote->setRelation('items', $items);

        return $serviceQuote;
    }

    public static function getServiceType($key): ?LalamoveServiceType
    {
        if ($key instanceof LalamoveServiceType) {
            return $key;
        }

        return LalamoveServiceType::find($key);
    }

    public static function getMarket($key): ?LalamoveMarket
    {
        if ($key instanceof LalamoveMarket) {
            return $key;
        }

        return LalamoveMarket::find($key);
    }

    public function setMarket($market)
    {
        if ($market instanceof LalamoveMarket) {
            $this->market = $market;
        }

        if (is_string($market)) {
            $this->market = LalamoveMarket::find($market);
        }

        return $this;
    }

    private static function sign($timestamp, ?string $apiSecret, ?string $requestMethod, ?string $requestPath, ?string $requestBody)
    {
        $requestMethod = strtoupper($requestMethod);
        $rawSignature  =  "$timestamp\r\n$requestMethod\r\n$requestPath\r\n\r\n$requestBody";
        $signature     = hash_hmac('sha256', $rawSignature, $apiSecret);

        return $signature;
    }

    private function createSignature($timestamp, ?string $requestMethod, ?string $requestPath, ?string $requestBody)
    {
        $requestPath = '/' . $this->namespace . '/' . $requestPath;
        $apiSecret   = $this->apiSecret;

        return static::sign($timestamp, $apiSecret, $requestMethod, $requestPath, $requestBody);
    }

    private function getAuthorizationKey(?string $method, ?string $path, ?string $body)
    {
        $key       = $this->apiKey;
        $timestamp = floor(microtime(true) * 1000);
        $signature = $this->createSignature($timestamp, $method, $path, $body);

        return "$key:$timestamp:$signature";
    }

    private function throwError($errors = [], $triggerMethod = null)
    {
        $firstError = Arr::first($errors);

        $errorMessage = 'Lalamove: ';

        if (isset($firstError->id)) {
            $errorMessage .= $firstError->id . ' ';
        }

        if (isset($firstError->message)) {
            $errorMessage .= $firstError->message;
        }

        if (isset($firstError->detail)) {
            $errorMessage .= ' (' . $firstError->detail . ')';
        }

        throw new IntegratedVendorException($errorMessage, $this->integratedVendor, $triggerMethod);
    }

    private function buildRequestUrl(string $path = ''): string
    {
        $host = $this->isSandbox ? $this->sandboxHost : $this->host;
        $url  = trim($host . $this->namespace . '/' . $path);

        return $url;
    }

    private function request(string $method, string $path, array $options = [])
    {
        $options['headers'] = [
            'Content-Type'  => 'application/json',
            'Authorization' => 'hmac ' . $this->getAuthorizationKey($method, $path, isset($options['json']) ? json_encode($options['json']) : ''),
            'Market'        => $this->market->getCode(),
            'Request-ID'    => (string) Str::uuid(),
        ];

        $response = $this->client->request($method, $path, $options);
        $body     = $response->getBody();
        $contents = $body->getContents();
        $json     = json_decode($contents);

        return $json;
    }

    private function post(string $path, array $options = [])
    {
        $options = array_merge($options, [
            'http_errors' => false,
        ]);

        return $this->request('POST', $path, $options);
    }

    private function patch(string $path, array $options = [])
    {
        $options = array_merge($options, [
            'http_errors' => false,
        ]);

        return $this->request('PATCH', $path, $options);
    }

    private function delete(string $path, array $options = [])
    {
        $options = array_merge($options, [
            'http_errors' => false,
        ]);

        return $this->request('DELETE', $path, $options);
    }

    public function getQuotations($serviceType, $stops = [], $scheduleAt = null, array $specialRequests = [], $isRouteOptimized = true, $item = [], array $cashOnDelivery = [])
    {
        $serviceType = static::getServiceType($serviceType);
        $stops       = collect($stops)
            ->mapInto(LalamoveDeliveryStop::class)->map(
                function ($stop) {
                    return $stop->toArray();
                }
            )
            ->values()
            ->toArray();

        $language = Arr::first($this->market->getLanguages());

        $options = [
            'json' => [
                'data' => [
                    'serviceType'      => $serviceType->getKey(),
                    'stops'            => $stops,
                    'language'         => $language,
                    'isRouteOptimized' => $isRouteOptimized,
                    'specialRequests'  => $specialRequests,
                ],
            ],
        ];

        if (!empty($item)) {
            $options['json']['data']['item'] = $item;
        }

        if (!empty($specialRequests)) {
            $options['json']['data']['specialRequests'] = $specialRequests;
        }

        if (!empty($cashOnDelivery)) {
            $options['json']['data']['cashOnDelivery'] = $cashOnDelivery;
        }

        if ($scheduleAt) {
            $scheduleAt = Carbon::parse($scheduleAt);

            if ($scheduleAt->isValid()) {
                $options['json']['data']['scheduleAt'] = $scheduleAt->toISOString();
            }
        }

        return $this->post('quotations', $options);
    }

    public function getQuoteFromPayload(Payload $payload, $serviceType = null, $scheduledAt = null, $isRouteOptimized = true, ?array $specialRequests = []): ServiceQuote
    {
        $market      = $payload->getCountryCode();
        $stops       = $payload->getAllStops()->toArray();
        $serviceType = $serviceType ?? 'MOTORCYCLE';

        $response = $this->setMarket($market)->getQuotations($serviceType, $stops, $scheduledAt, $specialRequests, $isRouteOptimized);

        if (isset($response->errors)) {
            return $this->throwError($response->errors, __FUNCTION__);
        }

        return static::createServiceQuoteFromQuotation($response, $this->requestId, $this->integratedVendor, $payload);
    }

    public function getQuoteFromPreliminaryPayload($stops, $entities, $serviceType, $scheduledAt, $isRouteOptimized = true, ?array $specialRequests = []): ServiceQuote
    {
        $firstStop   = Arr::first($stops);
        $lastStop    = Arr::last($stops);
        $market      = $firstStop->country ?? $lastStop->country ?? data_get(request()->user(), 'company.country');
        $serviceType = $serviceType ?? 'MOTORCYCLE';

        $response = $this->setMarket($market)->getQuotations($serviceType, $stops, $scheduledAt, $specialRequests, $isRouteOptimized);

        if (isset($response->errors)) {
            return $this->throwError($response->errors, __FUNCTION__);
        }

        return static::createServiceQuoteFromQuotation($response, $this->requestId, $this->integratedVendor);
    }

    public static function getQuotationForMarket($market, ...$params)
    {
        $instance = static::instance(null, null, $market);

        return $instance->getQuotations(...$params);
    }

    public function cancelOrder(string $orderId)
    {
        $response = $this->delete('orders/' . $orderId);

        if (isset($response->errors)) {
            $this->throwError($response->errors, __FUNCTION__);
        }

        return $response;
    }

    public function cancelFromFleetbaseOrder(Order $order)
    {
        $orderId = $order->getMeta('integrated_vendor_order.orderId');

        return $this->cancelOrder($orderId);
    }

    public function createOrder(string $quotationId, $sender = [], $recipients = [], $isRecipientSMSEnabled = false, $isPODEnabled = false, array $metadata = [])
    {
        if ($sender instanceof Contact) {
            $sender = [
                'name'  => $sender->name,
                'phone' => $sender->phone,
            ];
        }

        $options = [
            'json' => [
                'data' => [
                    'quotationId'           => $quotationId,
                    'sender'                => $sender,
                    'recipients'            => $recipients,
                    'isRecipientSMSEnabled' => $isRecipientSMSEnabled,
                    'isPODEnabled'          => $isPODEnabled,
                    'metadata'              => $metadata,
                ],
            ],
        ];

        $response = $this->post('orders', $options);

        if (isset($response->errors)) {
            return $this->throwError($response->errors, __FUNCTION__);
        }

        if (isset($response->data)) {
            return $response->data;
        }

        return $response;
    }

    public function createOrderFromServiceQuote(ServiceQuote $serviceQuote, Request $request)
    {
        // get quotation id from service quote
        $quotationId  = $serviceQuote->getMeta('data.quotationId');
        $stops        = $serviceQuote->getMeta('data.stops');
        $companyPhone = ParsePhone::fromCompany($serviceQuote->company);

        // hack use test phone phone
        if (empty($companyPhone)) {
            $companyPhone = '+18004444444';
        }

        // create sender from request
        // sender will always be the org
        $sender = [
            'stopId' => data_get(Arr::first($stops), 'stopId'),
            'name'   => $serviceQuote->company->name,
            'phone'  => $companyPhone,
        ];

        $pickup       = null;
        $dropoff      = null;
        $waypoints    = [];
        $phoneOptions = [];

        // recipient will be the customer if applicable
        // if no customer, then use the destination dropoff values
        // if no dropoff create multiple recipients from waypoint data
        if ($request->hasAny(['order.payload', 'payload', 'pickup', 'waypoints'])) {
            $pickup    = $request->or(['order.payload.pickup', 'payload.pickup', 'pickup']);
            $dropoff   = $request->or(['order.payload.dropoff', 'payload.dropoff', 'dropoff']);
            $waypoints = $request->or(['order.payload.waypoints', 'payload.waypoints', 'waypoints']);
        }

        // If service quote is created from preliminary data
        // use preliminary data to fill route variables
        if ($serviceQuote->hasMeta('preliminary_data')) {
            $preliminaryData = $serviceQuote->getMeta('preliminary_data');
            $pickup          = data_get($preliminaryData, 'pickup');
            $dropoff         = data_get($preliminaryData, 'dropoff');
            $waypoints       = data_get($preliminaryData, 'waypoints', []);
        }

        // create phone lookup options from service quote
        if ($serviceQuote instanceof ServiceQuote) {
            $phoneOptions['currency'] = $serviceQuote->currency;
        }

        // Check if ServiceQuote has an origin and destination
        // If from network cart origin will be an array of storeLocations[]
        if ($serviceQuote->hasMeta('origin') && $serviceQuote->hasMeta('destination')) {
            $origin      = $serviceQuote->getMeta('origin');
            $destination = $serviceQuote->getMeta('destination');

            if (is_array($origin)) {
                $waypoints = $origin;
            } else {
                $pickup = $origin;
            }

            $dropoff = $destination;
        }

        // If service quote is created with payload, then use payload to
        // fill route variables
        if ($serviceQuote->payload instanceof Payload) {
            $pickup    = $serviceQuote->payload->pickup;
            $dropoff   = $serviceQuote->payload->dropoff;
            $waypoints = $serviceQuote->payload->waypoints;
        }

        // track all markets
        $allWaypoints = collect([$pickup, ...$waypoints, $dropoff])
            ->filter()
            ->map(
                function ($waypoint) {
                    if (isset($waypoint['place'])) {
                        return Place::createFromMixed($waypoint['place']);
                    }

                    return Place::createFromMixed($waypoint);
                }
            )
            ->values();

        // get first waypoin as sender
        $senderWaypoint = $allWaypoints->first();

        // update sender phone number
        $senderName      = $senderWaypoint instanceof Place ? Utils::or($senderWaypoint, ['name', 'street1']) : null;
        $sender['name']  = $senderName ?? $sender['name'];
        $senderPhone     = $senderWaypoint instanceof Place ? ParsePhone::fromPlace($senderWaypoint, $phoneOptions) : null;
        $sender['phone'] = $senderPhone ?? $sender['phone'];

        // get market from integrated vendor option, otherwise fallback to waypoint
        if ($serviceQuote->integratedVendor instanceof IntegratedVendor) {
            $market = $serviceQuote->integratedVendor->getOption('market');
        }

        if (!$market) {
            $market = $allWaypoints->pluck('country')->filter()->first();
        }

        // set market
        $this->setMarket($market);

        $recipients = $allWaypoints
            ->filter(
                function ($waypoint, $index) {
                    return $index > 0;
                }
            )
            ->map(
                function ($waypoint, $index) use ($stops, $companyPhone, $phoneOptions) {
                    return [
                        'stopId'  => data_get($stops[$index], 'stopId'),
                        'name'    => Utils::or($waypoint, ['name', 'street1']),
                        'phone'   => ParsePhone::fromPlace($waypoint, $phoneOptions) ?? $companyPhone,
                        'remarks' => $waypoint->remarks ?? '',
                    ];
                }
            )
            ->values()
            ->toArray();

        // check order for POD enabled
        $isPODEnabled = $request->boolean('order.pod_required');

        // set metadata from the service quote
        // metadata[] should inclue 'company public id', 'service quote public id'
        $metadata = [
            'company'           => $serviceQuote->company->public_id,
            'service_quote'     => $serviceQuote->public_id,
            'integrated_vendor' => data_get($this->integratedVendor, 'public_id'),
            'platform'          => 'fleetbase',
        ];

        return $this->createOrder($quotationId, $sender, $recipients, false, $isPODEnabled, $metadata);
    }

    public function setWebhook(?string $webhookUrl = null)
    {
        if (!is_string($webhookUrl)) {
            return;
        }

        $options['json'] = [
            'data' => [
                'url' => $webhookUrl,
            ],
        ];

        $response = $this->patch('webhook', $options);

        if (isset($response->errors)) {
            return $this->throwError($response->errors, __FUNCTION__);
        }

        if (isset($response->data)) {
            return $response->data;
        }

        return $response;
    }
}
