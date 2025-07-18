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
use Fleetbase\FleetOps\Exports\OrdersImportErrorsExport;
use Illuminate\Support\Facades\Storage;
use Fleetbase\FleetOps\Models\Fleet;
use Fleetbase\FleetOps\Models\ImportLog;
use Fleetbase\FleetOps\Models\OrderStatus;
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
            \Log::info('Total rows: ' . $totalRows .", Company: ". session('company'));
            if ($totalRows > config('params.maximum_import_row_size')) {
                return response()->json([
                    'success' => false,
                    'message' => "Import failed: Maximum of 500 rows allowed. Your file contains {$totalRows} rows.",
                    'status' => 'limit_exceeded'
                ], 400);
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
            \Log::error('File import failed', [
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
            return response()->json([
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
            return response()->json([
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
    return response()->json([
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
        if (!class_exists('\DB')) {
            throw new \Exception('DB facade not available for transactions');
        }
        
        $records = [];
        $ordersCache = [];
        $importErrors = [];
        $updatedOrders = [];
        $createdOrders = [];

        foreach ($excelData as $sheetIndex => $sheetRows) {
            $sheetRowsWithIndex = collect($sheetRows)->map(function ($row, $originalIndex) {
                $row['_original_row_index'] = $originalIndex;
                return $row;
            });

            $grouped = $sheetRowsWithIndex->groupBy(fn ($row) => $row['trip_id'] ?? Str::uuid());

            foreach ($grouped as $tripId => $rows) {
                // Use database transaction for each trip
                DB::beginTransaction();
                
                try {
                    $yardArrivalDates = [];
                    $waypoints = [];
                    $routeRows = [];
                    $order = 0;
                    $tripHasErrors = false;

                    // PRE-VALIDATION: Check for duplicate Order id  &VR IDs before processing
                    $trip_id = $rows[0]['trip_id'] ?? null;
                    //check duplicates for trip_id
                    if (!empty($trip_id)) {
                        $exists = Order::where('public_id', $trip_id)
                            ->where('company_uuid', session('company'))
                            ->whereNull('deleted_at')
                            ->exists();

                        if ($exists) {
                            $originalRowIndex = $rows[0]['_original_row_index'] ?? 0;
                            $importErrors[] = [
                                (string)($originalRowIndex + 1),
                                "Trip {$tripId}: Trip ID '{$trip_id}' already exists.",
                                (string)$tripId
                            ];
                            DB::rollback();
                            continue;
                        }
                    }
                    
                    $vrIds = [];
                    foreach ($rows as $row) {
                        if (!empty($row['vr_id'])) {
                            $vrIds[] = $row['vr_id'];
                        }
                    }
                    
                    if (!empty($vrIds)) {
                        $existingVrIds = RouteSegment::whereIn('public_id', $vrIds)
                        ->whereNull('deleted_at')
                        ->pluck('public_id')
                        ->toArray();
                        if (!empty($existingVrIds)) {
                            $importErrors[] = [
                                '-',
                                "Trip {$tripId}: VR ID already exists: " . implode(', ', $existingVrIds),
                                (string)$tripId
                            ];
                            DB::rollback();
                            continue;
                        }
                    }
                    // Validate facility_sequence
                    if (!empty($row['facility_sequence'])) {
                        $facility_sequence = $row['facility_sequence'];
                        $facilities = array_filter(array_map('trim', explode('->', $facility_sequence)));

                        if (count($facilities) > 2) {
                            $importErrors[] = [
                                (string)($originalRowIndex + 1),
                                "Trip {$tripId}: Facility sequence has " . count($facilities) . " items. Only 2 are importes. Sequence: " . implode(' -> ', $facilities),
                                (string)$tripId
                            ];
                        }
                    }
                    foreach ($rows as $groupIndex => $row) {
                        $originalRowIndex = $row['_original_row_index'];

                        foreach ($row as $key => $value) {
                            if (Str::endsWith(Str::lower($key), '_yard_arrival') && !empty($value)) {
                                try {
                                    $yardArrivalDates[] = $this->parseExcelDate($value);
                                } catch (\Exception $e) {
                                    $displayRowIndex = $originalRowIndex + 1;
                                    $importErrors[] = [
                                        (string)$displayRowIndex,
                                        "Invalid date format for column '{$key}'",
                                        (string)$tripId
                                    ];
                                    $tripHasErrors = true;
                                    continue;
                                }
                            }
                        }
                        
                        $allPlaceCodes = $sheetRowsWithIndex->pluck('stop_1')->merge($sheetRowsWithIndex->pluck('stop_2'))->filter()->unique();
                        $placesByCode = Place::whereIn('code', $allPlaceCodes)
                                        ->where('company_uuid', session('company'))
                                        ->whereNull('deleted_at')
                                        ->get()
                                        ->keyBy('code');
                                        
                        foreach (['stop_1', 'stop_2'] as $stopKey) {
                            $placeCode = $row[$stopKey] ?? null;
                            if (!empty($placeCode)) {
                                $place = $placesByCode->get($placeCode);

                                if (!$place) {
                                    $displayRowIndex = $originalRowIndex + 1;
                                    $importErrors[] = [
                                        (string)$displayRowIndex,
                                        "Invalid place code '{$placeCode}' in column '{$stopKey}'",
                                        (string)$tripId
                                    ];
                                    $tripHasErrors = true;
                                } else {
                                    $waypoints[] = [
                                        'place_uuid' => $place->uuid,
                                        'order' => $order++,
                                        'meta' => [
                                            'row_index' => $originalRowIndex,
                                            'stop_key' => $stopKey,
                                            'place_code' => $placeCode
                                        ]
                                    ];
                                }
                            }
                        }
                        
                        $row['_original_row_index'] = $originalRowIndex;
                        $routeRows[] = $row;
                    }

                    if ($tripHasErrors) {
                        DB::rollback();
                        continue;
                    }

                    // FIXED DATE LOGIC: Get scheduled_at from FIRST row's cpt
                    $firstRow = $rows[0];
                    $scheduledAt = null;
                    if (!empty($firstRow['cpt'])) {
                        try {
                            $scheduledAt = $this->parseExcelDate($firstRow['cpt']);
                            // Ensure it's a Carbon instance
                            if (is_string($scheduledAt)) {
                                $scheduledAt = \Carbon\Carbon::parse($scheduledAt);
                            }
                        } catch (\Exception $e) {
                            \Log::warning('Failed to parse cpt from first row', [
                                'trip_id' => $tripId,
                                'cpt_value' => $firstRow['cpt'],
                                'error' => $e->getMessage()
                            ]);
                        }
                    }

                    // If no cpt in first row, look for any cpt in the trip as fallback
                    if (!$scheduledAt) {
                        foreach ($rows as $row) {
                            if (!empty($row['cpt'])) {
                                try {
                                    $scheduledAt = $this->parseExcelDate($row['cpt']);
                                    // Ensure it's a Carbon instance
                                    if (is_string($scheduledAt)) {
                                        $scheduledAt = \Carbon\Carbon::parse($scheduledAt);
                                    }
                                    \Log::info("Using cpt from row other than first for trip {$tripId}");
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
                                $estimatedEndDate = \Carbon\Carbon::parse($estimatedEndDate);
                            }
                        } catch (\Exception $e) {
                            \Log::warning('Failed to parse stop_2_yard_arrival from last row', [
                                'trip_id' => $tripId,
                                'stop_2_yard_arrival_value' => $lastRow['stop_2_yard_arrival'],
                                'error' => $e->getMessage()
                            ]);
                        }
                    }
                    
                    // Fallback: use the latest yard arrival date if stop_2_yard_arrival is empty or failed to parse
                    if (!$estimatedEndDate && !empty($yardArrivalDates)) {
                        $estimatedEndDate = collect($yardArrivalDates)->sortDesc()->first();
                        // Ensure it's a Carbon instance
                        if (is_string($estimatedEndDate)) {
                            $estimatedEndDate = \Carbon\Carbon::parse($estimatedEndDate);
                        }
                        \Log::info("Using fallback yard arrival date for estimated_end_date in trip {$tripId}");
                    }

                    // Enhanced logging for debugging
                    \Log::info("Trip {$tripId} final dates", [
                        'scheduled_at' => $scheduledAt ? $scheduledAt->format('Y-m-d H:i:s') : 'null',
                        'estimated_end_date' => $estimatedEndDate ? $estimatedEndDate->format('Y-m-d H:i:s') : 'null',
                        'first_row_cpt' => $firstRow['cpt'] ?? 'empty',
                        'last_row_stop_2_yard_arrival' => $lastRow['stop_2_yard_arrival'] ?? 'empty',
                        'total_rows_in_trip' => count($rows),
                        'yard_arrival_dates_found' => count($yardArrivalDates)
                    ]);

                    //carrier details
                    $carrier = $firstRow['carrier'] ?? null;
                    if($carrier) {
                        $carrier_uuid = Fleet::where('name', $carrier)
                            ->where('company_uuid', session('company'))
                            ->whereNull('deleted_at')
                            ->value('uuid');
                    }
                    $subcarrier = $firstRow['subcarrier'] ?? null;
                    if($subcarrier){
                        $subcarrier_uuid = Fleet::where('name', $subcarrier)
                            ->where('company_uuid', session('company'))
                            ->whereNull('deleted_at')
                            ->value('uuid');
                    }
                    $orderInput = [
                        'order' => [
                            'internal_id' => $firstRow['block_id'] ?? null,
                            'public_id' => $tripId,
                            'status' => strtolower($firstRow['status'] ?? 'planned'),
                            'type' => 'transport',
                            'scheduled_at' => $scheduledAt,
                            'estimated_end_date' => $estimatedEndDate,
                            'fleet_uuid' => $carrier_uuid ?? null,
                            'sub_fleet_uuid' => $subcarrier_uuid ?? null,
                            'meta' => [
                                'vehicle_id' => $firstRow['vehicle_id'] ?? null,
                                'carrier' => $firstRow['carrier'] ?? null,
                                'subcarrier' => $firstRow['subcarrier'] ?? null,
                                'equipment_type' => $firstRow['equipment_type'] ?? null,
                                'cpt' => $firstRow['cpt'] ?? null
                            ],
                            'payload' => [
                                'waypoints' => []
                            ]
                        ]
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
                        function (&$request, Order &$order, &$requestInput) {
                            $input = $request->input('order');
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

                    $savedWaypoints = [];
                    $waypointMeta = [];
                    foreach ($waypoints as $wpData) {
                        $saved = Waypoint::create([
                            'company_uuid' => session('company'),
                            'payload_uuid' => $order->payload_uuid,
                            'place_uuid' => $wpData['place_uuid'],
                            'order' => $wpData['order'],
                            'meta' => $wpData['meta'],
                        ]);
                        $savedWaypoints[] = $saved;
                        $waypointMeta[$saved->uuid] = $wpData['meta'];
                    }

                    // Create route segments - this can now fail safely within transaction
                    $this->createRouteSegmentsFromRows($routeRows, $order, $savedWaypoints, $waypointMeta);
                    
                    // If we reach here, everything succeeded
                    DB::commit();
                    
                    $ordersCache[$tripId] = $order;
                    $records[] = $order;
                    event(new OrderReady($order));
                    
                } catch (\Exception $e) {
                    // Rollback the entire trip if anything fails
                    DB::rollback();
                    
                    $importErrors[] = [
                        '-',
                        "Trip {$tripId}: " . $e->getMessage(),
                        $tripId
                    ];
                    
                    \Log::error('Trip import failed', [
                        'trip_id' => $tripId,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);
                }
            }
        }

        if (!empty($importErrors)) {
            $successCount = count($records);
            $errorCount = count($importErrors);
            $createdCount = count($createdOrders);
            $updatedCount = count($updatedOrders);

            return response()->json([
                'success' => false,
                'partial_success' => $successCount > 0,
                'successful_imports' => $successCount,
                'created_orders' => $createdCount,
                'updated_orders' => $updatedCount,
                'total_errors' => $errorCount,
                'errors' => $importErrors,
                'message' => $successCount > 0
                    ? "Partial import completed. {$createdCount} trips created, {$updatedCount} trips updated, {$errorCount} errors found."
                    : "Import failed. No trips were imported due to validation errors."
            ]);
        }

        $successCount = count($records);
        $createdCount = count($createdOrders);
        $updatedCount = count($updatedOrders);

        return [
            'records' => $records,
            'summary' => [
                'total_processed' => $successCount,
                'created' => $createdCount,
                'updated' => $updatedCount,
                'created_trips' => $createdOrders,
                'updated_trips' => $updatedOrders
            ]
        ];

    } catch (\Exception $e) {
        \Log::error('Order import failed', [
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json(['success' => false, 'errors' => [[$e->getMessage()]]]);
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
        try {
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
                    $routeSegment->public_id = 'RI_' . Str::upper(Str::random(5));
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
public function createRouteSegmentsFromRows(array $rows, Order $order, array $savedWaypoints = [], array $waypointMeta = []): void
{
    $errors = [];
    $createdSegments = [];
    
    // PRE-CHECK: Validate VR IDs for uniqueness
    $vrIds = array_filter(array_map(function($row) {
        return $row['vr_id'] ?? null;
    }, $rows));
    
    if (!empty($vrIds)) {
        $existingSegments = RouteSegment::whereIn('public_id', $vrIds)
          ->whereNull('deleted_at')->get();
        if ($existingSegments->count() > 0) {
            $existingIds = $existingSegments->pluck('public_id')->toArray();
            throw new \Exception("VR ID already exists for the order:" . implode(', ', $existingIds));
        }
    }
    
    foreach ($rows as $groupIndex => $row) {
        $originalRowIndex = $row['_original_row_index'] ?? $groupIndex;
        $fromCode = $row['stop_1'] ?? null;
        $toCode = $row['stop_2'] ?? null;

        if (!$fromCode || !$toCode) {
            $displayRowIndex = $originalRowIndex + 1;
            $errors[] = [$displayRowIndex, "Missing stop_1 or stop_2", $order->public_id];
            continue;
        }

        // Find the correct waypoints for this specific row
        $fromWaypoint = null;
        $toWaypoint = null;
        
        if (!empty($savedWaypoints) && !empty($waypointMeta)) {
            \Log::info('Searching waypoints via metadata', [
                'total_waypoints' => count($savedWaypoints),
                'looking_for_row' => $originalRowIndex,
                'from_code' => $fromCode,
                'to_code' => $toCode
            ]);

            foreach ($savedWaypoints as $waypoint) {
                $meta = $waypointMeta[$waypoint->uuid] ?? [];
                if (isset($meta['row_index']) && $meta['row_index'] == $originalRowIndex) {
                    if (isset($meta['stop_key']) && $meta['stop_key'] === 'stop_1' && 
                        isset($meta['place_code']) && $meta['place_code'] === $fromCode) {
                        $fromWaypoint = $waypoint;
                    }
                    if (isset($meta['stop_key']) && $meta['stop_key'] === 'stop_2' && 
                        isset($meta['place_code']) && $meta['place_code'] === $toCode) {
                        $toWaypoint = $waypoint;
                    }
                }
            }

            // Fallback if metadata matching fails
            if (!$fromWaypoint || !$toWaypoint) {
                $fromPlace = Place::where('code', $fromCode)->where('company_uuid', session('company'))
                                    ->whereNull('deleted_at')->first();
                $toPlace = Place::where('code', $toCode)->where('company_uuid', session('company'))
                                    ->whereNull('deleted_at')->first();

                if ($fromPlace && $toPlace) {
                    foreach ($savedWaypoints as $waypoint) {
                        if (!$fromWaypoint && $waypoint->place_uuid === $fromPlace->uuid) {
                            $meta = $waypointMeta[$waypoint->uuid] ?? [];
                            if (isset($meta['stop_key']) && $meta['stop_key'] === 'stop_1') {
                                $fromWaypoint = $waypoint;
                            }
                        }
                        if (!$toWaypoint && $waypoint->place_uuid === $toPlace->uuid) {
                            $meta = $waypointMeta[$waypoint->uuid] ?? [];
                            if (isset($meta['stop_key']) && $meta['stop_key'] === 'stop_2') {
                                $toWaypoint = $waypoint;
                            }
                        }
                    }
                }
            }
        } else {
            // Database lookup fallback
            $fromPlace = Place::where('code', $fromCode)->where('company_uuid', session('company'))
                                    ->whereNull('deleted_at')->first();
            $toPlace = Place::where('code', $toCode)->where('company_uuid', session('company'))
                                    ->whereNull('deleted_at')->first();

            if (!$fromPlace || !$toPlace) {
                $displayRowIndex = $originalRowIndex + 1;
                $errors[] = [$displayRowIndex, "Invalid place code from: {$fromCode}, to: {$toCode}", $order->public_id];
                continue;
            }

            $waypoints = Waypoint::where('payload_uuid', $order->payload_uuid)
                ->orderBy('order')
                ->get();
            
            $fromWaypoint = $waypoints->firstWhere('place_uuid', $fromPlace->uuid);
            $toWaypoint = $waypoints->firstWhere('place_uuid', $toPlace->uuid);
        }

        if (!$fromWaypoint || !$toWaypoint) {
            $displayRowIndex = $originalRowIndex + 1;
            $errors[] = [$displayRowIndex, "Missing waypoint for from/to place (from: {$fromCode}, to: {$toCode})", $order->public_id];
            continue;
        }

        try {
            // Generate unique public_id if vr_id is empty or already exists
            $publicId = $row['vr_id'] ?? null;
            if (empty($publicId)) {
                $publicId = 'RI_' . Str::upper(Str::random(8));
            }
            
            // Double-check for uniqueness
            $exists = RouteSegment::where('public_id', $publicId)->exists();
            if ($exists) {
                throw new \Exception("VR ID '{$publicId}' already exists");
            }

            $routeSegment = new RouteSegment();
            $routeSegment->order_id = $order->id;
            $routeSegment->payload_id = $order->payload_uuid;
            $routeSegment->from_waypoint_id = $fromWaypoint->uuid;
            $routeSegment->to_waypoint_id = $toWaypoint->uuid;
            $routeSegment->public_id = $publicId;
            $routeSegment->company_uuid = session('company');
            $routeSegment->created_by_id = UserHelper::getIdFromUuid(auth()->id());

            // Handle potential array values from Excel
            $routeSegment->cr_id = is_array($row['cr_id'] ?? null) ? null : ($row['cr_id'] ?? null);
            $routeSegment->shipper_accounts = is_array($row['shipper_accounts'] ?? null) ? null : ($row['shipper_accounts'] ?? null);
            $routeSegment->equipment_type = is_array($row['equipment_type'] ?? null) ? null : ($row['equipment_type'] ?? null);
            $routeSegment->trailer_id = is_array($row['trailer_id'] ?? null) ? null : ($row['trailer_id'] ?? null);
            $routeSegment->operator_id = is_array($row['operator_id'] ?? null) ? null : ($row['operator_id'] ?? null);
            $routeSegment->tender_status = $row['tender_status'] ?? null;
            $routeSegment->facility_sequence = $row['facility_sequence'] ?? null;

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

            // Handle date parsing safely
            $routeSegment->vr_creation_date_time = null;
            if (!empty($row['vr_creation_date_time']) && !is_array($row['vr_creation_date_time'])) {
                try {
                    $routeSegment->vr_creation_date_time = $this->parseExcelDate($row['vr_creation_date_time']);
                } catch (\Exception $e) {
                    \Log::warning('Failed to parse vr_creation_date_time', [
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
                    \Log::warning('Failed to parse vr_cancellation_date_time', [
                        'value' => $row['vr_cancellation_date_time'],
                        'error' => $e->getMessage()
                    ]);
                }
            }

            $routeSegment->save();
            $createdSegments[] = $routeSegment->id;
            
            \Log::info('Route segment created successfully', [
                'segment_id' => $routeSegment->uuid,
                'public_id' => $routeSegment->public_id,
                'from_waypoint_id' => $routeSegment->from_waypoint_id,
                'to_waypoint_id' => $routeSegment->to_waypoint_id
            ]);
            
        } catch (\Exception $e) {
            $displayRowIndex = $originalRowIndex + 1;
            $errors[] = [$displayRowIndex, $e->getMessage(), $order->public_id];
            
            \Log::error('Route segment creation error', [
                'row_index' => $originalRowIndex,
                'vr_id' => $row['vr_id'] ?? 'N/A',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'row_data' => $row
            ]);
        }
    }

    if (!empty($errors)) {
        $errorMessages = array_map(function($error) {
            return "Row {$error[0]}: {$error[1]}";
        }, $errors);
        
        throw new \Exception("Route Segment Import Failed: " . implode("; ", $errorMessages));
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
     * Parse an Excel date value into a standard datetime string.
     *
     * @param mixed $value The Excel cell value (could be a serial number or string).
     * @return string|null Formatted datetime string ('Y-m-d H:i:s') or null on failure.
     */
    private function parseExcelDate($value)
    {
        try {
            // If it's a number, treat it as Excel serial date
            if (is_numeric($value)) {
                return \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($value)->format('Y-m-d H:i:s');
            }

            // Try parsing as string
            return Carbon::parse(str_replace('/', '-', $value))->format('Y-m-d H:i:s');
        } catch (\Exception $e) {
            return null; // Or optionally throw or log error
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
}
