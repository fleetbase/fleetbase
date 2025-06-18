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
use Carbon\Carbon;
use Fleetbase\FleetOps\Models\Waypoint;
use Fleetbase\FleetOps\Models\RouteSegment;
use App\Helpers\UserHelper;

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
        set_time_limit(0); // Allow script to run indefinitely
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
                        $input['type'] = 'transport';
                    }
            
                    // if no status is set its default to `created`
                    if (!isset($input['status'])) {
                        $input['status'] = 'created';
                    }
            
                    // Set order config
                    if (!isset($input['order_config_uuid'])) {
                        $defaultOrderConfig = OrderConfig::where('key', 'transport')
                        ->where('company_uuid', session('company'))
                        ->whereNull('deleted_at')
                        ->first();
                
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
                    
                    $order
                        ->setRoute($route)
                        ->setStatus('created', false)
                        ->insertPayload($payload)
                        ->insertWaypoints($waypoints)
                        ->insertEntities($entities);
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
                
                //if payload waypoints are set, create entries in route_segments table
                    if (isset($payload) && isset($order)) {
                                $payload_uuid = $order->payload_uuid ?? null;
                                if (!empty($payload_uuid)) {
                                    // Fetch waypoints from DB using payload_uuid
                                    $waypoints = $this->getWaypoints($payload_uuid);
                                    // if ($waypoints &&  $waypoints->count() > 2) {
                                    $this->createRouteSegments($waypoints, $order->id, $payload_uuid);
                                //}
                            }
                        }
                        // Notify driver if assigned
                        $order->notifyDriverAssigned();
                
                        // Set driving distance and time
                        $order->setPreliminaryDistanceAndTime();
                
                        // If service quote attached purchase
                        $order->purchaseServiceQuote($serviceQuote);
                
                        // Dispatch if flagged true
                        $order->firstDispatchWithActivity();
                
                        // Load tracking number
                        $order->load(['trackingNumber']);
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
            return response()->error($e->getMessage());
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
            //update route segments
            $payload_uuid = $order->payload_uuid ?? null;
            if (!empty($payload_uuid)) {
                //fetch route segments from DB using payload_uuid & deleted them
                RouteSegment::where('payload_id', $payload_uuid)
                    ->where('deleted', 0)
                    ->update([
                        'record_status' => config('params.record_status_archived'),
                        'deleted'       => config('params.deleted'),
                        'updated_by_id' => UserHelper::getIdFromUuid(auth()->id())
                    ]);
                // Fetch waypoints from DB using payload_uuid
                $waypoints = $this->getWaypoints($payload_uuid);
                // If waypoints are set, create entries in route_segments table
                $createRouteSegment = $this->createRouteSegments($waypoints, $order->id, $payload_uuid);
              
            }
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
        // $country = $request->input('country', Utils::or($info, ['country_name', 'region'], 'Singapore'));

        $validFileTypes = ['csv', 'tsv', 'xls', 'xlsx'];
        // $imports        = collect();

        foreach ($files as $file) {
            // validate file type
            if (!Str::endsWith($file->path, $validFileTypes)) {
                return response()->error('Invalid file uploaded, must be one of the following: ' . implode(', ', $validFileTypes));
            }

            try {
                $data = Excel::toArray(new OrdersImport(), $file->path, $disk);
                $data_import = $this->orderImport($data);
               // Convert JsonResponse to array
               if ($data_import instanceof \Illuminate\Http\JsonResponse) {
                $data_import = json_decode($data_import->getContent(), true);
                }
            
                if (!empty($data_import) && isset($data_import['errors'])) {
                    $errors = $data_import['errors'];
                    
                    // Check for duplicate entry error
                    if (is_string($errors) && str_contains($errors, 'SQLSTATE[23000]') && str_contains($errors, 'Duplicate entry') && str_contains($errors, 'orders.orders_public_id_unique')) {
                        return response()->json([
                            'status' => 'error',
                            'message' => 'Order exists with same block ID or trip ID',
                            'errors' => $errors
                        ], 422);
                    }

                    return response()->json([
                        'status' => 'error',
                        'message' => __('messages.import_failed'),
                        'errors' => $errors
                    ], 422);
                }
            } catch (\Exception $e) {
                return response()->error(__('messages.invalid_file'));
            }

        }
        
        return response()->json(
            [
                'succeed' => true,
                'message' => __('messages.order_import_success')
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
    public function statuses(Request $request)
    {
        try {
            if (!session('company')) {
                return response()->json([]);
            }
            $statuses = DB::table('orders')
                ->select('status')
                ->where('company_uuid', session('company'))
                ->whereNull('deleted_at')
                ->whereNotNull('status')  // Ensure we don't get null statuses
                ->where('status', '!=', '') // Ensure we don't get empty strings
                ->distinct()
                ->orderBy('status', 'asc')  // Sort alphabetically
                ->get()
                ->pluck('status')
                ->filter();
            if ($request->has('is_filter_status')) {
                    $formattedStatuses = $statuses->map(function ($status) {
                        return [
                            'code' => $status,
                            'label' => ucfirst(str_replace(['-', '_'], ' ', $status))
                        ];
                    });
                    return response()->json($formattedStatuses);
                }
            return response()->json($statuses);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch order statuses'], 500);
        }
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
        try{
             return Excel::download(new OrderExport($selections), $fileName);
        }
        catch (\Exception $e) {
            return response()->error('Failed to export orders: ' . $e->getMessage());
        }
       
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

    

    public function orderImport($excelData)
    {
        
        try {
            $records = [];
    
            // Print excelData for debugging
            Log::info('Excel Data:', ['data' => $excelData]);
    
            // Process all rows in excelData (both rows)
            foreach ($excelData as $rowData) {
                foreach ($rowData as $row) {
                    $waypoints = [];
                    $order = 0;
                    $i = 1;
                    // Debug log for each row
                    Log::info('Processing Row:', ['block_id' => $row['block_id'], 'trip_id' => $row['trip_id']]);
    
                    // Process waypoints for each stop
                    while (array_key_exists("stop_" . $i, $row)) {
                        $stopKey = "stop_" . $i;
                        $arrivalKey = "stop_" . $i . "_yard_arrival";
                        $departureKey = "stop_" . $i . "_yard_departure";

                        if (!empty($row[$stopKey])) {
                            $place = Place::where('code', $row[$stopKey])->first();

                            if ($place) {
                                $waypoints[] = [
                                    'place_uuid' => $place->uuid,
                                    'public_id' => $i === 1 ? $row['vr_id'] : null,
                                    'order' => $order++,
                                    'meta' => [
                                        'yard_arrival' => $row[$arrivalKey] ?? null,
                                        'yard_departure' => $row[$departureKey] ?? null
                                    ]
                                ];
                            }
                        }
                        $i++;
                    }
    
                    $orderInput = [
                        'order' => [
                            'internal_id' => isset($row['block_id']) && !empty($row['block_id']) ? $row['block_id'] : null,
                            'public_id' => isset($row['trip_id']) && !empty($row['trip_id']) ? $row['trip_id'] : null,
                            'status' => $row['status'] ? strtolower($row['status']) : null,
                            'type' => 'transport',
                            'scheduled_at' => isset($row['start_date']) && !empty($row['start_date']) 
                                ? Carbon::parse(str_replace('/', '-', $row['start_date']))->format('Y-m-d H:i:s')
                                : null,
                            'estimated_end_date' => isset($row['end_date']) && !empty($row['end_date']) 
                                ? Carbon::parse(str_replace('/', '-', $row['end_date']))->format('Y-m-d H:i:s')
                                : null,
                            'meta' => [
                                'vehicle_id' => isset($row['vehicle_id']) && !empty($row['vehicle_id']) ? $row['vehicle_id'] : null,
                                'carrier' => isset($row['carrier']) && !empty($row['carrier']) ? $row['carrier'] : null,
                                'subcarrier' => isset($row['subcarrier']) && !empty($row['subcarrier']) ? $row['subcarrier'] : null,
                                'equipment_type' => isset($row['equipment_type']) && !empty($row['equipment_type']) ? $row['equipment_type'] : null,
                                'cpt' => isset($row['cpt']) && !empty($row['cpt']) ? $row['cpt'] : null
                            ],
                            'payload' => [
                                'waypoints' => $waypoints
                            ]
                        ]
                    ];
    
                    $orderRequest = new Request();
                    $orderRequest->merge($orderInput);
    
                    $record = $this->model->createRecordFromRequest(
                        $orderRequest,
                        function ($request, &$input) {
                            if (!isset($input['order_config_uuid'])) {
                                $defaultOrderConfig = OrderConfig::where('key', 'transport')->first();
                                if ($defaultOrderConfig) {
                                    $input['order_config_uuid'] = $defaultOrderConfig->uuid;
                                }
                            }
                        },
                        function (&$request, Order &$order, &$requestInput) {
                            $input = $request->input('order');
                            
                            // Save order first
                            $order->save();
    
                            // Create payload
                            $payload = new Payload([
                                'company_uuid' => session('company'),
                                'type' => 'transport'
                            ]);
                            $payload->save();
    
                            // Associate payload with order
                            $order->payload_uuid = $payload->uuid;
                            $order->save();
    
                            // Get waypoints data
                            $waypoints = Utils::get($input, 'payload.waypoints', []);
                            if ($waypoints && count($waypoints) > 2) {
                            // Create waypoints
                                foreach ($waypoints as $waypointData) {
                                    Waypoint::create(array_merge($waypointData, [
                                        'company_uuid' => session('company'),
                                        'payload_uuid' => $payload->uuid
                                    ]));
                                }
                            }
                            //create route segments
                            $payload_uuid = $payload->uuid ?? null;
                            if (!empty($payload_uuid)) {
                                $waypoints = $this->getWaypoints($payload_uuid);
                                $this->createRouteSegments($waypoints, $order->id, $payload_uuid);
                            }
    
                            // Set status
                            $order->setStatus($input['status'], false);
                            $order->setPreliminaryDistanceAndTime();
                        }
                    );
    
                    $records[] = $record;
                    event(new OrderReady($record));
                }
            }
    
            // return ['orders' => $records];
    
        } 
        catch (\Exception $e) {
            Log::error('An exception occurred.', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(data: ['success' => false, 'errors' => $e->getMessage()],status: 400);
        }
    }
    /*
        * Get the wayppoints for the payload of an order.
        *
        * @return \Illuminate\Http\Response
        */
    public function getWaypoints($payload_uuid)
    {
        $waypoints = Waypoint::where('payload_uuid', $payload_uuid)
                      ->whereNull('deleted_at')
                      ->orderBy('order') // optional, if you want them in order
                      ->get();
        return $waypoints;
    }

    /**
     * Create route segments from waypoints.
     *
     * @param array $waypoints
     * @param int $orderId
     * @param string $payloadUuid
     * @return void
     */
    public function createRouteSegments($waypoints, $orderId, $payloadUuid): void
    {
        if ($waypoints && count($waypoints) > 2) {
            foreach ($waypoints as $index => $waypoint) {
                if ($index === 0) {
                    // Skip the first waypoint as it has no previous waypoint
                    continue;
                }
                $routeSegment = new RouteSegment();
                $routeSegment->order_id = $orderId;
                $routeSegment->payload_id = $payloadUuid;
                $routeSegment->from_waypoint_id = $index > 0 ? $waypoints[$index - 1]->uuid : null;
                $routeSegment->to_waypoint_id = $waypoint->uuid;
                $routeSegment->public_id = 'VR_' . Str::upper(Str::random(5));
                $routeSegment->company_uuid = session('company');
                $routeSegment->created_by_id =  UserHelper::getIdFromUuid(auth()->id());
                $routeSegment->save();
            }
        }
    }
    /**
     * Get the order route segments .
     *
     * @return \Illuminate\Http\Response
     */
    public function getOrderRouteSegments(string $id)
    {
        $order = Order::withoutGlobalScopes()
            ->where('payload_uuid', $id)
            ->where('deleted', 0)
            ->with([
                'routeSegments.fromWaypoint.place',
                'routeSegments.toWaypoint.place'
            ])
            ->first();

        if (!$order) {
            return response()->json(['error' => 'No order found.'], 404);
        }

        // Get route segments
        $routeSegments = $order->routeSegments->map(function ($segment) use ($order) {
        // Add from_place_name and to_place_name
            $segment->from_place_name = $segment->fromWaypoint->place->name ?? null;
            $segment->to_place_name = $segment->toWaypoint->place->name ?? null;
            // Add order public_id
            $segment->order_public_id = $order->public_id;
            return $segment;
        });
        return response()->json($routeSegments);
    }
}
