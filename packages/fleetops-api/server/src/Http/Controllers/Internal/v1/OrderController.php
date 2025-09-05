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
use Fleetbase\FleetOps\Models\AmazonWarehouse;
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
use Fleetbase\FleetOps\Exports\OrdersImportErrorsExport;
use Illuminate\Support\Facades\Storage;
use Fleetbase\FleetOps\Models\Fleet;
use Fleetbase\FleetOps\Models\ImportLog;
use Fleetbase\FleetOps\Models\OrderStatus;
use Fleetbase\FleetOps\Exports\OrderExportChange;
use Fleetbase\FleetOps\Traits\ImportErrorHandler;


class OrderController extends FleetOpsController
{
    use ImportErrorHandler;

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
            try{
            $order->payload->updateWaypoints($waypoints);
            }
            catch (\Exception $e) {
                return response()->error('Failed to update waypoints: ' . $e->getMessage());
            }
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
                        'updated_by_id' => UserHelper::getIdFromUuid(auth()->id()),
                        'deleted_at'   => now()
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

    $validFileTypes = ['csv', 'tsv', 'xls', 'xlsx'];
    $allErrors = [];
    $totalSuccessfulImports = 0;
    $totalCreatedOrders = 0;
    $totalUpdatedOrders = 0;
    $hasPartialSuccess = false;

