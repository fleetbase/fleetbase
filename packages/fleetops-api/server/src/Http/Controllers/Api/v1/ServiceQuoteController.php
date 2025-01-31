<?php

namespace Fleetbase\FleetOps\Http\Controllers\Api\v1;

use Fleetbase\FleetOps\Http\Requests\QueryServiceQuotesRequest;
use Fleetbase\FleetOps\Http\Resources\v1\ServiceQuote as ServiceQuoteResource;
use Fleetbase\FleetOps\Models\Entity;
use Fleetbase\FleetOps\Models\IntegratedVendor;
use Fleetbase\FleetOps\Models\Payload;
use Fleetbase\FleetOps\Models\Place;
use Fleetbase\FleetOps\Models\ServiceQuote;
use Fleetbase\FleetOps\Models\ServiceQuoteItem;
use Fleetbase\FleetOps\Models\ServiceRate;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ServiceQuoteController extends Controller
{
    /**
     * Query for Fleetbase ServiceQuote resources.
     *
     * @return \Fleetbase\FleetOps\Http\Resources\ServiceQuoteCollection
     */
    public function query(QueryServiceQuotesRequest $request)
    {
        $payload          = $request->input('payload');
        $currency         = $request->input('currency');
        $facilitator      = $request->input('facilitator');
        $scheduledAt      = $request->input('scheduled_at');
        $service          = $request->input('service', 'all'); // the specific service rate to query - defaults to `all`
        $serviceType      = $request->input('service_type'); // the specific type of service rate to query
        $single           = $request->boolean('single');
        $isRouteOptimized = $request->boolean('is_route_optimized', true);
        $requestId        = ServiceQuote::generatePublicId('request');

        if (Utils::isPublicId($payload)) {
            $payload = Payload::with(['pickup', 'dropoff', 'waypoints', 'entities'])
                ->where('public_id', $payload)
                ->first();
        }

        if (!$payload instanceof Payload) {
            return $this->queryFromPreliminary($request);
        }

        // if facilitator is an integrated partner resolve service quotes from bridge
        if ($facilitator && Str::startsWith($facilitator, 'integrated_vendor')) {
            $integratedVendor = IntegratedVendor::where('public_id', $facilitator)->first();
            $serviceQuotes    = [];

            if ($integratedVendor) {
                try {
                    $serviceQuotes = $integratedVendor->api()->setRequestId($requestId)->getQuoteFromPayload($payload, $serviceType, $scheduledAt, $isRouteOptimized);
                } catch (\Exception $e) {
                    return response()->json([
                        'errors' => [$e->getMessage()],
                    ], 400);
                }
            }

            // send single quote back
            if ($single) {
                return new ServiceQuoteResource($serviceQuotes);
            }

            if (!is_array($serviceQuotes)) {
                $serviceQuotes = [$serviceQuotes];
            }

            return ServiceQuoteResource::collection($serviceQuotes);
        }

        // get all waypoints
        $waypoints = $payload->getAllStops();

        // if quote for single service
        if ($service && $service !== 'all') {
            $serviceRate = ServiceRate::where(
                function ($query) use ($service) {
                    $query->where('uuid', $service)->orWhere('public_id', $service);
                })->where(
                    function ($q) use ($currency) {
                        if ($currency) {
                            $q->where(DB::raw('lower(currency)'), strtolower($currency));
                        }
                    })->first();
            $serviceQuotes = collect();

            if ($serviceRate) {
                [$subTotal, $lines] = $serviceRate->quote($payload);

                $quote = ServiceQuote::create([
                    'request_id'        => $requestId,
                    'company_uuid'      => $serviceRate->company_uuid,
                    'service_rate_uuid' => $serviceRate->uuid,
                    'amount'            => $subTotal,
                    'currency'          => $serviceRate->currency,
                ]);

                $items = $lines->map(function ($line) use ($quote) {
                    return ServiceQuoteItem::create([
                        'service_quote_uuid' => $quote->uuid,
                        'amount'             => $line['amount'],
                        'currency'           => $line['currency'],
                        'details'            => $line['details'],
                        'code'               => $line['code'],
                    ]);
                });

                $quote->setRelation('items', $items);
                $serviceQuotes->push($quote);

                // if single quotation requested
                if ($single) {
                    return new ServiceQuoteResource($quote);
                }

                return ServiceQuoteResource::collection($serviceQuotes);
            }
        }

        // get all service rates
        $serviceRates = ServiceRate::getServicableForPlaces(
            $waypoints,
            $serviceType,
            $currency,
            function ($query) use ($request) {
                $query->where('company_uuid', $request->session()->get('company'));
            }
        );
        $serviceQuotes = collect();

        // calculate quotes
        foreach ($serviceRates as $serviceRate) {
            [$subTotal, $lines] = $serviceRate->quote($payload);

            $quote = ServiceQuote::create([
                'request_id'        => $requestId,
                'company_uuid'      => $serviceRate->company_uuid,
                'service_rate_uuid' => $serviceRate->uuid,
                'amount'            => $subTotal,
                'currency'          => $serviceRate->currency,
            ]);

            $items = $lines->map(function ($line) use ($quote) {
                return ServiceQuoteItem::create([
                    'service_quote_uuid' => $quote->uuid,
                    'amount'             => $line['amount'],
                    'currency'           => $line['currency'],
                    'details'            => $line['details'],
                    'code'               => $line['code'],
                ]);
            });

            $quote->setRelation('items', $items);
            $serviceQuotes->push($quote);
        }

        // if single quotation requested
        if ($single) {
            // find the best quotation
            $bestQuote = $serviceQuotes->sortBy('amount')->first();

            return new ServiceQuoteResource($bestQuote);
        }

        return ServiceQuoteResource::collection($serviceQuotes);
    }

    /**
     * Query for Fleetbase ServiceQuote from preliminary data resources.
     *
     * @param \Fleetbase\Http\Requests\QueryServiceQuotesRequest $request
     *
     * @return \Fleetbase\Http\Resources\ServiceQuoteCollection
     */
    public function queryFromPreliminary(QueryServiceQuotesRequest $request)
    {
        $facilitator      = $request->input('facilitator');
        $scheduledAt      = $request->input('scheduled_at');
        $service          = $request->input('service', 'all'); // the specific service rate to query - defaults to `all`
        $serviceType      = $request->input('service_type'); // the specific type of service rate to query
        $isCashOnDelivery = $request->has('cod');
        $currency         = $request->has('currency');
        $totalDistance    = $request->input('distance');
        $totalTime        = $request->input('time');
        $pickup           = $request->or(['payload.pickup', 'pickup']);
        $dropoff          = $request->or(['payload.dropoff', 'dropoff']);
        $return           = $request->or(['payload.return', 'return']);
        $waypoints        = $request->or(['payload.waypoints', 'waypoints'], []);
        $entities         = $request->or(['payload.entities', 'entities']);
        $single           = $request->boolean('single');
        $isRouteOptimized = $request->boolean('is_route_optimized', true);

        // store preliminary data in service quotes meta
        $preliminaryData = [
            'pickup'    => $pickup,
            'dropoff'   => $dropoff,
            'return'    => $return,
            'waypoints' => $waypoints,
            'entities'  => $entities,
            'cod'       => $isCashOnDelivery,
            'currency'  => $currency,
        ];

        $requestId     = ServiceQuote::generatePublicId('request');
        $serviceQuotes = [];

        if (Utils::isNotScalar($pickup)) {
            $pickup = Place::createFromMixed($pickup);
        }

        if (Utils::isNotScalar($dropoff)) {
            $dropoff = Place::createFromMixed($dropoff);
        }

        if (Utils::isPublicId($pickup)) {
            $pickup = Place::where('public_id', $pickup)->first();
        }

        if (Utils::isPublicId($dropoff)) {
            $dropoff = Place::where('public_id', $dropoff)->first();
        }

        // convert waypoints to place instances
        $waypoints = collect($waypoints)->mapInto(Place::class);
        $entities  = collect($entities)->mapInto(Entity::class);

        // should all be Place like
        $waypoints = collect([$pickup, ...$waypoints, $dropoff])->filter();

        // if facilitator is an integrated partner resolve service quotes from bridge
        if ($facilitator && Utils::isIntegratedVendorId($facilitator)) {
            $integratedVendor = IntegratedVendor::where('company_uuid', session('company'))->where(function ($q) use ($facilitator) {
                $q->where('public_id', $facilitator);
                $q->orWhere('provider', $facilitator);
            })->first();

            if ($integratedVendor) {
                try {
                    /** @var \Fleetbase\Models\ServiceQuote $serviceQuote */
                    $serviceQuote = $integratedVendor->api()->setRequestId($requestId)->getQuoteFromPreliminaryPayload($waypoints, $entities, $serviceType, $scheduledAt, $isRouteOptimized);
                } catch (\Exception $e) {
                    return response()->json([
                        'errors' => [$e->getMessage()],
                    ], 400);
                }
            }

            // set preliminary data to meta
            $serviceQuote->updateMeta('preliminary_data', $preliminaryData);

            // send single quote back
            if ($single) {
                return new ServiceQuoteResource($serviceQuote);
            }

            if (!is_array($serviceQuote)) {
                $serviceQuote = [$serviceQuote];
            }

            return ServiceQuoteResource::collection($serviceQuote);
        }

        // if no total distance recalculate totalDistance and totalTime based on waypoints collected
        if (!$totalDistance) {
            $matrix = Utils::distanceMatrix([$waypoints->first()], $waypoints->skip(1));

            // set totalDistance and totalTime
            $totalDistance = $matrix->distance ?? 0;
            $totalTime     = $matrix->time ?? 0;
        }

        // if quote for single service
        if ($service !== 'all') {
            $serviceRate   = ServiceRate::where('uuid', $service)->first();
            $serviceQuotes = collect();

            if ($serviceRate) {
                [$subTotal, $lines] = $serviceRate->quoteFromPreliminaryData($entities, $waypoints, $totalDistance, $totalTime, $isCashOnDelivery);

                $quote = ServiceQuote::create([
                    'request_id'        => $requestId,
                    'company_uuid'      => $serviceRate->company_uuid,
                    'service_rate_uuid' => $serviceRate->uuid,
                    'amount'            => $subTotal,
                    'currency'          => $serviceRate->currency,
                ]);

                // set preliminary data to meta
                $quote->updateMeta('preliminary_data', $preliminaryData);

                $items = $lines->map(function ($line) use ($quote) {
                    return ServiceQuoteItem::create([
                        'service_quote_uuid' => $quote->uuid,
                        'amount'             => $line['amount'],
                        'currency'           => $line['currency'],
                        'details'            => $line['details'],
                        'code'               => $line['code'],
                    ]);
                });

                $quote->setRelation('items', $items);
                $serviceQuotes->push($quote);

                if ($single) {
                    return new ServiceQuoteResource($quote);
                }

                return ServiceQuoteResource::collection($serviceQuotes);
            }
        }

        // get all service rates
        $serviceRates = ServiceRate::getServicableForPlaces(
            $waypoints,
            $serviceType,
            $currency,
            function ($query) use ($request) {
                $query->where('company_uuid', $request->session()->get('company'));
            }
        );
        $serviceQuotes = collect();

        // calculate quotes
        foreach ($serviceRates as $serviceRate) {
            [$subTotal, $lines] = $serviceRate->quoteFromPreliminaryData($entities, $waypoints, $totalDistance, $totalTime, $isCashOnDelivery);

            $quote = ServiceQuote::create([
                'request_id'        => $requestId,
                'company_uuid'      => $serviceRate->company_uuid,
                'service_rate_uuid' => $serviceRate->uuid,
                'amount'            => $subTotal,
                'currency'          => $serviceRate->currency,
            ]);

            // set preliminary data to meta
            $quote->updateMeta('preliminary_data', $preliminaryData);

            $items = $lines->map(function ($line) use ($quote) {
                return ServiceQuoteItem::create([
                    'service_quote_uuid' => $quote->uuid,
                    'amount'             => $line['amount'],
                    'currency'           => $line['currency'],
                    'details'            => $line['details'],
                    'code'               => $line['code'],
                ]);
            });

            $quote->setRelation('items', $items);
            $serviceQuotes->push($quote);
        }

        // if single quotation requested
        if ($single) {
            // find the best quotation
            $bestQuote = $serviceQuotes->sortBy('amount')->first();

            return new ServiceQuoteResource($bestQuote);
        }

        return ServiceQuoteResource::collection($serviceQuotes);
    }

    /**
     * Finds a single Fleetbase ServiceQuote resources.
     *
     * @return \Fleetbase\Http\Resources\ServiceQuoteCollection
     */
    public function find($id)
    {
        // find for the serviceQuote
        try {
            $serviceQuote = ServiceQuote::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json([
                'error' => 'ServiceQuote resource not found.',
            ], 404);
        }

        // response the serviceQuote resource
        return new ServiceQuoteResource($serviceQuote);
    }
}
