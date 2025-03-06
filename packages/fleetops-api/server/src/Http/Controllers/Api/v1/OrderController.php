<?php

namespace Fleetbase\FleetOps\Http\Controllers\Api\v1;

use Fleetbase\FleetOps\Events\OrderDispatchFailed;
use Fleetbase\FleetOps\Events\OrderReady;
use Fleetbase\FleetOps\Events\OrderStarted;
use Fleetbase\FleetOps\Exceptions\UserAlreadyExistsException;
use Fleetbase\FleetOps\Flow\Activity;
use Fleetbase\FleetOps\Http\Requests\CreateOrderRequest;
use Fleetbase\FleetOps\Http\Requests\ScheduleOrderRequest;
use Fleetbase\FleetOps\Http\Requests\UpdateOrderRequest;
use Fleetbase\FleetOps\Http\Resources\v1\DeletedResource;
use Fleetbase\FleetOps\Http\Resources\v1\Order as OrderResource;
use Fleetbase\FleetOps\Http\Resources\v1\Proof as ProofResource;
use Fleetbase\FleetOps\Models\Contact;
use Fleetbase\FleetOps\Models\Driver;
use Fleetbase\FleetOps\Models\Entity;
use Fleetbase\FleetOps\Models\Order;
use Fleetbase\FleetOps\Models\OrderConfig;
use Fleetbase\FleetOps\Models\Payload;
use Fleetbase\FleetOps\Models\Place;
use Fleetbase\FleetOps\Models\Proof;
use Fleetbase\FleetOps\Models\ServiceQuote;
use Fleetbase\FleetOps\Models\Waypoint;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Http\Controllers\Controller;
use Fleetbase\Models\Company;
use Fleetbase\Models\File;
use Fleetbase\Models\Setting;
use Fleetbase\Support\Auth;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Fleetbase\FleetOps\Models\TrackingStatus;
 

