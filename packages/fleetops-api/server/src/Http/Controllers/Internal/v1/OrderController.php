<?php

namespace Fleetbase\FleetOps\Http\Controllers\Internal\v1;

use Fleetbase\Exceptions\FleetbaseRequestValidationException;
use Fleetbase\FleetOps\Events\OrderDispatchFailed;
use Fleetbase\FleetOps\Events\OrderReady;
use Fleetbase\FleetOps\Events\OrderStarted;
use Fleetbase\FleetOps\Exports\OrderExport;
use Fleetbase\FleetOps\Flow\Activity;
use Fleetbase\FleetOps\Http\Controllers\FleetOpsController;
use Fleetbase\FleetOps\Http\Requests\BulkDispatchRequest;
use Fleetbase\FleetOps\Http\Requests\CancelOrderRequest;
use Fleetbase\FleetOps\Http\Requests\Internal\CreateOrderRequest;
use Fleetbase\FleetOps\Http\Resources\v1\Order as OrderResource;
use Fleetbase\FleetOps\Imports\OrdersImport;
use Fleetbase\FleetOps\Models\Driver;
use Fleetbase\FleetOps\Models\Entity;
use Fleetbase\FleetOps\Models\Order;
use Fleetbase\FleetOps\Models\OrderConfig;
use Fleetbase\FleetOps\Models\Payload;
use Fleetbase\FleetOps\Models\Place;
use Fleetbase\FleetOps\Models\ServiceQuote;
use Fleetbase\FleetOps\Models\TrackingStatus;
use Fleetbase\FleetOps\Models\Waypoint;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Http\Requests\ExportRequest;
use Fleetbase\Http\Requests\Internal\BulkActionRequest;
use Fleetbase\Http\Requests\Internal\BulkDeleteRequest;
use Fleetbase\Models\CustomFieldValue;
use Fleetbase\Models\File;
use Fleetbase\Models\Type;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Log;

class OrderController extends FleetOpsController
{
    /**
     * The resource to query.
     *
     * @var string
     */
    public $resource = 'order';