    foreach ($files as $file) {
        // validate file type
        if (!Str::endsWith($file->path, $validFileTypes)) {
            $allErrors[] = ['N/A', 'Invalid file uploaded: ' . $file->name, 'N/A'];
            continue;
        }

        try {
            $data = Excel::toArray(new OrdersImport(), $file->path, $disk);
            // Flatten all rows from all sheets
            $totalRows = collect($data)->flatten(1)->count();
            Log::info('Total rows: ' . $totalRows .", Company: ". session('company'));
            if ($totalRows > config('params.maximum_import_row_size')) {
                return response(response()->json([
                    'success' => false,
                    'message' => "Import failed: Maximum of 500 rows allowed. Your file contains {$totalRows} rows.",
                    'status' => 'limit_exceeded'
                ], 400));
            }
            $requiredHeaders = [
                "block_id",
                "trip_id",
                "stop_1",
                "stop_2"
            ];
            $validation = $this->validateImportHeaders($data, $requiredHeaders);
            if (!$validation['success']) {
                return response()->json($validation);
            }
            $data_import = $this->orderImport($data);

            // Convert JsonResponse to array
            if ($data_import instanceof \Illuminate\Http\JsonResponse) {
                $data_import = json_decode($data_import->getContent(), true);
            }

            if (!empty($data_import) && isset($data_import['errors'])) {
                $errors = $data_import['errors'];
                
                // Track partial success information
                if (isset($data_import['partial_success']) && $data_import['partial_success']) {
                    $hasPartialSuccess = true;
                    $totalSuccessfulImports += $data_import['successful_imports'] ?? 0;
                    $totalCreatedOrders += $data_import['created_orders'] ?? 0;
                    $totalUpdatedOrders += $data_import['updated_orders'] ?? 0;
                }

                // Append detailed errors - ensure they're in the correct format
                if (is_array($errors)) {
                    foreach ($errors as $error) {
                        if (is_array($error)) {
                            // Error is already in array format [row, message, trip_id]
                            $allErrors[] = $error;
                        } else {
                            // Error is a string, format it properly
                            $allErrors[] = ['N/A', $error, 'N/A'];
                        }
                    }
                } else {
                    $allErrors[] = ['N/A', $errors, 'N/A'];
                }
            } else if (!empty($data_import) && isset($data_import['summary'])) {
                // Handle successful import with summary
                $summary = $data_import['summary'];
                $totalSuccessfulImports += $summary['total_processed'] ?? 0;
                $totalCreatedOrders += $summary['created'] ?? 0;
                $totalUpdatedOrders += $summary['updated'] ?? 0;
            }
        } catch (\Exception $e) {
            Log::error('File import failed', [
                'file' => $file->name,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            $allErrors[] = ['N/A', 'File import failed for ' . $file->name . ': ' . $e->getMessage(), 'N/A'];
        }
    }

    // Return appropriate response based on results
    if (!empty($allErrors)) {
            $timestamp = date('Y_m_d_H_i_s');
            $company = session('company');
            $fileName = "{$company}_order_import_errors_{$timestamp}.xlsx";
            Excel::store(new OrdersImportErrorsExport($allErrors), $fileName, 's3');
            $url = Storage::url($fileName);
        if ($hasPartialSuccess) {
            $this->logImportResult($file->uuid, 'order', 'PARTIALLY_COMPLETED', $fileName);
            return response([
                'error_log_url' => $url,
                'message' => __('messages.partial_success'),
                'status' => 'partial_success',
                'successful_imports' => $totalSuccessfulImports,
                'created_orders' => $totalCreatedOrders,
                'updated_orders' => $totalUpdatedOrders,
                'total_errors' => count($allErrors),
                'errors' => $allErrors,
                'success' => false,
            ]);
        } else {
            $this->logImportResult($file->uuid, 'order', 'ERROR', $fileName);
            return response([
                'error_log_url' => $url,
                'message' => __('messages.full_import_error'),
                'status' => 'error',
                'total_errors' => count($allErrors),
                'errors' => $allErrors,
                'success' => false,
            ]);
        }
    }
         $this->logImportResult($file->uuid, 'order', 'COMPLETED', null);
     return response([
         'succeed' => true,
         'message' => "Import completed successfully. {$totalCreatedOrders} trips created, {$totalUpdatedOrders} trips updated.",
         'created_orders' => $totalCreatedOrders,
         'updated_orders' => $totalUpdatedOrders,
         'total_processed' => $totalSuccessfulImports
     ]);
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
            // Updated query to filter active, non-deleted statuses and order by name
            $statuses = OrderStatus::where('is_active', 1)
                ->where('deleted', 0)
                ->whereNull('deleted_at')
                ->orderBy('name', 'asc')
                ->get();
            if ($request->has('is_filter_status')) {
                $formattedStatuses = $statuses->map(function ($status) {
                    return [
                        'code' => $status->code,
                        'label' => ucfirst(str_replace(['-', '_'], ' ', $status->name))
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
        $filterBy     = $request->input('filter_by', null);
        $fromDate     = $request->input('from_date');
        $toDate       = $request->input('to_date');
        $timezone     = $request->input('timezone', 'UTC');
        try{
            //  return Excel::download(new OrderExport($selections), $fileName);
            return Excel::download(
                new OrderExportChange($selections, $filterBy, $fromDate, $toDate, $timezone),
                $fileName
            );
            
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

    /**
     * Validate and create missing places before order import
     *
     * @param array $excelData
     * @return array
     */
    public function validateAndCreatePlaces($excelData)
    {
        try {
            $allPlaceCodes = [];
            $errors = [];
            
            // Collect all unique place codes from all sheets
            foreach ($excelData as $sheetIndex => $sheetRows) {
                foreach ($sheetRows as $rowIndex => $row) {
                    $displayRowIndex = $rowIndex + 2; // +2 to include header row
                    
                    // Collect stop_1 and stop_2 codes
                    $stop1 = $row['stop_1'] ?? null;
                    $stop2 = $row['stop_2'] ?? null;
                    
                    // Also check facility_sequence for additional place codes
                    $facilitySequence = $row['facility_sequence'] ?? null;
                    
                    if (!empty($stop1)) {
                        $allPlaceCodes[] = trim($stop1);
                    }
                    if (!empty($stop2)) {
                        $allPlaceCodes[] = trim($stop2);
                    }
                    
                    // Parse facility_sequence if present
                    if (!empty($facilitySequence)) {
                        $facilities = array_filter(array_map('trim', explode('->', $facilitySequence)));
                        foreach ($facilities as $facility) {
                            if (!empty($facility)) {
                                $allPlaceCodes[] = $facility;
                            }
                        }
                    }
                }
            }
            
            // Remove duplicates and empty values
            $allPlaceCodes = array_unique(array_filter($allPlaceCodes));
            
            if (empty($allPlaceCodes)) {
                return ['success' => true, 'created_places' => []];
            }
            
            // Check which places already exist
            $existingPlaces = Place::whereIn('code', $allPlaceCodes)
                ->where('company_uuid', session('company'))
                ->whereNull('deleted_at')
                ->get()
                ->keyBy('code');
            
            $existingPlaceCodes = $existingPlaces->keys()->toArray();
            $missingPlaceCodes = array_diff($allPlaceCodes, $existingPlaceCodes);
            
            // Get AmazonWarehouses for missing place codes
            $amazonWarehouses = [];
            if (!empty($missingPlaceCodes)) {
                $amazonWarehouses = AmazonWarehouse::whereIn('code', $missingPlaceCodes)
                    ->whereNull('deleted_at')
                    ->get()
                    ->keyBy('code');
                
                Log::info("Found AmazonWarehouses for missing codes", [
                    'missing_place_codes' => $missingPlaceCodes,
                    'found_amazon_warehouses' => $amazonWarehouses->keys()->toArray(),
                    'total_found' => $amazonWarehouses->count()
                ]);
            }
            
            $createdPlaces = [];
            $postalCode = null;
            Log::info("Missing place codes found", ['missing_place_codes' => $missingPlaceCodes]);
            if(isset($missingPlaceCodes) && !empty($missingPlaceCodes)) {
                
                $defaultPlaceCode = config('services.default_place_code');
                $defaultPlace = Place::where('code', $defaultPlaceCode)->whereNull('deleted_at')->first();
                // Create missing places using createFromMixed for better geocoding support
                foreach ($missingPlaceCodes as $placeCode) {
                try {
                    $place = null;
                    $street1 = null;
                    $city = null;
                    $postal_code = null;
                    $country = null;
                    $location = null;
                    
                    // Step 1: Check if place code exists in AmazonWarehouses
                    if (isset($amazonWarehouses[$placeCode])) {
                        $amazonWarehouse = $amazonWarehouses[$placeCode];
                        Log::info("Creating place from AmazonWarehouse data for code: {$placeCode}", [
                            'warehouse_id' => $amazonWarehouse->uuid,
                            'warehouse_name' => $amazonWarehouse->name ?? 'Unknown'
                        ]);
                        
                        // Extract data from AmazonWarehouse
                        $street1 = $amazonWarehouse->street1 ?? null;
                        $city = $amazonWarehouse->city ?? null;
                        $postal_code = $amazonWarehouse->postal_code ?? null;
                        $country = $amazonWarehouse->country ?? null;
                        
                        // Extract location coordinates from AmazonWarehouse
                        $locationData = $amazonWarehouse->location ?? null;
                        if ($locationData) {
                            if (is_array($locationData) && isset($locationData['coordinates'])) {
                                $lng = $locationData['coordinates'][0] ?? null;
                                $lat = $locationData['coordinates'][1] ?? null;
                                $location = $lat . ',' . $lng;
                            } elseif (is_object($locationData) && method_exists($locationData, 'getLat') && method_exists($locationData, 'getLng')) {
                                $lat = $locationData->getLat();
                                $lng = $locationData->getLng();
                                $location = $lat . ',' . $lng;
                            }
                        }
                    }
                    // Step 2: If not found in AmazonWarehouses, try postal code geocoding
                    else {
                        Log::info("AmazonWarehouse not found for code: {$placeCode}, trying postal code geocoding");
                        
                        // Check for postal code pattern and geocode
                        if (preg_match('/([A-Z]{1,2}\d{1,2}[A-Z]?)[_\-\s]?(\d[A-Z]{2})/i', $placeCode, $m)) {
                            $postalCode = strtoupper($m[1] . ' ' . $m[2]); // normalize to "ME17 2LH"
                            if(isset($postalCode)){
                                $results = Place::getAddressFromPostalCode($postalCode);
                                if($results) {
                                    Log::info('Place geocoding results:', [
                                        'results_type' => get_class($results),
                                        'results_data' => $results->toArray()
                                    ]);
                                    
                                    // Extract data from Place model result
                                    $street1 = $results->street1 ?? null;
                                    $city = $results->city ?? null;
                                    $postal_code = $results->postal_code ?? null;
                                    $country = $results->country ?? null;
                                    
                                    // Extract location coordinates
                                    $locationData = $results->location ?? null;
                                    if ($locationData) {
                                        // Handle different location formats
                                        if (is_array($locationData) && isset($locationData['coordinates'])) {
                                            $lng = $locationData['coordinates'][0] ?? null; // longitude
                                            $lat = $locationData['coordinates'][1] ?? null; // latitude
                                            $location = $lat . ',' . $lng;
                                        } elseif (is_object($locationData) && method_exists($locationData, 'getLat') && method_exists($locationData, 'getLng')) {
                                            // Handle SpatialPoint object
                                            $lat = $locationData->getLat();
                                            $lng = $locationData->getLng();
                                            $location = $lat . ',' . $lng;
                                        } else {
                                            $location = null;
                                        }
                                    } else {
                                        $location = null;
                                    }
                                }
                            }
                        }
                        
                        // Step 3: If geocoding failed or no postal code pattern, use default place data
                        if (!$street1 && !$city && !$location) {
                            Log::info("Geocoding failed for code: {$placeCode}, using default place data");
                            if($defaultPlace) {
                                $location = $defaultPlace?->location;
                                $street1  = $defaultPlace?->street1;
                                $city     = $defaultPlace?->city;
                                $country  = $defaultPlace?->country;
                                $postal_code = $defaultPlace?->postal_code;
                            }
                            else {
                                $location = null;
                                $street1 = null;
                                $city = null;
                                $country = null;
                                $postal_code = null;
                            }
                        }
                    }
                    $place = Place::createFromMixed($placeCode, [], true);
                    
                    if ($place) {
                        // Update the place with our specific attributes
                        $place->company_uuid = session('company');
                        $place->code = $placeCode;
                        $place->name = $placeCode;
                        $place->type = 'auto_created';
                        
                        // Set extracted fields from geocoding result
                        if ($street1) {
                            $place->street1 = $street1;
                        }
                        if ($city) {
                            $place->city = $city;
                        }
                        if ($postal_code) {
                            $place->postal_code = $postal_code;
                        }
                        if ($country) {
                            $place->country = $country;
                        }
                        if ($location) {
                            $place->location = $location;
                        }
                        $place->save();
                        
                        $createdPlaces[] = $place;
                        Log::info("Created missing place: {$placeCode}", [
                            'place_id' => $place->uuid,
                            'geocoded' => !empty($place->street1),
                            'has_location' => !empty($place->location)
                        ]);
                    } else {
                        // Fallback to direct creation if geocoding fails
                        $place = Place::create([
                            'company_uuid' => session('company'),
                            'code' => $placeCode,
                            'name' => $placeCode,
                            'type' => 'auto_created',
                            'street1' => $street1,
                            'country' => $country,
                            'location' => $location,
                        ]);
                        
                        $createdPlaces[] = $place;
                        Log::info("Created missing place (fallback): {$placeCode}", [
                            'place_id' => $place->uuid
                        ]);
                    }
                    
                } catch (\Exception $e) {
                    $errors[] = [
                        'N/A',
                        "Failed to create place '{$placeCode}': " . $e->getMessage(),
                        'N/A'
                    ];
                    Log::error("Failed to create place: {$placeCode}", [
                        'error' => $e->getMessage()
                    ]);
                }
                }
            }
            // Log summary
            if (!empty($createdPlaces)) {
                Log::info("Place validation completed", [
                    'total_places_found' => count($allPlaceCodes),
                    'existing_places' => count($existingPlaceCodes),
                    'created_places' => count($createdPlaces),
                    'created_place_codes' => array_map(fn($p) => $p->code, $createdPlaces)
                ]);
            }
            
            return [
                'success' => empty($errors),
                'errors' => $errors,
                'created_places' => $createdPlaces,
                'existing_places' => $existingPlaces,
                'total_places' => count($allPlaceCodes),
                'created_count' => count($createdPlaces),
                'existing_count' => count($existingPlaceCodes)
            ];
            
        } catch (\Exception $e) {
            Log::error('Place validation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return [
                'success' => false,
                'errors' => [['N/A', 'Place validation failed: ' . $e->getMessage(), 'N/A']]
            ];
        }
    }

   public function orderImport($excelData)
{
    try {
        if (!class_exists('\DB')) {
            throw new \Exception('DB facade not available for transactions');
        }
        
        $records = [];
        $ordersCache = [];
        $importErrors = [];
        $updatedOrders = [];
        $createdOrders = [];
        $allCreatedPlaces = [];
        $fleets = $this->getFleetDetails();
        
        // PRE-VALIDATION: Validate and create missing places before processing orders
        $placeValidationResult = $this->validateAndCreatePlaces($excelData);
        // if (!$placeValidationResult['success']) {
        //     return response()->json([
        //         'success' => false,
        //         'errors' => $placeValidationResult['errors'],
        //         'message' => 'Place validation failed'
        //     ]);
        // }
        
        // Log place validation summary
        if ($placeValidationResult['created_count'] > 0) {
            Log::info("Order import: Created {$placeValidationResult['created_count']} missing places before processing orders");
        }
        foreach ($excelData as $sheetIndex => $sheetRows) {
            $sheetRowsWithIndex = collect($sheetRows)->map(function ($row, $originalIndex) {
                $row['_original_row_index'] = $originalIndex;
                return $row;
            });

            $grouped = $sheetRowsWithIndex->groupBy(fn ($row) => $row['block_id'] ?? Str::uuid());

                            foreach ($grouped as $blockId => $rows) {
                    // Use database transaction for each block
                    DB::beginTransaction();
                    try {
                        $firstRow = $rows[0]; // or $firstRow = $rows->first();
                        $yardArrivalDates = [];
                        $routeRows = [];
                        $blockHasErrors = false;

                        // PRE-VALIDATION: Check for duplicate Order id & VR IDs before processing
                        $block_id = $rows[0]['block_id'] ?? null;
                        if (empty($block_id)) {
                            $originalRowIndex = $rows[0]['_original_row_index'] ?? 0;
                            $importErrors[] = [
                                (string)($originalRowIndex + 2), // +2 to include header row
                                "Block ID is missing.",
                                ""
                            ];
                            DB::rollback();
                            continue;
                        }
                        if (isset($placeValidationResult) && !$placeValidationResult['success']) {
                            // Skip this row, log the error
                            $importErrors[] = [
                                'N/A',
                                'error' => $placeValidationResults['errors']
                            ];
                            continue; // Skip to next row
                        }
                        // Check if block_id already exists - if yes, we'll update instead of create
                        $existingOrder = null;
                        if (!empty($block_id)) {
                            $existingOrder = Order::where('public_id', $block_id)
                                ->where('company_uuid', session('company'))
                                ->whereNull('deleted_at')
                                ->first();
                        }

                    // Collect all VR IDs from all rows first
                    $vrIds = [];
                    $vrIdToRowIndex = [];
                    foreach ($rows as $row) {
                        if (!empty($row['vr_id'])) {
                            $vrIds[] = $row['vr_id'];
                            $originalRowIndex = $row['_original_row_index'] ?? 0;
                            $vrIdToRowIndex[$row['vr_id']] = $originalRowIndex;
                        }
                    }

                    // Check for existing VR IDs - we'll collect them for potential updates
                    $existingVrIds = [];
                    if (!empty($vrIds)) {
                        $existingVrIds = RouteSegment::whereIn('public_id', $vrIds)
                            ->where('company_uuid', session('company'))
                            ->whereNull('deleted_at')
                            ->pluck('public_id')
                            ->toArray();
                    }

                    // Validate facility_sequence for each row
                    foreach ($rows as $row) {
                        if (!empty($row['facility_sequence'])) {
                            $facility_sequence = $row['facility_sequence'];
                            $facilities = array_filter(array_map('trim', explode('->', $facility_sequence)));

                            // if (count($facilities) > 2) {
                            //     $originalRowIndex = $row['_original_row_index'] ?? 0;
                            //     $importErrors[] = [
                            //         (string)($originalRowIndex + 2), // +2 to include header row
                            //         "Block {$blockId}: Facility sequence has " . count($facilities) . " items. Only 2 are imported. Sequence: " . implode(' -> ', $facilities),
                            //         (string)$blockId
                            //     ];
                            //     $blockHasErrors = true;
                            // }
                            /*Check if first and second facility are the same
                            if (count($facilities) >= 2 && $facilities[0] === $facilities[1]) {
                                $originalRowIndex = $row['_original_row_index'] ?? 0;
                                $importErrors[] = [
                                    (string)($originalRowIndex + 2), // +2 to include header row
                                    "Block {$blockId}: First and second facility in sequence are the same ('{$facilities[0]}'). Sequence: " . implode(' -> ', $facilities),
                                    (string)$blockId
                                ];
                                $blockHasErrors = true;
                            }*/
                        }
                        /*                        if (
                            isset($row['stop_1'], $row['stop_2']) && // both keys exist
                            !empty($row['stop_1']) &&
                            !empty($row['stop_2']) &&
                            $row['stop_1'] === $row['stop_2']
                        ) {
                            $originalRowIndex = $row['_original_row_index'] ?? 0;
                            $importErrors[] = [
                                (string)($originalRowIndex + 2), // +2 to account for header row
                                "Block {$blockId}: Stop 1 and Stop 2 are the same",
                                (string)$blockId
                            ];

                            $blockHasErrors = true;
                        }*/
                    }
                    if ($blockHasErrors) {
                        DB::rollback();
                        continue;
                    }
                    // NEW LOGIC: Build proper waypoint sequence without duplicates
                    $uniqueWaypointSequence = [];

                                         if (count($rows) === 1) {
                         // Single-row block: simple case
                         $row = $rows[0];
                         $stop1 = $row['stop_1'] ?? null;
                         $stop2 = $row['stop_2'] ?? null;
                         
                         // Always add both stops, even if they're the same
                         // This ensures we create separate waypoint records for pickup and dropoff
                         if ($stop1) $uniqueWaypointSequence[] = $stop1;
                         if ($stop2) $uniqueWaypointSequence[] = $stop2;
                         
                         $row['_original_row_index'] = $row['_original_row_index'] ?? 0;
                         $routeRows[] = $row;
                     } else {
                        // Multi-row block: build chain by following route connections
                        $routeMap = [];
                        $allStops = [];
                        
                        foreach ($rows as $groupIndex => $row) {
                            $originalRowIndex = $row['_original_row_index'];
                            
                            // Parse dates for validation
                            foreach ($row as $key => $value) {
                                if (Str::endsWith(Str::lower($key), '_yard_arrival') && !empty($value)) {
                                    try {
                                        $yardArrivalDates[] = $this->parseExcelDate($value);
                                    } catch (\Exception $e) {
                                        $displayRowIndex = $originalRowIndex + 2; // +2 to include header row
                                        $importErrors[] = [
                                            (string)$displayRowIndex,
                                            "Invalid date format for column '{$key}'",
                                            (string)$blockId
                                        ];
                                        $blockHasErrors = true;
                                        continue;
                                    }
                                }
                            }
                            
                            $stop1 = $row['stop_1'] ?? null;
                            $stop2 = $row['stop_2'] ?? null;
                            
                            if ($stop1 && $stop2) {
                                $routeMap[] = ['from' => $stop1, 'to' => $stop2, 'row_index' => $groupIndex];
                                $allStops[] = $stop1;
                                $allStops[] = $stop2;
                            }
                            
                            $row['_original_row_index'] = $originalRowIndex;
                            $routeRows[] = $row;
                        }
                        
                        if ($blockHasErrors) {
                            DB::rollback();
                            continue;
                        }
                        
                        // Get all places and create missing ones automatically
                        $allUniquePlaceCodes = array_unique($allStops);
                        $placesByCode = Place::whereIn('code', $allUniquePlaceCodes)
                                            ->where('company_uuid', session('company'))
                                            ->whereNull('deleted_at')
                                            ->get()
                                            ->keyBy('code');
                        
                        // Track place codes to row indices for error reporting
                        $placeCodeToRowIndex = []; 
                        foreach ($routeRows as $row) {
                            $originalRowIndex = $row['_original_row_index'];
                            $stop1 = $row['stop_1'] ?? null;
                            $stop2 = $row['stop_2'] ?? null;
                            
                            if ($stop1 && !isset($placeCodeToRowIndex[$stop1])) {
                                $placeCodeToRowIndex[$stop1] = $originalRowIndex;
                            }
                            if ($stop2 && !isset($placeCodeToRowIndex[$stop2])) {
                                $placeCodeToRowIndex[$stop2] = $originalRowIndex;
                            }
                        }
                        
                        // Create missing places automatically
                        $createdPlaces = [];
                        /*foreach ($allUniquePlaceCodes as $placeCode) {
                            if (!$placesByCode->has($placeCode)) {
                                try {
                                    $newPlace = Place::create([
                                        'uuid' => Str::uuid(),
                                        'public_id' => Str::random(7),
                                        'company_uuid' => session('company'),
                                        'code' => $placeCode,
                                        'name' => $placeCode, // Use code as name if no other name provided
                                        'type' => 'place',
                                        'status' => 'active',
                                        'created_at' => now(),
                                        'updated_at' => now(),
                                    ]);
                                    
                                    $placesByCode->put($placeCode, $newPlace);
                                    $createdPlaces[] = $placeCode;
                                    $allCreatedPlaces[] = $placeCode;
                                    
                                    Log::info("Auto-created missing place during import", [
                                        'place_code' => $placeCode,
                                        'place_uuid' => $newPlace->uuid,
                                        'block_id' => $blockId
                                    ]);
                                } catch (\Exception $e) {
                                    $rowIndex = isset($placeCodeToRowIndex[$placeCode]) 
                                        ? (string)($placeCodeToRowIndex[$placeCode] + 2) // +2 to include header row
                                        : '-';
                                    $importErrors[] = [
                                        $rowIndex,
                                        "Failed to create place '{$placeCode}': " . $e->getMessage(),
                                        (string)$blockId
                                    ];
                                    $blockHasErrors = true;
                                }
                            }
                        }*/
                        
                        if ($blockHasErrors) {
                            DB::rollback();
                            continue;
                        }
                        
                                                 // Build the correct sequence by following the route chain
                         $uniqueWaypointSequence = $this->buildWaypointSequence($routeMap);
                         
                         if (empty($uniqueWaypointSequence)) {
                             $firstRowIndex = ($rows[0]['_original_row_index'] ?? 0) + 2; // +2 to include header row
                             $importErrors[] = [
                                (string)$firstRowIndex,
                                 "Block {$blockId}: Could not determine waypoint sequence from routes",
                                 (string)$blockId
                             ];
                             DB::rollback();
                             continue;
                         }
                         
                         // Ensure we have unique waypoints in sequence, even if same place appears multiple times
                         $finalWaypointSequence = [];
                         foreach ($uniqueWaypointSequence as $placeCode) {
                             $finalWaypointSequence[] = $placeCode;
                         }
                         $uniqueWaypointSequence = $finalWaypointSequence;
                        
                    }

                    // FIXED DATE LOGIC: Get scheduled_at from FIRST row's stop_1_yard_arrival, fallback to cpt if empty
                    $scheduledAt = null;
                    if (!empty($firstRow['stop_1_yard_arrival'])) {
                        try {
                            $parsedDate = $this->parseExcelDate($firstRow['stop_1_yard_arrival']);
                            // Ensure it's a Carbon instance
                            if (!empty($parsedDate)) {
                                $scheduledAt = $parsedDate instanceof Carbon
                                    ? $parsedDate
                                    : Carbon::parse($parsedDate);
                            }
                        } catch (\Exception $e) {
                            Log::warning('Failed to parse stop_1_yard_arrival from first row', [
                                'block_id' => $blockId,
                                'stop_1_yard_arrival_value' => $firstRow['stop_1_yard_arrival'],
                                'error' => $e->getMessage()
                            ]);
                            $scheduledAt = null;
                        }
                    }

                    // If no stop_1_yard_arrival in first row, check cpt as fallback
                    if (!$scheduledAt && !empty($firstRow['cpt'])) {
                        try {
                            $parsedDate = $this->parseExcelDate($firstRow['cpt']);
                            // Ensure it's a Carbon instance
                            if (!empty($parsedDate)) {
                                $scheduledAt = $parsedDate instanceof Carbon
                                    ? $parsedDate
                                    : Carbon::parse($parsedDate);
                            }
                        } catch (\Exception $e) {
                            Log::warning('Failed to parse cpt from first row', [
                                'block_id' => $blockId,
                                'cpt_value' => $firstRow['cpt'],
                                'error' => $e->getMessage()
                            ]);
                            $scheduledAt = null;
                        }
                    }

                    // If still no scheduled_at, look for any stop_1_yard_arrival in the block as fallback
                    if (!$scheduledAt) {
                        foreach ($rows as $row) {
                            if (!empty($row['stop_1_yard_arrival'])) {
                                try {
                                    $scheduledAt = $this->parseExcelDate($row['stop_1_yard_arrival']);
                                    // Ensure it's a Carbon instance
                                    if (is_string($scheduledAt)) {
                                        $scheduledAt = Carbon::parse($scheduledAt);
                                    }
                                    break;
                                } catch (\Exception $e) {
                                    continue;
                                }
                            }
                        }
                    }

                    // Final fallback: look for any cpt in the block
                    if (!$scheduledAt) {
                        foreach ($rows as $row) {
                            if (!empty($row['cpt'])) {
                                try {
                                    $scheduledAt = $this->parseExcelDate($row['cpt']);
                                    // Ensure it's a Carbon instance
                                    if (is_string($scheduledAt)) {
                                        $scheduledAt = Carbon::parse($scheduledAt);
                                    }
                                    break;
                                } catch (\Exception $e) {
                                    continue;
                                }
                            }
                        }
                    }
                    

                    // FIXED DATE LOGIC: Get estimated_end_date from LAST row's stop_2_yard_arrival
                    $lastRow = $rows[count($rows) - 1];
                    $estimatedEndDate = null;
                    
                    if (!empty($lastRow['stop_2_yard_arrival'])) {
                        try {
                            $estimatedEndDate = $this->parseExcelDate($lastRow['stop_2_yard_arrival']);
                            // Ensure it's a Carbon instance
                            if (is_string($estimatedEndDate)) {
                                $estimatedEndDate = Carbon::parse($estimatedEndDate);
                            }
                        } catch (\Exception $e) {
                            Log::warning('Failed to parse stop_2_yard_arrival from last row', [
                                'block_id' => $blockId,
                                'stop_2_yard_arrival_value' => $lastRow['stop_2_yard_arrival'],
                                'error' => $e->getMessage()
                            ]);
                        }
                    }
                      
                    if(empty($estimatedEndDate) && !empty($lastRow['stop_2_yard_departure'])) {
                        try {
                            $estimatedEndDate = $this->parseExcelDate($lastRow['stop_2_yard_departure']);
                            // Ensure it's a Carbon instance
                            if (is_string($estimatedEndDate)) {
                                $estimatedEndDate = Carbon::parse($estimatedEndDate);
                            }
                        } catch (\Exception $e) {
                            Log::warning('Failed to parse stop_2_yard_departure from last row', [
                                'block_id' => $blockId,
                                'stop_2_yard_departure_value' => $lastRow['stop_2_yard_departure'],
                                'error' => $e->getMessage()
                            ]);
                        }
                        
                        
                    }
                    
                    // Fallback: use the latest yard arrival date if stop_2_yard_arrival is empty or failed to parse
                    if (!$estimatedEndDate && !empty($yardArrivalDates)) {
                        $estimatedEndDate = collect($yardArrivalDates)->sortDesc()->first();
                        // Ensure it's a Carbon instance
                        if (is_string($estimatedEndDate)) {
                            $estimatedEndDate = Carbon::parse($estimatedEndDate);
                        }
                       
                    }

                    // Carrier details
                    $carrier = $firstRow['carrier'] ?? null;
                    $subcarrier = $firstRow['subcarrier'] ?? null;
                    // $carrier_uuid = null;
                    // if($carrier) {
                    //     $carrier_uuid = Fleet::where('name', $carrier)
                    //         ->where('company_uuid', session('company'))
                    //         ->whereNull('deleted_at')
                    //         ->value('uuid');
                    // }
                   
                    // $subcarrier_uuid = null;
                    // if($subcarrier){
                    //     $subcarrier_uuid = Fleet::where('name', $subcarrier)
                    //         ->where('company_uuid', session('company'))
                    //         ->whereNull('deleted_at')
                    //         ->value('uuid');
                    // }

                    // Prepare order data
                    $orderData = [
                        'trip_id' => $firstRow['trip_id'] ?? null,
                        'public_id' => $firstRow['block_id'] ?? null,
                        'status' => strtolower($firstRow['status'] ?? 'created'),
                        'type' => 'transport',
                        'scheduled_at' => $scheduledAt,
                        'estimated_end_date' => $estimatedEndDate,
                        'carrier' => $carrier,
                        'sub_carrier' => $subcarrier,
                        'bid_id' => $firstRow['bid_id'] ?? null,
                        'spot_work' => (isset($firstRow['spot_work']) && strtolower(trim($firstRow['spot_work'])) === 'yes') ? 1 : 0,
                    ];
                    if ($existingOrder) {
                        // Update existing order
                        $existingOrder->update($orderData);
                        $order = $existingOrder;
                        
                        // Update fleet assignment
                        if($order->scheduled_at && $order->estimated_end_date) {
                            $start = Carbon::parse($order->scheduled_at);
                            $end = Carbon::parse($order->estimated_end_date);
                            $hours = $start->floatDiffInHours($end);
                            
                            // First try to find a fleet with trip_length >= hours
                            $matchedFleet = $fleets->firstWhere('trip_length', '>=', $hours);
                            
                            if (!$matchedFleet) {
                                // If no fleet found, look for tramper fleet (no trip_length or null)
                                $matchedFleet = $fleets->firstWhere(function($fleet) {
                                    return is_null($fleet->trip_length) || $fleet->trip_length == 0;
                                });
                                
                                // If still no fleet found, use the last one as fallback
                                if (!$matchedFleet) {
                                    $matchedFleet = $fleets->last();
                                }
                            }
                            
                            $order->fleet_uuid = $matchedFleet?->uuid ?? null;
                        } else {
                            $order->fleet_uuid = null;
                        }
                        $order->save();
                        
                        // Delete existing waypoints and route segments for this order
                        if ($order->payload_uuid) {
                            Waypoint::where('payload_uuid', $order->payload_uuid)->delete();
                            RouteSegment::where('payload_id', $order->payload_uuid)->delete();
                        }
                        
                        $updatedOrders[] = $order;
                    } else {
                        // Create new order
                        $orderInput = [
                            'order' => array_merge($orderData, [
                                'payload' => ['waypoints' => []]
                            ])
                        ];

                        $orderRequest = new Request();
                        $orderRequest->merge($orderInput);

                        $order = $this->model->createRecordFromRequest(
                            $orderRequest,
                            function ($request, &$input) {
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
                            function (&$request, Order &$order, &$requestInput) use ($fleets) {
                                $input = $request->input('order');
                                
                                if($order->scheduled_at && $order->estimated_end_date) {
                                    $start = Carbon::parse($order->scheduled_at);
                                    $end = Carbon::parse($order->estimated_end_date);
                                    $hours = $start->floatDiffInHours($end);
                                    
                                    // First try to find a fleet with trip_length >= hours
                                    $matchedFleet = $fleets->firstWhere('trip_length', '>=', $hours);
                                    
                                    if (!$matchedFleet) {
                                        // If no fleet found, look for tramper fleet (no trip_length or null)
                                        $matchedFleet = $fleets->firstWhere(function($fleet) {
                                            return is_null($fleet->trip_length) || $fleet->trip_length == 0;
                                        });
                                        
                                        // If still no fleet found, use the last one as fallback
                                        if (!$matchedFleet) {
                                            $matchedFleet = $fleets->last();
                                        }
                                    }
                                    
                                    $order->fleet_uuid = $matchedFleet?->uuid ?? null;
                                } else {
                                    $order->fleet_uuid = null;
                                }
                                $order->save();

                                $payload = new Payload([
                                    'company_uuid' => session('company'),
                                    'type' => 'transport'
                                ]);
                                $payload->save();

                                $order->payload_uuid = $payload->uuid;
                                $order->status = $input['status'] ?? 'created';
                                $order->save();
                            }
                        );
                        
                        $createdOrders[] = $order;
                    }

                    // Create waypoints based on unique sequence
                    $savedWaypoints = [];
                    $waypointMeta = [];
                    $orderIndex = 0;

                    // Get place models for the unique sequence
                    $placesByCode = Place::whereIn('code', $uniqueWaypointSequence)
                        ->where('company_uuid', session('company'))
                        ->whereNull('deleted_at')
                        ->get()
                        ->keyBy('code');

                                         // Track waypoints by place code to handle duplicates
                     $waypointsByPlaceCode = [];
                     
                     foreach ($uniqueWaypointSequence as $index => $placeCode) {
                         $placeModel = $placesByCode->get($placeCode);
                         if ($placeModel && isset($placeModel->uuid)) {
                             // Create unique metadata for each waypoint, even if same place
                             $meta = [
                                 'place_code' => $placeCode,
                                 'waypoint_index' => $index,
                                 'waypoint_type' => $index === 0 ? 'pickup' : 'dropoff'
                             ];
                             
                             try {
                                 $saved = Waypoint::create([
                                     'company_uuid' => session('company'),
                                     'payload_uuid' => $order->payload_uuid ?? ($order->payload->uuid ?? null),
                                     'place_uuid' => $placeModel->uuid,
                                     'order' => $orderIndex++,
                                     'meta' => $meta,
                                 ]);
                                 $saved = $saved->fresh();
                                 $savedWaypoints[] = $saved;
                                 
                                 // Store waypoint by place code for route segment creation
                                 if (!isset($waypointsByPlaceCode[$placeCode])) {
                                     $waypointsByPlaceCode[$placeCode] = [];
                                 }
                                 $waypointsByPlaceCode[$placeCode][] = $saved;
                                 
                                 if (isset($saved->uuid)) {
                                     $waypointMeta[$saved->uuid] = $meta;
                                 }
                             } catch (\Exception $e) {
                                 Log::error('Failed to create waypoint', [
                                     'place_code' => $placeCode,
                                     'error' => $e->getMessage()
                                 ]);
                                 continue;
                             }
                         }
                     }

                                         // Create route segments - this can now fail safely within transaction
                     $routeSegmentErrors = $this->createRouteSegmentsFromRows($routeRows, $order, $savedWaypoints, $waypointMeta, $waypointsByPlaceCode);
                     
                     if (!empty($routeSegmentErrors)) {
                         // Add route segment errors to main import errors
                         foreach ($routeSegmentErrors as $error) {
                             $importErrors[] = $error; // Each error is already in format [rowIndex, message, blockId]
                         }
                         $blockHasErrors = true;
                         DB::rollback(); // This will rollback the entire block including order and waypoints
                         continue; // Skip to next block
                     }
                     
                     // If we reach here, everything succeeded
                     DB::commit();

                     $ordersCache[$blockId] = $order;
                     $records[] = $order;
                     event(new OrderReady($order));
                } catch (\Exception $e) {
                    // Rollback the entire block if anything fails
                    DB::rollback();
                    $importErrors[] = [
                        '-',
                        "Block {$blockId}: " . $e->getMessage(),
                        $blockId
                    ];
                }
            }
        }

        if (!empty($importErrors)) {
            $successCount = count($records);
            $errorCount = count($importErrors);
            $createdCount = count($createdOrders);
            $updatedCount = count($updatedOrders);
            $createdPlacesCount = count(array_unique($allCreatedPlaces));

            return response()->json([
                'success' => false,
                'partial_success' => $successCount > 0,
                'successful_imports' => $successCount,
                'created_orders' => $createdCount,
                'updated_orders' => $updatedCount,
                'created_places' => array_unique($allCreatedPlaces),
                'created_places_count' => $createdPlacesCount,
                'total_errors' => $errorCount,
                'errors' => $importErrors,
                'message' => $successCount > 0
                    ? "Partial import completed. {$createdCount} trips created, {$updatedCount} trips updated, {$createdPlacesCount} places auto-created, {$errorCount} errors found."
                    : "Import failed. No trips were imported due to validation errors."
            ]);
        }

        $successCount = count($records);
        $createdCount = count($createdOrders);
        $updatedCount = count($updatedOrders);
        $createdPlacesCount = count(array_unique($allCreatedPlaces));

        return [
            'records' => $records,
            'summary' => [
                'total_processed' => $successCount,
                'created' => $createdCount,
                'updated' => $updatedCount,
                'created_places' => array_unique($allCreatedPlaces),
                'created_places_count' => $createdPlacesCount,
                'created_trips' => $createdOrders,
                'updated_trips' => $updatedOrders
            ]
        ];

    } catch (\Exception $e) {
        Log::error('Order import failed', [
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json(['success' => false, 'errors' => [[$e->getMessage()]]]);
    }
}

/**
 * Build the correct waypoint sequence by following the route chain
 * This ensures we get unique waypoints in the correct order
 */
private function buildWaypointSequence(array $routeMap): array
{
    if (empty($routeMap)) {
        return [];
    }
    
    // Sort routes by their row index to maintain order
    usort($routeMap, function($a, $b) {
        return $a['row_index'] <=> $b['row_index'];
    });
    
    $sequence = [];
    
    // For ordered route segments, simply follow each route in sequence
    // Add the first route's origin
    if (isset($routeMap[0])) {
        $sequence[] = $routeMap[0]['from'];
    }
    
    // Add each route's destination in order
    foreach ($routeMap as $route) {
        $sequence[] = $route['to'];
    }
    
    return $sequence;
}


    /*
        * Get the wayppoints for the payload of an order.
        *
        * @return \Illuminate\Http\Response
        */
    public function getWaypoints($payload_uuid)
    {
        $waypoints = Waypoint::where('payload_uuid', $payload_uuid)
                      ->where('company_uuid', session('company'))
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
        try {
            if ($waypoints && !empty($waypoints)) {
                foreach ($waypoints as $index => $waypoint) {
                    if ($index === 0) {
                        // Skip the first waypoint as it has no previous waypoint
                        continue;
                    }

                    $routeSegment = new RouteSegment();
                    $prevCode = $waypoints[$index - 1]->place->code ?? null;
                    $currCode = $waypoint->place->code ?? null;
                    $routeSegment->order_id = $orderId;
                    $routeSegment->payload_id = $payloadUuid;
                    $routeSegment->from_waypoint_id = $index > 0 ? $waypoints[$index - 1]->uuid : null;
                    $routeSegment->to_waypoint_id = $waypoint->uuid;
                    $routeSegment->public_id = 'VR_' . Str::upper(Str::random(5));
                    $routeSegment->facility_sequence = ($prevCode && $currCode) ? "$prevCode->$currCode" : null;
                    $routeSegment->company_uuid = session('company');
                    $routeSegment->created_by_id = UserHelper::getIdFromUuid(auth()->id());
                    $routeSegment->save();
                }
            }
            } catch (\Exception $e) {
            Log::error('Failed to create route segments', [
                'order_id' => $orderId,
                'payload_uuid' => $payloadUuid,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }
/**
 * Create route segments from rows (each row = 1 segment).
 * Handles duplicate waypoints by matching them based on row index and position.
 * If any error occurs, detailed error information is returned.
 *
 * @param array $rows
 * @param Order $order
 * @param array $savedWaypoints - Array of saved waypoints with metadata
 * @return void
 * @throws \Exception
 */
 public function createRouteSegmentsFromRows(array $rows, Order $order, array $savedWaypoints = [], array $waypointMeta = [], array $waypointsByPlaceCode = []): array
{
    $errors = [];
    $createdSegments = [];
    
    // PRE-CHECK: Collect existing VR IDs for potential updates
    $vrIds = array_filter(array_map(function($row) {
        return $row['vr_id'] ?? null;
    }, $rows));
    
    $existingSegments = collect();
    if (!empty($vrIds)) {
        $existingSegments = RouteSegment::whereIn('public_id', $vrIds)
          ->where('company_uuid', session('company'))
          ->whereNull('deleted_at')->get();
    }
    
    foreach ($rows as $groupIndex => $row) {
        $originalRowIndex = $row['_original_row_index'] ?? $groupIndex;
        $displayRowIndex = $originalRowIndex + 2; // +2 to include header row
        $fromCode = $row['stop_1'] ?? null;
        $toCode = $row['stop_2'] ?? null;
        // Fallback to facility_sequence if stop_1 or stop_2 are null
        if ((empty($fromCode) || empty($toCode)) && !empty($row['facility_sequence'])) {
            $facilities = array_filter(array_map('trim', explode('->', $row['facility_sequence'])));
            if (count($facilities) >= 2) {
                $fromCode = $fromCode ?? $facilities[0];
                $toCode = $toCode ?? $facilities[1];
            }
        }

        if (!$fromCode || !$toCode) {
            $orderPublicId = $order->public_id ?? ($order->id ?? '');
            $errors[] = [$displayRowIndex, "Missing stop_1 or stop_2", $orderPublicId];
            continue;
        }

        // Find the correct waypoints for this specific row
        $fromWaypoint = null;
        $toWaypoint = null;
        
        if (!empty($waypointsByPlaceCode)) {
            // Use the new waypoint tracking system for better duplicate handling
            if (isset($waypointsByPlaceCode[$fromCode])) {
                // Get the first waypoint for this place code (pickup)
                $fromWaypoint = $waypointsByPlaceCode[$fromCode][0];
            }
            if (isset($waypointsByPlaceCode[$toCode])) {
                // Get the last waypoint for this place code (dropoff)
                $toWaypoint = end($waypointsByPlaceCode[$toCode]);
            }
        } elseif (!empty($savedWaypoints) && !empty($waypointMeta)) {
            // Fallback to old method
            foreach ($savedWaypoints as $waypoint) {
                $meta = isset($waypoint->uuid) ? ($waypointMeta[$waypoint->uuid] ?? []) : [];
                if (isset($meta['place_code']) && $meta['place_code'] === $fromCode) {
                    $fromWaypoint = $waypoint;
                }
                if (isset($meta['place_code']) && $meta['place_code'] === $toCode) {
                    $toWaypoint = $waypoint;
                }
            }
        } else {
            // This should not happen since we validate places before import
            // But keep as safety fallback with better error message
            $orderPublicId = $order->public_id ?? ($order->id ?? '');
            $errors[] = [$displayRowIndex, "Waypoint data not available for place codes: {$fromCode}, {$toCode}.", $orderPublicId];
            continue;
        }

        if (!$fromWaypoint || !$toWaypoint) {
            $orderPublicId = $order->public_id ?? ($order->id ?? '');
            $missingWaypoints = [];
            if (!$fromWaypoint) $missingWaypoints[] = $fromCode;
            if (!$toWaypoint) $missingWaypoints[] = $toCode;
            $errors[] = [$displayRowIndex, "Missing waypoint for place code(s): " . implode(', ', $missingWaypoints), $orderPublicId];
            continue;
        }

        try {
            // Generate unique public_id if vr_id is empty
            $publicId = $row['vr_id'] ?? null;
            if(isset($publicId) && !empty($publicId)){
                // Check if this VR ID already exists and can be updated
                $existingSegment = $existingSegments->firstWhere('public_id', $publicId);
                
                if ($existingSegment) {
                    // Update existing route segment
                    $existingSegment->order_id = $order->id;
                    $existingSegment->payload_id = $order->payload_uuid;
                    $existingSegment->from_waypoint_id = $fromWaypoint->uuid;
                    $existingSegment->to_waypoint_id = $toWaypoint->uuid;
                    $existingSegment->company_uuid = session('company');
                    $existingSegment->updated_by_id = UserHelper::getIdFromUuid(auth()->id());
                    $routeSegment = $existingSegment;
                } else {
                    // Create new route segment
                    $routeSegment = new RouteSegment();
                    $routeSegment->order_id = $order->id;
                    $routeSegment->payload_id = $order->payload_uuid;
                    $routeSegment->from_waypoint_id = $fromWaypoint->uuid;
                    $routeSegment->to_waypoint_id = $toWaypoint->uuid;
                    $routeSegment->public_id = $publicId;
                    $routeSegment->company_uuid = session('company');
                    $routeSegment->created_by_id = UserHelper::getIdFromUuid(auth()->id());
                }

                // Handle potential array values from Excel
                $routeSegment->cr_id = is_array($row['cr_id'] ?? null) ? null : ($row['cr_id'] ?? null);
                $routeSegment->shipper_accounts = is_array($row['shipper_accounts'] ?? null) ? null : ($row['shipper_accounts'] ?? null);
                $routeSegment->equipment_type = is_array($row['equipment_type'] ?? null) ? null : ($row['equipment_type'] ?? null);
                $routeSegment->trailer_id = is_array($row['trailer_id'] ?? null) ? null : ($row['trailer_id'] ?? null);
                $routeSegment->operator_id = is_array($row['operator_id'] ?? null) ? null : ($row['operator_id'] ?? null);
                $routeSegment->tender_status = $row['tender_status'] ?? null;
                // Set facility_sequence: use fromCode->toCode if row facility_sequence is null
                if (!empty($row['facility_sequence'])) {
                    $routeSegment->facility_sequence = $row['facility_sequence'];
                } elseif (!empty($fromCode) && !empty($toCode)) {
                    $routeSegment->facility_sequence = $fromCode . '->' . $toCode;
                } else {
                    $routeSegment->facility_sequence = null;
                }

                $routeSegment->stop_1_yard_arrival = !empty($row['stop_1_yard_arrival']) 
                    ? $this->parseExcelDate($row['stop_1_yard_arrival']) : null;
                $routeSegment->stop_1_yard_departure = !empty($row['stop_1_yard_departure']) 
                    ? $this->parseExcelDate($row['stop_1_yard_departure']) : null;

                $routeSegment->stop_2_yard_arrival = !empty($row['stop_2_yard_arrival']) 
                    ? $this->parseExcelDate($row['stop_2_yard_arrival']) : null;
                $routeSegment->stop_2_yard_departure = !empty($row['stop_2_yard_departure']) 
                    ? $this->parseExcelDate($row['stop_2_yard_departure']) : null;

                $routeSegment->stop_3_yard_arrival = !empty($row['stop_3_yard_arrival']) 
                    ? $this->parseExcelDate($row['stop_3_yard_arrival']) : null;
                $routeSegment->stop_3_yard_departure = !empty($row['stop_3_yard_departure']) 
                    ? $this->parseExcelDate($row['stop_3_yard_departure']) : null;
                $routeSegment->driver_type = $row['transit_operator_type'] ?? null;
                $routeSegment->truck_filter = $row['truck_filter'] ?? null;
                // Handle date parsing safely
                $routeSegment->vr_creation_date_time = null;
                if (!empty($row['vr_creation_date_time']) && !is_array($row['vr_creation_date_time'])) {
                    try {
                        $routeSegment->vr_creation_date_time = $this->parseExcelDate($row['vr_creation_date_time']);
                    } catch (\Exception $e) {
                        Log::warning('Failed to parse vr_creation_date_time', [
                            'value' => $row['vr_creation_date_time'],
                            'error' => $e->getMessage()
                        ]);
                    }
                }
                
                $routeSegment->vr_cancellation_date_time = null;
                if (!empty($row['vr_cancellation_date_time']) && !is_array($row['vr_cancellation_date_time'])) {
                    try {
                        $routeSegment->vr_cancellation_date_time = $this->parseExcelDate($row['vr_cancellation_date_time']);
                    } catch (\Exception $e) {
                        Log::warning('Failed to parse vr_cancellation_date_time', [
                            'value' => $row['vr_cancellation_date_time'],
                            'error' => $e->getMessage()
                        ]);
                    }
                }

                $routeSegment->save();
                $createdSegments[] = $routeSegment->id;
            }
            
        } catch (\Exception $e) {
            $displayRowIndex = $originalRowIndex + 2; // +2 to include header row
            $errors[] = [$displayRowIndex, $e->getMessage(), $order->public_id];

        }
    }

    if (!empty($errors)) {
      
        return $errors; // Returns empty array if no errors
        // throw new \Exception("Route Segment Import Failed: " . implode("; ", $errorMessages));
    }
    else{
        return []; // Returns empty array if no errors
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
            ->where('company_uuid', session('company'))
            ->whereNull('deleted_at')
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

    /**
     * Parse Excel date formats, including serial numbers and various string formats.
     *
     * @param mixed $value
     * @return string|null
     */
    private function parseExcelDate($value)
    {
        try {
            // Trim and clean value
            $value = trim($value);
            
            // If it's a number, treat it as Excel serial date
            if (is_numeric($value)) {
                return \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($value)->format('Y-m-d H:i:s');
            }
            
            // Try multiple formats for string dates
            $formats = [
                // Excel formats (M/d/Y)
                'n/j/Y H:i',    // 7/17/2025 14:23
                'm/d/Y H:i',    // 07/17/2025 14:23
                
                // CPT formats (d-m-Y)
                'j-n-Y H:i',    // 21-5-2025 13:45
                'd-m-Y H:i',    // 21-05-2025 13:45
                
                // After slash-to-dash conversion
                'n-j-Y H:i',    // 7-17-2025 14:23 (converted from Excel)
                'm-d-Y H:i',    // 07-17-2025 14:23 (converted from Excel)
                
                // Standard formats
                'Y-m-d H:i:s',  // 2025-05-21 13:45:00
                'Y-m-d H:i'     // 2025-05-21 13:45
            ];
            
            foreach ($formats as $format) {
                try {
                    // For slash formats, use original value
                    // For dash formats, use dash-converted value
                    $testValue = (strpos($format, '/') !== false) ? $value : str_replace('/', '-', $value);
                    
                    $date = Carbon::createFromFormat($format, $testValue);
                    return $date->format('Y-m-d H:i:s');
                } catch (\Exception $e) {
                    continue;
                }
            }
            
            throw new \Exception('No valid format found for: ' . $value);
            
        } catch (\Exception $e) {
            return null;
        }
    }


    /**
     * Log the import result to the import_logs table.
     *
     * @param string $fileUuid
     * @param string $module
     * @param string $status (COMPLETED, PARTIALLY COMPLETED, ERROR)
     * @param string|null $errorLogPath
     * @return void
     */
    public function logImportResult(string $fileUuid, string $module, string $status, ?string $errorLogPath = null): void
    {
        ImportLog::create([
            'uuid' => Str::uuid(),
            'imported_file_uuid' => $fileUuid,
            'module' => $module,
            'status' => $status,
            'error_log_file_path' => $errorLogPath,
            'company_uuid' => session('company'),
            'created_by_id' => UserHelper::getIdFromUuid(auth()->id()),
        ]);
    }

    protected function getFleetDetails()
    {
        $fleets = Fleet::where('company_uuid', session('company'))
        ->whereNull('deleted_at')
        ->where('status', 'active')
        ->orderByRaw('CASE WHEN trip_length IS NULL THEN 1 ELSE 0 END, trip_length ASC')
        ->get(['uuid', 'trip_length', 'name']);
        return $fleets;
    }
}