class OrderController extends Controller
{
    /**
     * Creates a new Fleetbase Order resource.
     *
     * @param Request|\Fleetbase\Http\Requests\CreateOrderRequest $request
     *
     * @return \Fleetbase\Http\Resources\Order
     */
    public function create(CreateOrderRequest $request)
    {
        // get request input
        $input = $request->only(['internal_id', 'payload', 'service_quote', 'purchase_rate', 'adhoc', 'adhoc_distance', 'pod_method', 'pod_required', 'scheduled_at', 'status', 'meta', 'notes']);

        // Get order config
        $orderConfig = OrderConfig::resolveFromIdentifier($request->only(['type', 'order_config']));
        if (!$orderConfig) {
            return response()->apiError('Invalid order `type` or `order_config` provided.');
        }

        // Set order config to input
        $input['order_config_uuid'] = $orderConfig->uuid;
        $input['type']              = $orderConfig->key;

        // make sure company is set
        $input['company_uuid'] = session('company');

        // resolve service quote if applicable
        $serviceQuote          = ServiceQuote::resolveFromRequest($request);
        $integratedVendorOrder = null;

        // if service quote is applied, resolve it
        if ($serviceQuote instanceof ServiceQuote && $serviceQuote->fromIntegratedVendor()) {
            // create order with integrated vendor, then resume fleetbase order creation
            try {
                $integratedVendorOrder = $serviceQuote->integratedVendor->api()->createOrderFromServiceQuote($serviceQuote, $request);
            } catch (\Exception $e) {
                return response()->apiError($e->getMessage());
            }
        }

        // create payload
        if ($request->has('payload') && $request->isArray('payload')) {
            $payload      = new Payload();
            $payloadInput = $request->input('payload');
            $entities     = data_get($payloadInput, 'entities', []);
            $waypoints    = data_get($payloadInput, 'waypoints', []);
            $pickup       = data_get($payloadInput, 'pickup');
            $dropoff      = data_get($payloadInput, 'dropoff');
            $return       = data_get($payloadInput, 'return');

            if ($pickup) {
                $payload->setPickup($pickup, [
                    'callback' => function ($pickup, $payload) {
                        $payload->setCurrentWaypoint($pickup);
                    },
                ]);
            }

            if ($dropoff) {
                $payload->setDropoff($dropoff);
            }

            if ($return) {
                $payload->setReturn($return);
            }

            $payload->save();

            // set waypoints and entities after payload is saved
            $payload->setWaypoints($waypoints);
            $payload->setEntities($entities);

            // set the first / current waypoint
            $firstWaypoint = $payload->getPickupOrFirstWaypoint();
            if ($firstWaypoint instanceof Place) {
                $payload->setCurrentWaypoint($firstWaypoint);
            }

            $input['payload_uuid'] = $payload->uuid;
        } elseif ($request->isString('payload')) {
            $input['payload_uuid'] = Utils::getUuid('payloads', [
                'public_id'    => $request->input('payload'),
                'company_uuid' => session('company'),
            ]);
            unset($input['payload']);
        }

        // create a payload if missing payload[] but has pickup/dropoff/etc
        if ($request->missing('payload')) {
            $payload      = new Payload();
            $payloadInput = $request->only(['pickup', 'dropoff', 'return', 'waypoints', 'entities']);
            $entities     = data_get($payloadInput, 'entities', []);
            $waypoints    = data_get($payloadInput, 'waypoints', []);
            $pickup       = data_get($payloadInput, 'pickup');
            $dropoff      = data_get($payloadInput, 'dropoff');
            $return       = data_get($payloadInput, 'return');

            if ($pickup) {
                $payload->setPickup($pickup, [
                    'callback' => function ($pickup, $payload) {
                        $payload->setCurrentWaypoint($pickup);
                    },
                ]);
            }

            if ($dropoff) {
                $payload->setDropoff($dropoff);
            }

            if ($return) {
                $payload->setReturn($return);
            }

            $payload->save();

            // set waypoints and entities after payload is saved
            $payload->setWaypoints($waypoints);
            $payload->setEntities($entities);

            $input['payload_uuid'] = $payload->uuid;

            // set the first / current waypoint
            $firstWaypoint = $payload->getPickupOrFirstWaypoint();
            if ($firstWaypoint instanceof Place) {
                $payload->setCurrentWaypoint($firstWaypoint);
            }
        }

        // driver assignment
        if ($request->has('driver') && $integratedVendorOrder === null) {
            $driver = Driver::where(['public_id' => $request->input('driver'), 'company_uuid' => session('company')])->first();
            if ($driver) {
                $input['driver_assigned_uuid'] = $driver->uuid;
                // set vehicle assignmend from driver
                if ($driver->vehicle_uuid) {
                    $input['vehicle_assigned_uuid'] = $driver->vehicle_uuid;
                }
            }
        }

        // driver assignment
        if ($request->has('vehicle') && $integratedVendorOrder === null) {
            $input['vehicle_assigned_uuid'] = Utils::getUuid('vehicles', [
                'public_id'    => $request->input('vehicle'),
                'company_uuid' => session('company'),
            ]);
        }

        // facilitator assignment
        if ($request->has('facilitator') && $integratedVendorOrder === null) {
            $facilitator = Utils::getUuid(
                ['contacts', 'vendors', 'integrated_vendors'],
                [
                    'public_id'    => $request->input('facilitator'),
                    'company_uuid' => session('company'),
                ]
            );

            if (is_array($facilitator)) {
                $input['facilitator_uuid'] = Utils::get($facilitator, 'uuid');
                $input['facilitator_type'] = Utils::getModelClassName(Utils::get($facilitator, 'table'));
            }
        } elseif ($integratedVendorOrder) {
            $input['facilitator_uuid'] = $serviceQuote->integratedVendor->uuid;
            $input['facilitator_type'] = Utils::getModelClassName('integrated_vendors');
        }

        // customer assignment
        if ($request->has('customer')) {
            $customer = $request->input('customer');

            if (is_string($customer)) {
                $customer = Utils::getUuid(
                    ['contacts', 'vendors'],
                    [
                        'public_id'    => $customer,
                        'company_uuid' => session('company'),
                    ]
                );

                if (is_array($customer)) {
                    $input['customer_uuid'] = Utils::get($customer, 'uuid');
                    $input['customer_type'] = Utils::getModelClassName(Utils::get($customer, 'table'));
                }
            } elseif (is_array($customer)) {
                // create customer from input
                $customer = Arr::only($customer, ['internal_id', 'name', 'title', 'email', 'phone', 'meta']);

                try {
                    $customer = Contact::firstOrCreate(
                        [
                            'company_uuid' => session('company'),
                            'email'        => $customer['email'],
                            'type'         => 'customer',
                        ],
                        [
                            ...$customer,
                            'company_uuid' => session('company'),
                            'type'         => 'customer',
                        ]
                    );
                } catch (\Exception $e) {
                    return response()->apiError('Failed to find or create customer for order.');
                } catch (UserAlreadyExistsException $e) {
                    try {
                        // If user already exist then assign user to this customer and the company
                        $existingUser = $e->getUser();
                        // Assign user to customer
                        if ($existingUser && $customer) {
                            $customer->assignUser($existingUser);
                        }
                    } catch (\Exception $e) {
                        return response()->apiError('Failed to find or create customer for order.');
                    }
                }

                if ($customer instanceof Contact) {
                    $input['customer_uuid'] = $customer->uuid;
                    $input['customer_type'] = Utils::getModelClassName($customer);
                }
            }
        }

        // if no type is set its default to transport
        if (!isset($input['type'])) {
            $input['type'] = 'transport';
        }

        // if no status is set its default to `created`
        if (!isset($input['status'])) {
            $input['status'] = 'created';
        }

        // if adhoc set convert to sql ready boolean value 1 or 0
        if (isset($input['adhoc']) && $integratedVendorOrder === null) {
            $input['adhoc'] = Utils::isTrue($input['adhoc']) ? 1 : 0;
        }

        if (!isset($input['payload_uuid'])) {
            return response()->apiError('Attempted to attach invalid payload to order.');
        }

        // create the order
        $order = Order::create($input);

        // notify driver if assigned
        $order->notifyDriverAssigned();

        // set driving distance and time
        $order->setPreliminaryDistanceAndTime();

        // if service quote attached purchase
        $order->purchaseServiceQuote($serviceQuote);

        // if it's integrated vendor order apply to meta
        if ($integratedVendorOrder) {
            $order->updateMeta([
                'integrated_vendor'       => $serviceQuote->integratedVendor->public_id,
                'integrated_vendor_order' => $integratedVendorOrder,
            ]);
        }

        // dispatch if flagged true
        if ($request->boolean('dispatch') && $integratedVendorOrder === null) {
            $order->dispatchWithActivity();
        }

        // load required relations
        $order->load(['trackingNumber', 'driverAssigned', 'purchaseRate', 'customer', 'facilitator']);

        // Trigger order created event
        event(new OrderReady($order));

        // response the driver resource
        return new OrderResource($order);
    }