    /**
     * Creates a record with request payload.
     *
     * @return \Illuminate\Http\Response
     */
    public function createRecord(Request $request)
    {
        // Create validation request
        $createOrderRequest  = CreateOrderRequest::createFrom($request);
        $rules               = $createOrderRequest->rules();

        // Manually validate request
        $validator = Validator::make($request->input('order'), $rules);
        if ($validator->fails()) {
            return $createOrderRequest->responseWithErrors($validator);
        }

        try {
            $record = $this->model->createRecordFromRequest(
                $request,
                function ($request, &$input) {
                    $serviceQuote = ServiceQuote::resolveFromRequest($request);
            
                    // if service quote is applied, resolve it
                    if ($serviceQuote instanceof ServiceQuote && $serviceQuote->fromIntegratedVendor()) {
                        // create order with integrated vendor, then resume fleetbase order creation
                        try {
                            $integratedVendorOrder = $serviceQuote->integratedVendor->api()->createOrderFromServiceQuote($serviceQuote, $request);
                        } catch (\Exception $e) {
                            return response()->error($e->getMessage());
                        }
            
                        $input['integrated_vendor_order'] = $integratedVendorOrder;
                    }
            
                    // if no type is set its default to default
                    if (!isset($input['type'])) {
                        $input['type'] = 'default';
                    }
            
                    // if no status is set its default to `created`
                    if (!isset($input['status'])) {
                        $input['status'] = 'created';
                    }
            
                    // Set order config
                    if (!isset($input['order_config_uuid'])) {
                        $defaultOrderConfig = OrderConfig::default();
                        if ($defaultOrderConfig) {
                            $input['order_config_uuid'] = $defaultOrderConfig->uuid;
                        }
                    }
                },
                function (&$request, Order &$order, &$requestInput) {
                    $input                   = $request->input('order');
                    $isIntegratedVendorOrder = isset($requestInput['integrated_vendor_order']);
                    $serviceQuote            = ServiceQuote::resolveFromRequest($request);
            
                    $route               = Utils::get($input, 'route');
                    $payload             = Utils::get($input, 'payload');
                    $waypoints           = Utils::get($input, 'payload.waypoints');
                    $entities            = Utils::get($input, 'payload.entities');
                    $uploads             = Utils::get($input, 'files', []);
                    $customFieldValues   = Utils::get($input, 'custom_field_values', []);
            
                    // Save order to database first, ensuring it has an ID
                    $order->save(); // Ensure order is saved before further processing
            
                    // Now perform actions that require an order ID
                    $isUnavailability = $request->input('mark_as_unavailable');
                    if(!isset($isUnavailability)){
                    $order
                        ->setRoute($route)
                        ->setStatus('created', false)
                        ->insertPayload($payload)
                        ->insertWaypoints($waypoints)
                        ->insertEntities($entities);
                    }
                    else{
                        $order->setStatus('created', false);
                    }
                    // If order creation includes files associate each to this order
                    if ($uploads) {
                        $ids   = collect($uploads)->pluck('uuid');
                        $files = File::whereIn('uuid', $ids)->get();
            
                        foreach ($files as $file) {
                            $file->setKey($order);
                        }
                    }
            
                    // Save custom field values
                    if (is_array($customFieldValues)) {
                        foreach ($customFieldValues as $customFieldValue) {
                            CustomFieldValue::create([
                                'company_uuid'      => session('company'),
                                'custom_field_uuid' => data_get($customFieldValue, 'custom_field_uuid'),
                                'subject_uuid'      => $order->uuid,
                                'subject_type'      => Utils::getMutationType($order),
                                'value'             => data_get($customFieldValue, 'value'),
                                'value_type'        => data_get($customFieldValue, 'value_type', 'text'),
                            ]);
                        }
                    }
            
                    // If it's integrated vendor order apply to meta
                    if ($isIntegratedVendorOrder) {
                        $order->updateMeta(
                            [
                                'integrated_vendor'       => Utils::get($requestInput['integrated_vendor_order'], 'metadata.integrated_vendor'),
                                'integrated_vendor_order' => $requestInput['integrated_vendor_order'],
                            ]
                        );
                    }
            
                    // Notify driver if assigned
                    if((!isset($isUnavailability)) && (!empty($order->driver_assigned_uuid))){
                        $order->notifyDriverAssigned();
                    }       
            
                    // Set driving distance and time
                    $order->setPreliminaryDistanceAndTime();
            
                    // If service quote attached purchase
                    $order->purchaseServiceQuote($serviceQuote);
            
                    // Dispatch if flagged true
                    $order->firstDispatchWithActivity();
            
                    // Load tracking number
                    if(!isset($isUnavailability)){
                    $order->load(['trackingNumber']);
                    }
                }
            );
            
            // Trigger order created event
            event(new OrderReady($record));
            
            // Return response
            return ['order' => new $this->resource($record)];
        }
            
        catch (\Exception $e) {
            // Log the exception with the message and trace for debugging purposes
            Log::error('An exception occurred.', [
                'message' => $e->getMessage(),
                'trace'   => $e->getTraceAsString()
            ]);
        }
        catch (\Illuminate\Database\QueryException $e) {
            return response()->error($e->getMessage());
        } catch (FleetbaseRequestValidationException $e) {
            return response()->error($e->getErrors());
        }
    }

    /**
     *  Route which enables editing of an order route.
     *
     * @param string $id - The order ID
     *
     * @return Response
     */
    public function editOrderRoute(string $id, Request $request)
    {
        $pickup    = $request->input('pickup');
        $dropoff   = $request->input('dropoff');
        $return    = $request->input('return');
        $waypoints = $request->array('waypoints', []);

        // Get the order
        $order = Order::where('uuid', $id)->with(['payload'])->first();
        if (!$order) {
            return response()->error('Unable to find order to update route for.');
        }

        // Handle update of multiple waypoints
        if ($waypoints) {
            $order->payload->updateWaypoints($waypoints);
            $order->payload->removePlace(['pickup', 'dropoff', 'return'], ['save' => true]);
        } else {
            // Update pickup
            if ($pickup) {
                $order->payload->setPickup($pickup, ['save' => true]);
            }

            // Update dropoff
            if ($dropoff) {
                $order->payload->setDropoff($dropoff, ['save' => true]);
            }

            // Update return
            if ($return) {
                $order->payload->setDropoff($return, ['save' => true]);
            }

            // Remove waypoints if any
            $order->payload->removeWaypoints();
        }

        return ['order' => new $this->resource($order)];
    }

    /**
     * Process import files (excel,csv) into Fleetbase order data.
     *
     * @return \Illuminate\Http\Response
     */
    public function importFromFiles(Request $request)
    {
        $info    = Utils::lookupIp();
        $disk    = $request->input('disk', config('filesystems.default'));
        $files   = $request->input('files');
        $files   = File::whereIn('uuid', $files)->get();
        $country = $request->input('country', Utils::or($info, ['country_name', 'region'], 'Singapore'));

        $validFileTypes = ['csv', 'tsv', 'xls', 'xlsx'];
        $imports        = collect();

        foreach ($files as $file) {
            // validate file type
            if (!Str::endsWith($file->path, $validFileTypes)) {
                return response()->error('Invalid file uploaded, must be one of the following: ' . implode(', ', $validFileTypes));
            }

            try {
                $data = Excel::toArray(new OrdersImport(), $file->path, $disk);
            } catch (\Exception $e) {
                return response()->error('Invalid file, unable to proccess.');
            }

            $imports = $imports->concat($data);
        }

        $places   = collect();
        $entities = collect();

        foreach ($imports as $rows) {
            foreach ($rows as $row) {
                if (empty($row) || empty(array_values($row))) {
                    continue;
                }

                $importId = (string) Str::uuid();
                $place    = Place::createFromImportRow($row, $importId, $country);

                if (!$place) {
                    continue;
                }

                $places[] = $place;

                $items          = Utils::or($row, ['items', 'entities', 'packages', 'passengers', 'products', 'services']);
                $itemsDelimiter = Utils::findDelimiterFromString($items, '|');
                $items          = is_string($items) ? explode($itemsDelimiter, $items) : [];

                foreach ($items as $itemName) {
                    $entity = new Entity(['name' => $itemName]);
                    $entity->setAttribute('destination_uuid', $place->uuid);
                    $entity->setAttribute('_import_id', $importId);
                    $entity->setMeta($place->getMeta());
                    $entities[] = $entity;
                }
            }
        }

        return response()->json(
            [
                'entities' => $entities,
                'places'   => $places,
            ]
        );
    }

    /**
     * Updates a order to canceled and updates order activity.
     *
     * @return \Illuminate\Http\Response
     */
    public function bulkDelete(BulkDeleteRequest $request)
    {
        $ids = $request->input('ids', []);

        if (!$ids) {
            return response()->error('Nothing to delete.');
        }

        /** @var \Fleetbase\Models\Order */
        $count   = Order::whereIn('uuid', $ids)->count();
        $deleted = Order::whereIn('uuid', $ids)->delete();

        if (!$deleted) {
            return response()->error('Failed to bulk delete orders.');
        }

        return response()->json(
            [
                'status'  => 'OK',
                'message' => 'Deleted ' . $count . ' orders',
                'count'   => $count,
            ]);
    }