    /**
     * Updates a Fleetbase Order resource.
     *
     * @param string                                      $id
     * @param \Fleetbase\Http\Requests\UpdateOrderRequest $request
     *
     * @return \Fleetbase\Http\Resources\Order
     */
    public function update($id, UpdateOrderRequest $request)
    {
        // find for the order
        try {
            $order = Order::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Order resource not found.',
                ],
                404
            );
        }

        // get request input
        $input = $request->only(['internal_id', 'payload', 'adhoc', 'adhoc_distance', 'pod_method', 'pod_required', 'scheduled_at', 'meta', 'type', 'status', 'notes']);

        // update payload if new input or change payload by id
        if ($request->isArray('payload')) {
            $payload      = data_get($order, 'payload', new Payload());
            $payloadInput = $request->input('payload');
            $entities     = data_get($payloadInput, 'entities', []);
            $waypoints    = data_get($payloadInput, 'waypoints', []);
            $pickup       = data_get($payloadInput, 'pickup');
            $dropoff      = data_get($payloadInput, 'dropoff');
            $return       = data_get($payloadInput, 'return');

            // if no pickup and dropoff extract from waypoints
            if (empty($pickup) && empty($dropoff) && count($waypoints)) {
                $pickup  = array_shift($waypoints);
                $dropoff = array_pop($waypoints);
            }

            if ($pickup) {
                $payload->setPickup($pickup);
            }

            if ($dropoff) {
                $payload->setDropoff($dropoff);
            }

            if ($return) {
                $payload->setReturn($return);
            }

            $payload->save();

            // set waypoints and entities after payload is saved
            if ($waypoints) {
                $payload->setWaypoints($waypoints);
            }

            if ($entities) {
                $payload->setEntities($entities);
            }

            $input['payload_uuid'] = $payload->uuid;
        } elseif ($request->has('payload')) {
            $input['payload_uuid'] = Utils::getUuid('payloads', [
                'public_id'    => $request->input('payload'),
                'company_uuid' => session('company'),
            ]);
            unset($input['payload']);
        }

        // create a payload if missing payload[] but has pickup/dropoff/etc
        if ($request->missing('payload')) {
            $payload      = data_get($order, 'payload', new Payload());
            $payloadInput = $request->only(['pickup', 'dropoff', 'return', 'waypoints', 'entities']);
            $entities     = data_get($payloadInput, 'entities', []);
            $waypoints    = data_get($payloadInput, 'waypoints', []);
            $pickup       = data_get($payloadInput, 'pickup');
            $dropoff      = data_get($payloadInput, 'dropoff');
            $return       = data_get($payloadInput, 'return');

            // if no pickup and dropoff extract from waypoints
            if (empty($pickup) && empty($dropoff) && count($waypoints)) {
                $pickup  = array_shift($waypoints);
                $dropoff = array_pop($waypoints);
            }

            if ($pickup) {
                $payload->setPickup($pickup);
            }

            if ($dropoff) {
                $payload->setDropoff($dropoff);
            }

            if ($return) {
                $payload->setReturn($return);
            }

            $payload->save();

            // set waypoints and entities after payload is saved
            if ($waypoints) {
                $payload->setWaypoints($waypoints);
            }

            if ($entities) {
                $payload->setEntities($entities);
            }

            $input['payload_uuid'] = $payload->uuid;
        }

        // driver assignment
        if ($request->has('driver')) {
            $input['driver_assigned_uuid'] = Utils::getUuid('drivers', [
                'public_id'    => $request->input('driver'),
                'company_uuid' => session('company'),
            ]);
        }

        // facilitator assignment
        if ($request->has('facilitator')) {
            $facilitator = Utils::getUuid(
                ['contacts', 'vendors'],
                [
                    'public_id'    => $request->input('facilitator'),
                    'company_uuid' => session('company'),
                ]
            );

            if (is_array($facilitator)) {
                $input['facilitator_uuid'] = Utils::get($facilitator, 'uuid');
                $input['facilitator_type'] = Utils::getModelClassName(Utils::get($facilitator, 'table'));
            }
        }

        // customer assignment
        if ($request->has('customer')) {
            $customer = Utils::getUuid(
                ['contacts', 'vendors'],
                [
                    'public_id'    => $request->input('customer'),
                    'company_uuid' => session('company'),
                ]
            );

            if (is_array($customer)) {
                $input['customer_uuid'] = Utils::get($customer, 'uuid');
                $input['customer_type'] = Utils::getModelClassName(Utils::get($customer, 'table'));
            }
        }

        // dispatch if flagged true
        if ($request->boolean('dispatch')) {
            $order->dispatch();
        }

        // update the order
        $order->update($input);
        $order->flushAttributesCache();

        // response the order resource
        return new OrderResource($order);
    }

    /**
     * Query for Fleetbase Order resources.
     *
     * @return \Fleetbase\Http\Resources\OrderCollection
     */
    public function query(Request $request)
    {
        $results = Order::queryWithRequest($request, function (&$query, $request) {
            $query->where('company_uuid', session('company'));
            if ($request->has('payload')) {
                $query->whereHas('payload', function ($q) use ($request) {
                    $q->where('public_id', $request->input('payload'));
                });
            }

            if ($request->has('pickup')) {
                $query->whereHas('payload.pickup', function ($q) use ($request) {
                    $q->where('public_id', $request->input('pickup'));
                });
            }

            if ($request->has('dropoff')) {
                $query->whereHas('payload.dropoff', function ($q) use ($request) {
                    $q->where('public_id', $request->input('dropoff'));
                });
            }

            if ($request->has('return')) {
                $query->whereHas('payload.return', function ($q) use ($request) {
                    $q->where('public_id', $request->input('return'));
                });
            }

            if ($request->has('facilitator')) {
                $query->whereHas('facilitator', function ($q) use ($request) {
                    $q->where(function ($q) use ($request) {
                        $q->where('public_id', $request->input('facilitator'));
                        $q->orWhere('internal_id', $request->input('facilitator'));
                    });
                });
            }

            if ($request->has('customer')) {
                $query->whereHas('customer', function ($q) use ($request) {
                    $q->where(function ($q) use ($request) {
                        $q->where('public_id', $request->input('customer'));
                        $q->orWhere('internal_id', $request->input('customer'));
                    });
                });
            }

            if ($request->has('entity')) {
                $query->whereHas('payload.entities', function ($q) use ($request) {
                    $q->where(function ($q) use ($request) {
                        $q->where('public_id', $request->input('entity'));
                        $q->orWhere('internal_id', $request->input('entity'));
                    });
                });
            }

            if ($request->has('entity_status')) {
                $query->whereHas('payload.entities.trackingNumber.status', function ($q) use ($request) {
                    if ($request->isArray('entity_status')) {
                        $q->whereIn('code', $request->input('entity_status'));
                    } else {
                        $q->where('code', $request->input('entity_status'));
                    }
                });
            }

            if ($request->filled('on')) {
                $on = Carbon::parse($request->input('on'));
 
                $query->where(function ($q) use ($on) {
                    // $q->whereDate('created_at', $on);
                    $q->orWhereDate('scheduled_at', $on);
                });
            }

            if ($request->boolean('pod_required')) {
                $query->where('pod_required', 1);
            }

            if ($request->boolean('dispatched')) {
                $query->where('dispatched', 1);
            }

            if ($request->has('nearby')) {
                $nearby           = $request->input('nearby');
                $distance         = 6000; // default in meters
                $company          = Company::currentSession();
                $addedNearbyQuery = false;

                if ($company) {
                    $distance = $company->getOption('fleetops.adhoc_distance', 6000);
                }

                // if wants to find nearby place or coordinates
                if (Utils::isCoordinates($nearby)) {
                    $location = Utils::getPointFromMixed($nearby);

                    $query->whereHas('payload', function ($q) use ($location, $distance) {
                        $q->whereHas('pickup', function ($q) use ($location, $distance) {
                            $q->distanceSphere('location', $location, $distance);
                            $q->distanceSphereValue('location', $location);
                        })->orWhereHas('waypoints', function ($q) use ($location, $distance) {
                            $q->distanceSphere('location', $location, $distance);
                            $q->distanceSphereValue('location', $location);
                        });
                    });

                    // Update so additional nearby queries are not added
                    $addedNearbyQuery = true;
                }

                // request wants to find orders nearby a driver ?
                if ($addedNearbyQuery === false && is_string($nearby) && Str::startsWith($nearby, 'driver_')) {
                    $driver = Driver::where('public_id', $nearby)->first();

                    if ($driver) {
                        $query->whereHas('payload', function ($q) use ($driver, $distance) {
                            $q->whereHas('pickup', function ($q) use ($driver, $distance) {
                                $q->distanceSphere('location', $driver->location, $distance);
                                $q->distanceSphereValue('location', $driver->location);
                            })->orWhereHas('waypoints', function ($q) use ($driver, $distance) {
                                $q->distanceSphere('location', $driver->location, $distance);
                                $q->distanceSphereValue('location', $driver->location);
                            });
                        });

                        // Update so additional nearby queries are not added
                        $addedNearbyQuery = true;
                    }
                }

                // if is a string like address string
                if ($addedNearbyQuery === false && is_string($nearby)) {
                    $nearby = Place::createFromMixed($nearby, [], false);

                    if ($nearby instanceof Place) {
                        $query->whereHas('payload', function ($q) use ($nearby, $distance) {
                            $q->whereHas('pickup', function ($q) use ($nearby, $distance) {
                                $q->distanceSphere('location', $nearby->location, $distance);
                                $q->distanceSphereValue('location', $nearby->location);
                            })->orWhereHas('waypoints', function ($q) use ($nearby, $distance) {
                                $q->distanceSphere('location', $nearby->location, $distance);
                                $q->distanceSphereValue('location', $nearby->location);
                            });
                        });

                        // Update so additional nearby queries are not added
                        $addedNearbyQuery = true;
                    }
                }
            }
        });

        return OrderResource::collection($results);
    }

    /**
     * Finds a single Fleetbase Order resources.
     *
     * @return \Fleetbase\Http\Resources\OrderCollection
     */
    public function find($id, Request $request)
    {
        // find for the order
        try {
            $order = Order::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Order resource not found.',
                ],
                404
            );
        }

        // response the order resource
        return new OrderResource($order);
    }


    /**
     * Deletes a Fleetbase Order resources.
     *
     * @return \Fleetbase\Http\Resources\OrderCollection
     */
    public function delete($id, Request $request)
    {
        // find for the driver
        try {
            $order = Order::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Order resource not found.',
                ],
                404
            );
        }

        // delete the order
        $order->delete();

        // response the order resource
        return new DeletedResource($order);
    }

    /**
     * Returns current distance and time matrix for an order.
     *
     * @return \Illuminate\Http\Response $response
     */
    public function getDistanceMatrix(string $id)
    {
        // find the order
        try {
            $order = Order::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Order resource not found.',
                ],
                404
            );
        }

        $order->load(['payload', 'payload.waypoints', 'payload.pickup', 'payload.dropoff']);

        $origin      = $order->payload->pickup ?? $order->payload->waypoints->first();
        $destination = $order->payload->dropoff ?? $order->payload->waypoints->firstWhere('current_waypoint_uuid', $order->current_waypoint_uuid);

        $matrix = Utils::getDrivingDistanceAndTime($origin, $destination);

        $order->update(['distance' => $matrix->distance, 'time' => $matrix->time]);

        // response distance and time matrix
        return response()->json($matrix);
    }

    /**
     * Dispatches an order.
     *
     * @return \Fleetbase\Http\Resources\v1\Order
     */
    public function dispatchOrder(string $id)
    {
        try {
            $order = Order::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Order resource not found.',
                ],
                404
            );
        }

        if (!$order->hasDriverAssigned && !$order->adhoc) {
            return response()->apiError('No driver assigned to dispatch!');
        }

        if ($order->dispatched) {
            return response()->apiError('Order has already been dispatched!');
        }

        $order->dispatch();
        $order->insertDispatchActivity();

        return new OrderResource($order);
    }

    /**
     * Schedules an order using date and time.
     *
     * @param ScheduleOrderRequest
     *
     * @return \Fleetbase\Http\Resources\v1\Order
     */
    public function scheduleOrder(string $id, ScheduleOrderRequest $request)
    {
        $dateInput = $request->input('date');
        $timeInput = $request->input('time');

        // get the default tz
        $company       = Auth::getCompany();
        $defaultTz     = data_get($company, 'timezone', config('app.timezone'));
        $timezoneInput = $request->input('timezone', $defaultTz);

        try {
            $order = Order::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Order resource not found.',
                ],
                404
            );
        }

        // Parse date and time
        $date = Carbon::parse($dateInput);
        if ($timeInput) {
            $time = Carbon::parse($timeInput);
            // Combine date and time
            $date->setTime($time->hour, $time->minute, $time->second);
        }

        // Set the timezone
        $date->shiftTimezone($timezoneInput);

        // Update order with new date and time
        $order->scheduled_at = $date;
        $order->save();

        return new OrderResource($order);
    }

    /**
     * Request to start order, this assumes order is dispatched.
     * Unless there is a param to skip dispatch throw a order not dispatched error.
     *
     * @return \Fleetbase\Http\Resources\v1\Order
     */
    public function startOrder(string $id, Request $request)
    {
        $skipDispatch      = $request->or(['skip_dispatch', 'skipDispatch'], false);
        $assignAdhocDriver = $request->input('assign');

        try {
            $order = Order::findRecordOrFail($id, ['payload.waypoints'], []);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Order resource not found.',
                ],
                404
            );
        }

        if ($order->started &&  $order->status === 'started') {
            return response()->apiError('Order has already started.');
        }
        $status_array = ['Shift Ended','On Break', 'Incident Reported'];
        if (in_array($order->status ,$status_array)) {
            $order->status = 'started';
            $order->save();
            $orderConfig = $order->config();

            // Get the order started activity
            $activity = $orderConfig->getStartedActivity();
            $updateActivityRequest = new Request(['activity' => $activity->serialize()]);

            // update activity
            return $this->updateActivity($order, $updateActivityRequest);
        }
        // if the order is adhoc and the parameter of `assign` is set with a valid driver id, assign the driver and continue
        if ($order->adhoc && $assignAdhocDriver && Str::startsWith($assignAdhocDriver, 'driver_')) {
            $order->assignDriver($assignAdhocDriver, true);
        }

        /** @var \Fleetbase\Models\Driver */
        $driver = Driver::where('uuid', $order->driver_assigned_uuid)->withoutGlobalScopes()->first();

        /** @var \Fleetbase\Models\Payload */
        $payload = Payload::where('uuid', $order->payload_uuid)->withoutGlobalScopes()->with(['waypoints', 'waypointMarkers', 'entities'])->first();

        if ($order->adhoc && !$driver) {
            return response()->apiError('You must send driver to accept adhoc order.');
        }

        if (!$driver) {
            return response()->apiError('No driver assigned to order.');
        }

        // Get the order config
        $orderConfig = $order->config();

        // Get the order started activity
        $activity = $orderConfig->getStartedActivity();

        // Order is not dispatched if next activity code is dispatch or order is not flagged as dispatched
        $isNotDispatched = $order->isNotDispatched;

        // If order is not dispatched yet $activity->is('dispatched') || $order->dispatched === true
        // and not skipping throw order not dispatched error
        if ($isNotDispatched && !$skipDispatch) {
            return response()->apiError('Order has not been dispatched yet and cannot be started.');
        }

        // set order to started
       
        $order->started_at = now();
        $order->started    = true;
        $order->save();

        // trigger start event
        event(new OrderStarted($order));

        // set order as drivers current order
        $driver->current_job_uuid = $order->uuid;
        $driver->save();

        /** @var \Fleetbase\LaravelMysqlSpatial\Types\Point */
        $location = $order->getLastLocation();

        // set first destination for payload
        $payload->setFirstWaypoint($activity, $location);
        $order->setRelation('payload', $payload);

        // update order activity
        $updateActivityRequest = new Request(['activity' => $activity->serialize()]);

        // update activity
        return $this->updateActivity($order, $updateActivityRequest);
    }

    /**
     * Update an order activity.
     *
     * @return \Fleetbase\Http\Resources\v1\Order
     */
    public function updateActivity($id, Request $request)
    {
        $skipDispatch = $request->or(['skip_dispatch', 'skipDispatch'], false);
        $proof        = $request->input('proof', null);
        $order        = null;

        // if instance of order is passed directly to this method
        if ($id instanceof Order) {
            /** @var Order $order */
            $order = $id;
        }

        // if string $id
        if (!$order) {
            try {
                $order = Order::findRecordOrFail($id, ['driverAssigned', 'payload.entities', 'payload.currentWaypoint', 'payload.waypoints']);
            } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
                return response()->json(
                    [
                        'error' => 'Order resource not found.',
                    ],
                    404
                );
            }
        }

        // if no order found
        if (!$order) {
            return response()->apiError('No resource not found.');
        }

        // if order is still status of `created` trigger started flag
        if ($order->status === 'created') {
            $order->started    = true;
            $order->started_at = now();
        }

        // if order is already completed
        if ($order->status === 'completed') {
            return response()->apiError('Order is already completed.');
        }

        // Get the order config
        $orderConfig = $order->config();
        $activity    = $request->array('activity');
        if (!Utils::isActivity($activity)) {
            $activity = new Activity($activity, $order->getConfigFlow());
        }

        // if we're going to skip the dispatch get the next activity status and flow and continue
        if (Utils::isActivity($activity) && $activity->is('dispatched') && $skipDispatch) {
            $activity = $orderConfig->getStartedActivity();
        }

        // handle pickup/dropoff order activity update as normal
        if (Utils::isActivity($activity) && $activity->is('dispatched')) {
            // make sure driver is assigned if not trigger failed dispatch
            if (!$order->hasDriverAssigned && !$order->adhoc) {
                event(new OrderDispatchFailed($order, 'No driver assigned for order to dispatch to.'));

                return response()->apiError('No driver assigned for order to dispatch to.');
            }

            $order->dispatch();

            return new OrderResource($order);
        }

        /** @var \Fleetbase\LaravelMysqlSpatial\Types\Point */
        $location = $order->getLastLocation();

        // if is multi drop order and no current destination set it
        if ($order->payload->isMultipleDropOrder && !$order->payload->current_waypoint_uuid) {
            $order->payload->setFirstWaypoint($activity, $location);
        }

        if (Utils::isActivity($activity) && $activity->completesOrder() && $order->payload->isMultipleDropOrder) {
            // confirm every waypoint is completed
            $isCompleted = $order->payload->waypointMarkers->every(function ($waypoint) {
                return $waypoint->status_code === 'COMPLETED';
            });

            // only update activity for waypoint
            if (!$isCompleted) {
                $order->payload->updateWaypointActivity($activity, $location, $proof);
                $order->payload->setNextWaypointDestination();
                $order->payload->refresh();

                // recheck if order is completed
                $isFullyCompleted = $order->payload->waypointMarkers->every(function ($waypoint) {
                    return $waypoint->status_code === 'COMPLETED';
                });

                if (!$isFullyCompleted) {
                    return new OrderResource($order);
                }
            }
        }

        // Update activity
        $order->updateActivity($activity, $proof);

        // also update for each order entities if not multiple drop order
        // all entities will share the same activity status as is one drop order
        if (!$order->payload->isMultipleDropOrder) {
            foreach ($order->payload->entities as $entity) {
                $entity->insertActivity($activity, $location, $proof);
            }
        } else {
            $order->payload->updateWaypointActivity($activity, $location);
        }

        // Handle order completion
        if (Utils::isActivity($activity) && $activity->completesOrder()) {
            // unset from driver current job
            $order->driverAssigned->unassignCurrentOrder();
            $order->complete();
        }

        return new OrderResource($order);
    }

    /**
     * Retrieve the next activity for the order flow.
     *
     * @return \Illuminate\Http\Response
     */
    public function getNextActivity(string $id)
    {
        try {
            $order = Order::findRecordOrFail($id, ['payload']);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Order resource not found.',
                ],
                404
            );
        }

        $activities = $order->config()->nextActivity();

        // If activity is to complete order add proof of delivery properties if required
        // This is a temporary fix until activity is updated to handle POD on it's own
        $activities = $activities->map(function ($activity) use ($order) {
            if ($activity->completesOrder() && $order->pod_required) {
                $activity->set('require_pod', true);
                $activity->set('pod_method', $order->pod_method);
            }

            return $activity;
        });

        return response()->json($activities);
    }

    /**
     * Confirms and completes an order.
     *
     * @return \Fleetbase\Http\Resources\v1\Order
     */
    public function completeOrder(string $id)
    {
        try {
            $order = Order::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(['success' => false, 'error' => 'Order resource not found.'], 404);
        }
        if($order->status === "completed") {
            return response()->json(['success' => false, 'error' => 'Order has been already completed'], 400);
        }
        $currentWaypoint = $order->payload->waypointMarkers->firstWhere('place_uuid', $order->payload->current_waypoint_uuid);

        if (!$currentWaypoint) {
            return response()->apiError('Current waypoint not found.');
        }
        
        if ($currentWaypoint->status_code !== 'COMPLETED') {
            $this->completeTrackingStatus($currentWaypoint);
        }

        // Ensure all waypoints are completed
        if (!$order->payload->waypointMarkers->every(fn($waypoint) => $waypoint->status_code === 'COMPLETED')) {
            return response()->apiError('Not all waypoints completed for order.');
        }

        $activity = $order->config()->getCompletedActivity();

        if ($order->driverAssigned) {
            $order->driverAssigned->unassignCurrentOrder();
        }

        /** @var \Fleetbase\LaravelMysqlSpatial\Types\Point */
        $location = $order->getLastLocation();
        $order->setStatus($activity->code);
        $order->insertActivity($activity, $location);
        $order->notifyCompleted();

        return new OrderResource($order);
    }

    /**
     * Updates a order to canceled and updates order activity.
     *
     * @return \Fleetbase\Http\Resources\v1\Order
     */
    public function cancelOrder(string $id)
    {
        try {
            $order = Order::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Order resource not found.',
                ],
                404
            );
        }

        $order->cancel();

        return new OrderResource($order);
    }

    /**
     * Updates the order payload destination with a valid place.
     *
     * @return \Fleetbase\Http\Resources\v1\Order
     */
    public function setDestination(string $id, string $placeId)
    {
        try {
            $order = Order::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(['error' => 'Order resource not found.'], 404);
        }
    
        $payload = $order->payload;
        $previousWaypoint = $payload->current_waypoint_uuid;

        if ($previousWaypoint) {
            $waypoint = $payload->waypointMarkers()->where('place_uuid', $previousWaypoint)->first();
            // return $waypoint;
            $this->completeTrackingStatus($waypoint);
        }
       
        $place = $payload->waypoints->firstWhere('public_id', $placeId);
    
        if (!$place) {
            return response()->apiError('Place resource is not a valid destination.');
        }
        $payload->setCurrentWaypoint($place);
    
        return new OrderResource($order);
    }
    

    /**
     * Sends request for route optimization and re-sorts waypoints.
     *
     * @return \Fleetbase\Http\Resources\v1\Order
     */
    public function optimize(string $id)
    {
        try {
            $order = Order::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Order resource not found.',
                ],
                404
            );
        }

        // do this code

        return new OrderResource($order);
    }

    /**
     * Verify & Capture QR Code Scan.
     *
     * @return void
     */
    public function captureQrScan(Request $request, string $id, ?string $subjectId = null)
    {
        $code    = $request->input('code');
        $data    = $request->input('data', []);
        $rawData = $request->input('raw_data');
        $type    = $subjectId ? strtok($subjectId, '_') : null;

        try {
            $order = Order::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Order resource not found.',
                ],
                404
            );
        }

        if (!$code) {
            return response()->apiError('No QR code data to capture.');
        }

        $subject = $type === null ? $order : null;

        switch ($type) {
            case 'place':
            case 'waypoint':
                $subject = Waypoint::where('payload_uuid', $order->payload_uuid)->where(function ($q) use ($code) {
                    $q->whereHas('place', function ($q) use ($code) {
                        $q->where('uuid', $code);
                    });
                    $q->orWhere('uuid', $code);
                })->withoutGlobalScopes()->first();
                break;

            case 'entity':
                $subject = Entity::where('uuid', $code)->withoutGlobalScopes()->first();
                break;

            default:
                break;
        }

        if (!$subject) {
            return response()->apiError('Unable to capture QR code data.');
        }

        // validate
        if ($subject && $code === $subject->uuid) {
            // create verification proof
            $proof = Proof::create([
                'company_uuid' => session('company'),
                'order_uuid'   => $order->uuid,
                'subject_uuid' => $subject->uuid,
                'subject_type' => Utils::getModelClassName($subject),
                'remarks'      => 'Verified by QR Code Scan',
                'raw_data'     => $rawData,
                'data'         => $data,
            ]);

            return new ProofResource($proof);
        }

        return response()->apiError('Unable to validate QR code data.');
    }

    /**
     * Validate a QR code.
     *
     * @return void
     */
    public function captureSignature(Request $request, string $id, ?string $subjectId = null)
    {
        $disk         = $request->input('disk', config('filesystems.default'));
        $bucket       = $request->input('bucket', config('filesystems.disks.' . $disk . '.bucket', config('filesystems.disks.s3.bucket')));
        $signature    = $request->input('signature');
        $data         = $request->input('data', []);
        $remarks      = $request->input('remarks', 'Verified by Signature');
        $type         = $subjectId ? strtok($subjectId, '_') : null;

        try {
            $order = Order::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Order resource not found.',
                ],
                404
            );
        }

        if (!$signature) {
            return response()->apiError('No signature data to capture.');
        }

        $subject = $type === null ? $order : null;

        switch ($type) {
            case 'place':
            case 'waypoint':
                $subject = Waypoint::where('payload_uuid', $order->payload_uuid)->where(function ($q) use ($subjectId) {
                    $q->whereHas('place', function ($q) use ($subjectId) {
                        $q->where('public_id', $subjectId);
                    });
                    $q->orWhere('public_id', $subjectId);
                })->withoutGlobalScopes()->first();
                break;

            case 'entity':
                $subject = Entity::where('public_id', $subjectId)->withoutGlobalScopes()->first();
                break;

            default:
                break;
        }

        if (!$subject) {
            return response()->apiError('Unable to capture signature data.');
        }

        // create proof instance
        $proof = Proof::create([
            'company_uuid' => session('company'),
            'order_uuid'   => $order->uuid,
            'subject_uuid' => $subject->uuid,
            'subject_type' => Utils::getModelClassName($subject),
            'remarks'      => $remarks,
            'raw_data'     => $signature,
            'data'         => $data,
        ]);

        // set the signature storage path
        $path = 'uploads/' . session('company') . '/signatures/' . $proof->public_id . '.png';

        // upload signature
        Storage::disk($disk)->put($path, base64_decode($signature));

        // create file record for upload
        $file = File::create([
            'company_uuid'      => session('company'),
            'uploader_uuid'     => session('user'),
            'name'              => basename($path),
            'original_filename' => basename($path),
            'extension'         => 'png',
            'content_type'      => 'image/png',
            'path'              => $path,
            'bucket'            => $bucket,
            'type'              => 'signature',
            'size'              => Utils::getBase64ImageSize($signature),
        ])->setKey($proof);

        // set file to proof
        $proof->file_uuid = $file->uuid;
        $proof->save();

        return new ProofResource($proof);
    }

    /**
     * Validate a photo.
     *
     * @return void
     */
    public function capturePhoto(Request $request, string $id, ?string $subjectId = null)
    {
        $disk         = $request->input('disk', config('filesystems.default'));
        $bucket       = $request->input('bucket', config('filesystems.disks.' . $disk . '.bucket', config('filesystems.disks.s3.bucket')));
        $photo        = $request->input('photo');
        $data         = $request->input('data', []);
        $remarks      = $request->input('remarks', 'Verified by Photo');
        $type         = $subjectId ? strtok($subjectId, '_') : null;

        try {
            $order = Order::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Order resource not found.',
                ],
                404
            );
        }

        if (!$photo) {
            return response()->apiError('No photo data to capture.');
        }

        $subject = $type === null ? $order : null;

        switch ($type) {
            case 'place':
            case 'waypoint':
                $subject = Waypoint::where('payload_uuid', $order->payload_uuid)->where(function ($q) use ($subjectId) {
                    $q->whereHas('place', function ($q) use ($subjectId) {
                        $q->where('public_id', $subjectId);
                    });
                    $q->orWhere('public_id', $subjectId);
                })->withoutGlobalScopes()->first();
                break;

            case 'entity':
                $subject = Entity::where('public_id', $subjectId)->withoutGlobalScopes()->first();
                break;

            default:
                break;
        }

        if (!$subject) {
            return response()->apiError('Unable to capture photo');
        }

        // create proof instance
        $proof = Proof::create([
            'company_uuid' => session('company'),
            'order_uuid'   => $order->uuid,
            'subject_uuid' => $subject->uuid,
            'subject_type' => Utils::getModelClassName($subject),
            'remarks'      => $remarks,
            'raw_data'     => $photo,
            'data'         => $data,
        ]);

        // set the photo storage path
        $path = 'uploads/' . session('company') . '/photos/' . $proof->public_id . '.png';

        // upload photo
        Storage::disk($disk)->put($path, base64_decode($photo));

        // create file record for upload
        $file = File::create([
            'company_uuid'      => session('company'),
            'uploader_uuid'     => session('user'),
            'name'              => basename($path),
            'original_filename' => basename($path),
            'extension'         => 'png',
            'content_type'      => 'image/png',
            'path'              => $path,
            'bucket'            => $bucket,
            'type'              => 'photo',
            'size'              => Utils::getBase64ImageSize($photo),
        ])->setKey($proof);

        // set file to proof
        $proof->file_uuid = $file->uuid;
        $proof->save();

        return new ProofResource($proof);
    }

    /**
     * Retrieves editable fields for a specific order entity based on its configuration.
     *
     * This function looks up an order by its ID and retrieves configurable editable fields
     * associated with it, as defined in the settings. If the order is not found, it returns
     * a 404 response with an error message. Otherwise, it returns the editable fields for
     * the order entity.
     *
     * @param string  $id      the unique identifier of the order
     * @param Request $request the incoming request instance
     *
     * @return \Illuminate\Http\JsonResponse returns a JSON response containing either an error message
     *                                       or the editable fields for the order entity
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException thrown if the order with the given ID cannot be found
     */
    public function getEditableEntityFields(string $id, Request $request)
    {
        try {
            $order = Order::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Order resource not found.',
                ],
                404
            );
        }

        // Define settings as array
        $entityEditingSettings = [];

        // get the order config id
        $orderConfigId = data_get($order, 'order_config_uuid');

        // Get entity editing settings
        $savedEntityEditingSettings = Setting::where('key', 'fleet-ops.entity-editing-settings')->value('value');
        if ($orderConfigId && $savedEntityEditingSettings) {
            $entityEditingSettings = data_get($savedEntityEditingSettings, $orderConfigId, []);
        }

        return response()->json($entityEditingSettings);
    }

    /*
     * Completes the tracking status for a waypoint
     * @param $waypoint
     * returns void
     */
    private function completeTrackingStatus($waypoint)
    {
        $tracking_number_uuid = $waypoint->tracking_number_uuid;

        if ($tracking_number_uuid) {
            // Bulk update all matching records
            TrackingStatus::where('tracking_number_uuid', $tracking_number_uuid)
                ->update([
                    'status' => 'Waypoint completed',
                    'code' => 'COMPLETED',
                    'details' => 'Waypoint has been completed',
                    'updated_at' => now()
                ]);
        }
    }

}