    /**
     * Updates a order to canceled and updates order activity.
     *
     * @return \Illuminate\Http\Response
     */
    public function bulkCancel(BulkActionRequest $request)
    {
        /** @var \Fleetbase\Models\Order */
        $orders = Order::whereIn('uuid', $request->input('ids'))->get();

        $count      = $orders->count();
        $failed     = [];
        $successful = [];

        foreach ($orders as $order) {
            if ($order->status === 'canceled') {
                $failed[] = $order->uuid;
                continue;
            }

            $trackingStatusExists = TrackingStatus::where(['tracking_number_uuid' => $order->tracking_number_uuid, 'code' => 'CANCELED'])->exists();
            if ($trackingStatusExists) {
                $failed[] = $order->uuid;
                continue;
            }

            $order->cancel();
            $successful[] = $order->uuid;
        }

        return response()->json(
            [
                'status'     => 'OK',
                'message'    => 'Canceled ' . $count . ' orders',
                'count'      => $count,
                'failed'     => $failed,
                'successful' => $successful,
            ]
        );
    }

    /**
     * Dispatches orders in bulk.
     *
     * @return \Illuminate\Http\Response
     */
    public function bulkDispatch(BulkDispatchRequest $request)
    {
        /** @var \Fleetbase\Models\Order */
        $orders = Order::whereIn('uuid', $request->input('ids'))->get();

        $count      = $orders->count();
        $failed     = [];
        $successful = [];

        foreach ($orders as $order) {
            if ($order->status !== 'created') {
                $failed[] = $order->uuid;
                continue;
            }

            $trackingStatusExists = TrackingStatus::where(['tracking_number_uuid' => $order->tracking_number_uuid, 'code' => 'CANCELED'])->exists();
            if ($trackingStatusExists) {
                $failed[] = $order->uuid;
                continue;
            }

            $order->dispatch();
            $successful[] = $order->uuid;
        }

        return response()->json(
            [
                'status'     => 'OK',
                'message'    => 'Dispatched ' . $count . ' orders',
                'count'      => $count,
                'failed'     => $failed,
                'successful' => $successful,
            ]
        );
    }

    /**
     * Updates a order to canceled and updates order activity.
     *
     * @param \Fleetbase\Http\Requests\CancelOrderRequest $request
     *
     * @return \Illuminate\Http\Response
     */
    public function cancel(CancelOrderRequest $request)
    {
        /** @var \Fleetbase\Models\Order */
        $order = Order::where('uuid', $request->input('order'))->first();

        $order->cancel();

        return response()->json(
            [
                'status'  => 'OK',
                'message' => 'Order was canceled',
                'order'   => $order->uuid,
            ]
        );
    }

    /**
     * Dispatches an order.
     *
     * @return \Illuminate\Http\Response
     */
    public function dispatchOrder(Request $request)
    {
        /**
         * @var \Fleetbase\Models\Order
         */
        $order = Order::select(['uuid', 'driver_assigned_uuid', 'order_config_uuid', 'adhoc', 'dispatched', 'dispatched_at'])->where('uuid', $request->input('order'))->withoutGlobalScopes()->first();
        if (!$order) {
            return response()->error('No order found to dispatch.');
        }

        // if order has no config set, set default config
        $order->loadMissing('orderConfig');
        if (!$order->orderConfig) {
            $defaultOrderConfig = OrderConfig::default();
            if ($defaultOrderConfig) {
                $order->update(['order_config_uuid' => $defaultOrderConfig->uuid]);
                $order->loadMissing('orderConfig');
            }
        }

        if (!$order->hasDriverAssigned && !$order->adhoc) {
            return response()->error('No driver assigned to dispatch!');
        }

        if ($order->dispatched) {
            return response()->error('Order has already been dispatched!');
        }

        $order->dispatchWithActivity();

        return response()->json(
            [
                'status'  => 'OK',
                'message' => 'Order was dispatched',
                'order'   => $order->uuid,
            ]
        );
    }

    /**
     * Internal request for driver to start order.
     *
     * @return \Illuminate\Http\Response
     */
    public function start(Request $request)
    {
        /**
         * @var Order
         */
        $order = Order::where('uuid', $request->input('order'))->withoutGlobalScopes()->first();

        if (!$order) {
            return response()->error('Unable to find order to start.');
        }

        if ($order->started) {
            return response()->error('Order has already been started.');
        }

        /**
         * @var Driver
         */
        $driver = Driver::where('uuid', $order->driver_assigned_uuid)->withoutGlobalScopes()->first();

        /**
         * @var Payload
         */
        $payload = Payload::where('uuid', $order->payload_uuid)->withoutGlobalScopes()->with(['waypoints', 'waypointMarkers', 'entities'])->first();

        if (!$driver) {
            return response()->error('No driver assigned to order.');
        }

        // set order to started
        $order->started    = true;
        $order->started_at = now();
        $order->save();

        // trigger start event
        event(new OrderStarted($order));

        // set order as drivers current order
        $driver->current_job_uuid = $order->uuid;
        $driver->save();

        // get the next order activity
        $flow = $activity = $order->config()->nextFirstActivity();

        /**
         * @var \Fleetbase\LaravelMysqlSpatial\Types\Point
         */
        $location = $order->getLastLocation();

        // if multi drop order set first destination
        if ($payload->isMultipleDropOrder) {
            $firstDestination = $payload->waypoints->first();

            if ($firstDestination) {
                $payload->current_waypoint_uuid = $firstDestination->uuid;
                $payload->save();
            }

            // update activity for each waypoint and entity
            foreach ($payload->waypointMarkers as $waypointMarker) {
                $waypointMarker->insertActivity($activity, $location);
            }

            foreach ($payload->entities as $entity) {
                $entity->insertActivity($activity, $location);
            }
        }

        // update order activity
        $updateActivityRequest = new Request(['activity' => $flow]);

        // update activity
        return $this->updateActivity($order->uuid, $updateActivityRequest);
    }

    /**
     * Update an order activity.
     *
     * @return \Illuminate\Http\Response
     */
    public function updateActivity(string $id, Request $request)
    {
        $order = Order::withoutGlobalScopes()
            ->where('uuid', $id)
            ->with(['driverAssigned'])
            ->whereNull('deleted_at')
            ->orWhere('public_id', $id)
            ->with(['payload.entities'])
            ->first();

        if (!$order) {
            return response()->error('No order found.');
        }

        $activity = $request->array('activity');
        $activity = new Activity($activity, $order->getConfigFlow());

        // Handle pickup/dropoff order activity update as normal
        if (Utils::isActivity($activity) && $activity->is('dispatched')) {
            // make sure driver is assigned if not trigger failed dispatch
            if (!$order->hasDriverAssigned && !$order->adhoc) {
                event(new OrderDispatchFailed($order, 'No driver assigned for order to dispatch to.'));

                return response()->error('No driver assigned for order to dispatch to.');
            }

            $order->dispatch();

            return response()->json(['status' => 'dispatched']);
        }

        /**
         * @var \Fleetbase\LaravelMysqlSpatial\Types\Point
         */
        $location = $order->getLastLocation();
        $order->setStatus($activity->code);
        $order->insertActivity($activity, $location);

        // also update for each order entities if not multiple drop order
        // all entities will share the same activity status as is one drop order
        if (!$order->payload->isMultipleDropOrder) {
            foreach ($order->payload->entities as $entity) {
                $entity->insertActivity($activity, $location);
            }
        }

        // Handle order completed
        if (Utils::isActivity($activity) && $activity->completesOrder() && $order->driverAssigned) {
            // unset from driver current job
            $order->driverAssigned->unassignCurrentOrder();
            $order->complete();
        }

        // Fire activity events
        $activity->fireEvents($order);

        return response()->json(['status' => 'ok']);
    }

    /**
     * Finds and responds with the orders next activity update based on the orders configuration.
     *
     * @return \Illuminate\Http\Response
     */
    public function nextActivity(string $id)
    {
        $order = Order::withoutGlobalScopes()
            ->where('uuid', $id)
            ->orWhere('public_id', $id)
            ->first();

        if (!$order) {
            return response()->error('No order found.');
        }

        $nextActivities = $order->config()->nextActivity();

        return response()->json($nextActivities);
    }

    /**
     * Finds and responds with the orders next activity update based on the orders configuration.
     *
     * @return \Illuminate\Http\Response
     */
    public function trackerInfo(string $id)
    {
        $order = Order::withoutGlobalScopes()
            ->where('uuid', $id)
            ->orWhere('public_id', $id)
            ->first();

        if (!$order) {
            return response()->error('No order found.');
        }

        $trackerInfo = $order->tracker()->toArray();

        return response()->json($trackerInfo);
    }

    public function waypointEtas(string $id)
    {
        $order = Order::withoutGlobalScopes()
            ->where('uuid', $id)
            ->orWhere('public_id', $id)
            ->first();

        if (!$order) {
            return response()->error('No order found.');
        }

        // Get order tracker
        $eta = $order->tracker()->eta();

        return response()->json($eta);
    }

    /**
     * Get all status options for an order.
     *
     * @return \Illuminate\Http\Response
     */
    public function statuses()
    {
        $statuses = DB::table('orders')
            ->select('status')
            ->where('company_uuid', session('company'))
            ->distinct()
            ->get()
            ->pluck('status')
            ->filter();

        return response()->json($statuses);
    }

    /**
     * Get all order type options.
     *
     * @return \Illuminate\Http\Response
     */
    public function types()
    {
        $defaultTypes = collect(config('api.types.order', []))->map(
            function ($attributes) {
                return new Type($attributes);
            }
        );
        $customTypes = Type::where('for', 'order')->get();

        $results = collect([...$customTypes, ...$defaultTypes])
            ->unique('key')
            ->values();

        return response()->json($results);
    }

    /**
     * Sends back the PDF stream for an order label file.
     *
     * @return void
     */
    public function label(string $publicId, Request $request)
    {
        $format  = $request->input('format', 'stream');
        $type    = $request->input('type', strtok($publicId, '_'));
        $subject = null;

        switch ($type) {
            case 'order':
                $subject = Order::where('public_id', $publicId)->orWhere('uuid', $publicId)->withoutGlobalScopes()->first();
                break;

            case 'waypoint':
                $subject = Waypoint::where('public_id', $publicId)->orWhere('uuid', $publicId)->withoutGlobalScopes()->first();
                break;

            case 'entity':
                $subject = Entity::where('public_id', $publicId)->orWhere('uuid', $publicId)->withoutGlobalScopes()->first();
                break;
        }

        if (!$subject) {
            return response()->error('Unable to render label.');
        }

        switch ($format) {
            case 'pdf':
            case 'stream':
            default:
                $stream = $subject->pdfLabelStream();

                return $stream;

            case 'text':
                $text = $subject->pdfLabel()->output();

                return response()->make($text);

            case 'base64':
                $base64 = base64_encode($subject->pdfLabel()->output());

                return response()->json(['data' => mb_convert_encoding($base64, 'UTF-8', 'UTF-8')]);
        }

        return response()->error('Unable to render label.');
    }

    /**
     * Export the issue to excel or csv.
     *
     * @return \Illuminate\Http\Response
     */
    public function export(ExportRequest $request)
    {
        $format       = $request->input('format', 'xlsx');
        $selections   = $request->array('selections');
        $fileName     = trim(Str::slug('order-' . date('Y-m-d-H:i')) . '.' . $format);

        return Excel::download(new OrderExport($selections), $fileName);
    }

    public function getDefaultOrderConfig()
    {
        return response()->json(OrderConfig::default());
    }

    public function lookup(Request $request)
    {
        $trackingNumber = $request->input('tracking');
        if (!$trackingNumber) {
            return response()->error('No tracking number provided for lookup.');
        }

        $order = Order::whereHas(
            'trackingNumber',
            function ($query) use ($trackingNumber) {
                $query->where('tracking_number', $trackingNumber);
            }
        )->first();

        if (!$order) {
            return response()->error('No order found using tracking number provided.');
        }

        // load required relations
        $order->loadMissing(['trackingNumber', 'payload', 'trackingStatuses']);

        // load tracker data
        $order->tracker_data = $order->tracker()->toArray();
        $order->eta          = $order->tracker()->eta();

        return new OrderResource($order);
    }
}
