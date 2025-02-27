<?php

namespace Fleetbase\Traits;

use Closure;
use Fleetbase\Exceptions\FleetbaseRequestValidationException;
use Fleetbase\Http\Requests\Internal\BulkDeleteRequest;
use Fleetbase\Support\Http;
use Fleetbase\Support\Resolve;
use Fleetbase\Support\Utils;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Fleetbase\FleetOps\Models\Order;
use Fleetbase\FleetOps\Models\Driver;
use App\Models\LeaveRequest;
use Carbon\Carbon;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;
trait HasApiControllerBehavior
{
    /**
     * The target eloquent data model.
     *
     * @var Model
     */
    public $model;

    /**
     * The target eloquent data model class name.
     *
     * @var string
     */
    public $modelClassName;

    /**
     * The target resource name pluralized.
     *
     * @var string
     */
    public $resourcePluralName;

    /**
     * The target resource name singularized.
     *
     * @var string
     */
    public $resourceSingularlName;

    /**
     * The target API Resource.
     *
     * @var \Fleetbase\Http\Resources\FleetbaseResource
     */
    public $resource;

    /**
     * The target Service the controller belongs to.
     *
     * @var string
     */
    public $service;

    /**
     * The target API Filter.
     *
     * @var \Fleetbase\Http\Filter\Filter
     */
    public $filter;

    /**
     * The current request.
     *
     * @var Request
     */
    public $request;

    /**
     * Determine if the JSON should be compressed.
     *
     * @var Request
     */
    public $compressJson = false;

    /**
     * Determines the action to perform based on the HTTP verb.
     *
     * @param string|null $verb The HTTP verb to check. Defaults to the request method if not provided.
     *
     * @return string the action to perform based on the HTTP verb
     */
    private function actionFromHttpVerb(?string $verb = null)
    {
        $verb   = $verb ?? $_SERVER['REQUEST_METHOD'];
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

    /**
     * Set the model instance to use.
     *
     * @param Model $model - The Model Instance
     */
    public function setApiModel(?Model $model = null, string $namespace = '\\Fleetbase')
    {
        $this->modelClassName        = $modelName = Utils::getModelClassName($model ?? $this->resource, $namespace);
        $this->model                 = $model = Resolve::instance($modelName);
        $this->resource              = $this->getApiResourceForModel($model, $namespace);
        $this->service               = $this->getApiServiceFromNamespace($namespace);
        $this->request               = $this->getApiRequestForModel($model, $namespace);
        $this->resourcePluralName    = $model->getPluralName();
        $this->resourceSingularlName = $model->getSingularName();

        if ($this->filter) {
            $this->model->filter = $this->filter;
        }
    }

    /**
     * Set the Resource object to use.
     */
    public function setApiResource($resource, ?string $namespace)
    {
        if (!$this->resource) {
            $this->resource = (is_object($resource) ? get_class($resource) : $resource) ?? $this->getApiResourceForModel($this->model, $namespace);
        }
    }

    /**
     * Set the FormRequest object to use.
     *
     * @param FormRequest|string $request
     */
    public function setApiFormRequest($request)
    {
        $this->request = is_object($request) ? get_class($request) : $request;
    }

    /**
     * Returns the API service name associated with the given namespace or the current class.
     *
     * If no namespace is provided, it defaults to the current class namespace.
     * If the service is not already set, it is generated from the namespace using the getServiceNameFromNamespace method.
     *
     * @param string|null $namespace The namespace to generate the service name from (optional)
     *
     * @return string The API service name
     */
    public function getApiServiceFromNamespace(?string $namespace = null)
    {
        $namespace = $namespace ?? get_class($this);
        $service   = $this->service;

        if (!$service) {
            $service = static::getServiceNameFromNamespace($namespace);
        }

        return $service;
    }

    /**
     * Generates a slugified service name from a given namespace.
     *
     * The service name is generated by taking the first or second segment of the namespace (depending on the number of segments),
     * slugifying it by inserting dashes before uppercase letters, and converting it to lowercase.
     *
     * @param string $namespace The namespace to generate the service name from
     *
     * @return string The generated service name
     */
    private function getServiceNameFromNamespace(string $namespace)
    {
        $segments         = array_values(array_filter(explode('\\', $namespace)));
        $targetSegment    = count($segments) === 1 ? $segments[0] : $segments[1];
        $slugifiedSegment = preg_replace('/(?<=[a-z])(?=[A-Z])/', '-', $targetSegment);
        $slugifiedSegment = strtolower($slugifiedSegment);

        return $slugifiedSegment;
    }

    /**
     * Resolves the api resource for this model.
     *
     * @param \Fleetbase\Models\Model $model
     *
     * @return \Fleetbase\Http\Resources\FleetbaseResource
     */
    public function getApiResourceForModel(Model $model, ?string $namespace = null)
    {
        $resource = $this->resource;

        if (!$resource || !Str::startsWith($resource, '\\')) {
            $resource = Resolve::httpResourceForModel($model, $namespace);
        }

        return $resource;
    }

    /**
     * Resolves the form request for this model.
     *
     * @param \Fleetbase\Models\Model $model
     *
     * @return \Fleetbase\Http\Requests\FleetbaseRequest
     */
    public function getApiRequestForModel(Model $model, ?string $namespace = null)
    {
        $request = $this->request;

        if (!$request) {
            $request = Resolve::httpRequestForModel($this->model, $namespace);
        }

        return $request;
    }

    /**
     * Gets the singular name of the resource.
     *
     * Returns the singular name of the resource, e.g. "user" for a UserController.
     *
     * @return string The singular name of the resource
     */
    public function getResourceSingularName(): string
    {
        return $this->resourceSingularlName;
    }

    /**
     * Gets the service associated with the controller.
     *
     * Returns the fully qualified name of the service namespace that is used by
     * the controller to perform business logic operations.
     *
     * @return string The fully qualified name of the service
     */
    public function getService(): string
    {
        return $this->service;
    }

    /**
     * Resolves the resource form request and validates.
     *
     * @return void
     *
     * @throws FleetbaseRequestValidationException
     */
    public function validateRequest(Request $request)
    {
        if (Utils::classExists($this->request)) {
            $formRequest = new $this->request($request->all());
            $validator   = Validator::make($request->all(), $formRequest->rules(), $formRequest->messages());

            if ($validator->fails()) {
                throw new FleetbaseRequestValidationException($validator->errors());
            }
        }
    }

    /**
     * Get All.
     *
     * Returns a list of items in this resource and allows filtering the data based on fields in the database
     *
     * Options for searching / filtering
     * - By field name: e.g. `?name=John` - Specific search
     * - By field name with `LIKE` operator: e.g. `?name_like=John` - Fuzzy search
     * - By field name with `!=` operator: e.g. `?age_not=5`
     * - By field name with `>` or `<` operator: e.g. `?age_gt=5` or `?age_lt=10`
     * - By field name with `>=` or `<=` operator: e.g. `?age_gte=5` or `?age_lte=10`
     * - By field name with `IN` or `NOT IN` operator: e.g. `?id_in=1,3,5` or `?id_notIn=2,4`
     * - By field name with `NULL` or `NOT NULL` operator: e.g. `?email_isNull` or `?email_isNotNull`
     *
     * @queryParam limit Total items to return e.g. `?limit=15`. Example: 3
     * @queryParam page Page of items to return e.g. `?page=1`. Example: 1
     * @queryParam sort Sorting options e.g. `?sort=field1:asc,field2:asc` OR `?sort=latest/oldest` OR `?sort=-created,created`. Example: latest
     * @queryParam count Count related models. Alternatively `with_count` e.g. `?count=relation1,relation2`. No-example
     * @queryParam contain Contain data from related model e.g. `?contain=relation1,relation2`. No-example
     * @queryParam fieldName Pass any field and value to filter results e.g. `name=John&email=any@aol.com`. No-example
     *
     * @authenticated
     *
     * @return \Illuminate\Http\Response
     */
    public function queryRecord(Request $request)
    {
        $single        = $request->boolean('single');
        $queryCallback = $this->getControllerCallback('onQueryRecord');
        if (get_class($this->model) === 'Fleetbase\FleetOps\Models\Order') {
            
            $combinedCallback = function ($query) use ($request, $queryCallback) {
                // Apply the original callback if it exists
                if ($queryCallback) {
                    $queryCallback($query);
                }
                // Add date filtering if 'on' parameter exists
                if ($request->filled('on')) {
                    $on = Carbon::parse($request->input('on'));
                    
                    $query->where(function ($q) use ($on) {
                        // Check if scheduled_at column exists in the table
                        $hasScheduledAt = Schema::hasColumn($this->model->getTable(), 'scheduled_at');
                        
                        if ($hasScheduledAt) {
                            $q->whereDate('scheduled_at', $on);
                        } else {
                            $q->whereDate('created_at', $on);
                        }
                    });
                }
            };
            $data = $this->model->queryFromRequest($request, $combinedCallback);
        }
        else {
            $data = $this->model->queryFromRequest($request, $queryCallback);
        }

        // Create a new callback that combines date filtering with existing callback
        

        
        if (get_class($this->model) === 'Fleetbase\FleetOps\Models\Driver' && $request->has('order_uuid')) {
            // Get the order
            // print_r($request->order_uuid);
            $order = \Fleetbase\FleetOps\Models\Order::where('uuid', $request->order_uuid)->first();
            
            if ($order) {
                // Filter drivers based on availability
                $data = $data->map(function ($driver) use ($order) {
                    $availability = $this->driverAvailability($order, $driver->uuid);
                    $driver->is_available = ($availability && $availability['status'] === true) ? 1 : 0;
                    return $driver;
                });
            }
        }
        if ($single) {
            $data = Arr::first($data);

            if (!$data) {
                return response()->error(Str::title($this->resourceSingularlName) . ' not found', 404);
            }

            if (Http::isInternalRequest($request)) {
                $this->resource::wrap($this->resourceSingularlName);

                return new $this->resource($data);
            }

            return new $this->resource($data);
        }

        if (Http::isInternalRequest($request)) {
            $this->resource::wrap($this->resourcePluralName);

            return $this->resource::collection($data);
        }

        return $this->resource::collection($data);
    }

    /**
     * View Resource.
     *
     * Returns information about a specific record in this resource. You can return related data or counts of related data
     * in the response using the `count` and `contain` query params
     *
     * @authenticated
     *
     * @queryParam count Count related models. Alternatively `with_count` e.g. `?count=relation1,relation2`. No-example
     * @queryParam contain Contain data from related model e.g. `?contain=relation1,relation2`. No-example
     *
     * @urlParam id integer required The id of the resource to view
     *
     * @response 404 {
     *  "status": "failed",
     *  "message": "Resource not found"
     * }
     *
     * @param int $id
     *
     * @return \Illuminate\Http\Response
     */
    public function findRecord(Request $request, $id)
    {
        $record = $this->model->getById($id, $request);

        if ($record) {
            return [$this->resourceSingularlName => new $this->resource($record)];
        }

        return response()->error(Str::title($this->resourceSingularlName) . ' not found', 404);
    }

    /**
     * Create Resource.
     *
     * Create a new record of this resource in the database. You can return related data or counts of related data
     * in the response using the `count` and `contain` query params
     *
     * @authenticated
     *
     * @queryParam count Count related models. Alternatively `with_count` e.g. `?count=relation1,relation2`. No-example
     * @queryParam with|expand Contain data from related model e.g. `?with=relation1,relation2`. No-example
     *
     * @response 400 {
     *  "status": "error",
     *  "message": [
     *     "validation error message"
     *  ]
     * }
     * @response 500 {
     *  "status": "error",
     *  "message": "Details of error message"
     * }
     *
     * @return \Illuminate\Http\Response
     */
    public function createRecord(Request $request)
    {
        try {
            $onBeforeCallback = $this->getControllerCallback('onBeforeCreate');
            $onAfterCallback  = $this->getControllerCallback('onAfterCreate');

            $this->validateRequest($request);
            $record = $this->model->createRecordFromRequest($request, $onBeforeCallback, $onAfterCallback);

            if (Http::isInternalRequest($request)) {
                $this->resource::wrap($this->resourceSingularlName);

                return new $this->resource($record);
            }

            return new $this->resource($record);
        } catch (\Exception $e) {
            return response()->error($e->getMessage());
        } catch (QueryException $e) {
            return response()->error($e->getMessage());
        } catch (FleetbaseRequestValidationException $e) {
            return response()->error($e->getErrors());
        }
    }

    /**
     * Update Resource.
     *
     * Updates the data of the record with the specified `id`. You can return related data or counts of related data
     * in the response using the `count` and `contain` query params
     *
     * @authenticated
     *
     * @queryParam count Count related models. Alternatively `with_count` e.g. `?count=relation1,relation2`. No-example
     * @queryParam contain Contain data from related model e.g. `?contain=relation1,relation2`. No-example
     *
     * @response 400 {
     *  "status": "error",
     *  "message": [
     *     "validation error messages"
     *  ]
     * }
     * @response 404 {
     *  "status": "failed",
     *  "message": "Resource not found"
     * }
     * @response 500 {
     *  "status": "error",
     *  "message": "Details of error message"
     * }
     *
     * @return \Illuminate\Http\Response
     */
    public function updateRecord(Request $request, string $id)
    {
       
        try {
            $model_name = str_replace('Controller', '', class_basename($this));
            if ($model_name === 'Order') {
                $order = Order::find($id);
                $driverAssignedUuid = $request->input('order.driver_assigned_uuid');
                //check if the driver able to take the order
                if (isset($driverAssignedUuid)){
                    
                    if($order->driver_assigned_uuid === null || 
                    $order->driver_assigned_uuid !== $driverAssignedUuid) {
                    
                        $check_driver_availability = $this->driverAvailability($order, $driverAssignedUuid);
                        $warnings = $check_driver_availability['warnings'] ?? [];
                        if (!empty($warnings)) {
                            foreach ($warnings as $warning) {
                                Log::warning($warning);
                            }
                        }
                        // if ($check_driver_availability && $check_driver_availability['status'] !== true) {
                        //     return response()->error($check_driver_availability['message'], 400);
                        // }

                    }
                } 
            }
            $onBeforeCallback = $this->getControllerCallback('onBeforeUpdate');
            $onAfterCallback  = $this->getControllerCallback('onAfterUpdate');

            $this->validateRequest($request);
            $record = $this->model->updateRecordFromRequest($request, $id, $onBeforeCallback, $onAfterCallback);

            if (Http::isInternalRequest($request)) {
                $this->resource::wrap($this->resourceSingularlName);

                return new $this->resource($record);
            }

            return new $this->resource($record);
        } catch (\Exception $e) {
            return response()->error($e->getMessage());
        } catch (QueryException $e) {
            return response()->error($e->getMessage());
        } catch (FleetbaseRequestValidationException $e) {
            return response()->error($e->getErrors());
        }
    }

    /**
     * Delete Resource.
     *
     * Deletes the record with the specified `id`
     *
     * @authenticated
     *
     * @response {
     *  "status": "success",
     *  "message": "Resource deleted",
     *  "data": {
     *     "id": 1
     *  }
     * }
     * @response 404 {
     *  "status": "failed",
     *  "message": "Resource not found"
     * }
     *
     * @param string $id
     *
     * @return \Illuminate\Http\Response
     */
    public function deleteRecord($id, Request $request)
    {
        if (Http::isInternalRequest($request)) {
            $key       = $this->model->getKeyName();
            $builder   = $this->model->where($key, $id);
        } else {
            $builder = $this->model->wherePublicId($id);
        }
        $builder   = $this->model->applyDirectivesToQuery($request, $builder);
        $dataModel = $builder->first();

        if ($dataModel) {
            $dataModel->delete();

            if (Http::isInternalRequest($request)) {
                $this->resource::wrap($this->resourceSingularlName);

                return new $this->resource($dataModel);
            }

            return response()->json(
                [
                    'status'  => 'success',
                    'message' => Str::title($this->resourceSingularlName) . ' deleted',
                    'data'    => new $this->resource($dataModel),
                ]
            );
        }

        return response()->json(
            [
                'status'  => 'failed',
                'message' => Str::title($this->resourceSingularlName) . ' not found',
            ],
            404
        );
    }

    /**
     * Delete Resource.
     *
     * Deletes the record with the specified `id`
     *
     * @authenticated
     *
     * @response {
     *  "status": "success",
     *  "message": "Resource deleted",
     *  "data": {
     *     "id": 1
     *  }
     * }
     * @response 404 {
     *  "status": "failed",
     *  "message": "Resource not found"
     * }
     *
     * @return \Illuminate\Http\Response
     */
    public function bulkDelete(BulkDeleteRequest $request)
    {
        $ids   = $request->input('ids', []);
        $count = 0;

        try {
            $count = $this->model->bulkRemove($ids);
        } catch (\Exception $e) {
            return response()->error($e->getMessage());
        } catch (QueryException $e) {
            return response()->error($e->getMessage());
        } catch (FleetbaseRequestValidationException $e) {
            return response()->error($e->getErrors());
        }

        return response()->json(
            [
                'status'  => 'success',
                'message' => 'Deleted ' . $count . ' ' . Str::plural($this->resourceSingularlName, $count),
                'count'   => $count,
            ]
        );
    }

    /**
     * Search Resources.
     *
     * Allows searching for data in this resource using multiple options.
     *
     * Options for searching
     * - By field name: e.g. `?name=John` - Specific search
     * - By field name with `LIKE` operator: e.g. `?name_like=John` - Fuzzy search
     * - By field name with `!=` operator: e.g. `?age_not=5`
     * - By field name with `>` or `<` operator: e.g. `?age_gt=5` or `?age_lt=10`
     * - By field name with `>=` or `<=` operator: e.g. `?age_gte=5` or `?age_lte=10`
     * - By field name with `IN` or `NOT IN` operator: e.g. `?id_in=1,3,5` or `?id_notIn=2,4`
     * - By field name with `NULL` or `NOT NULL` operator: e.g. `?email_isNull` or `?email_isNotNull`
     *
     * @queryParam limit Total items to return e.g. `?limit=15`. Example: 3
     * @queryParam page Page of items to return e.g. `?page=1`. Example: 1
     * @queryParam sort Sorting options e.g. `?sort=field1:asc,field2:asc` OR `?sort=latest/oldest`. Example: latest
     * @queryParam count Count related models. Alternatively `with_count` e.g. `?count=relation1,relation2`. No-example
     * @queryParam contain Contain data from related model e.g. `?contain=relation1,relation2`. No-example
     * @queryParam fieldName Pass any field and value to search by e.g. `name=John&email=any@aol.com`. Search logic may use LIKE or `=` depending on field
     *
     * @authenticated
     */
    public function search(Request $request)
    {
        $results = $this->model->search($request);

        return $this->resource::collection($results);
    }

    /**
     * Count Resources.
     *
     * Returns a simple count of data in this resource
     *
     * @queryParam fieldName Pass any field and value to search by e.g. `name=John&email=any@aol.com`. Search logic may use LIKE or `=` depending on field. No-example
     *
     * @authenticated
     */
    public function count(Request $request)
    {
        $results = $this->model->count($request);

        return response()->json(['count' => $results]);
    }

    /**
     * Retrieves a Closure for a specified method of the controller if it exists.
     *
     * This method checks if a method with the given name exists in the current controller instance.
     * If the method exists, it returns a Closure that, when invoked, will call the specified method
     * with any provided arguments. This allows for dynamic method invocation while ensuring the method's existence.
     *
     * @param string $name the name of the controller method to retrieve as a Closure
     *
     * @return \Closure|null a Closure that calls the specified method, or null if the method does not exist
     */
    private function getControllerCallback(string $name): ?\Closure
    {
        if (method_exists($this, $name)) {
            return function (...$args) use ($name) {
                return $this->{$name}(...$args);
            };
        }

        return null;
    }
    /**
     * Check if driver is available to take the order
     * @param Order $order
     * @param string $driver_uuid
     * @return bool
     */
    private function checkDriverAvailability($order, $driver_uuid)
    {
        // Check if driver exists
        $driver = Driver::where('uuid', $driver_uuid)->first();
        if (!$driver) {
            return false;
        }
       // Check if the driver has a vehicle assigned
        if (is_null($driver->vehicle_uuid)) { 
            return false;
        }
        // Calculate order duration in days
        try {
            $orderEta = $order->tracker()->eta();
            $totalSeconds = array_sum(array_values($orderEta));
            $totalHours = $totalSeconds / 3600;
            $orderDuration = ceil($totalHours / 9); // in days
            $orderEndDate = Carbon::parse($order->scheduled_at)->addDays($orderDuration);
            //2025-08-20
            // Check for overlapping leave requests
            $leaveRequest = LeaveRequest::where('driver_uuid', $driver_uuid)
            ->where(function ($query) use ($order, $orderEndDate) {
                $query->whereDate('start_date', '<=', $orderEndDate)
                    ->whereDate('end_date', '>=', $order->scheduled_at);
            })
            ->first();
            if ($leaveRequest) {
               
                return false;
            }
            // Check for active orders
            $activeOrder = Order::where('driver_assigned_uuid', $driver_uuid)
                ->whereNotIn('status', ['completed', 'cancelled'])
                ->first();
            if (!$activeOrder) {
                
                return true;
            }
            // Calculate driver availability based on current active order
            $etaValues = $activeOrder->tracker()->eta();
            $totalHours = array_sum(array_values($etaValues)) / 3600;
            $workingDays = ceil($totalHours / 9);
            $unavailableDays = $workingDays + 2;
            $unavailableUntil = now()->addDays($unavailableDays);
            $scheduledDate = Carbon::parse($order->scheduled_at);
            $isAvailable = $scheduledDate->greaterThan($unavailableUntil);
            return $isAvailable;

        } catch (\Exception $e) {
            return false;
        }
    }

    private function driverAvailability($order, $driver_uuid)
    {
        // Check if driver exists
        $driver = Driver::where('uuid', $driver_uuid)->first();
        if (!$driver) {
            return [
                'status' => false,
                'error' => 'Driver not found'
            ];
        }

        if (is_null($driver->vehicle_uuid)) { 
            $warnings[] = 'The order is assigned successfully despite no vehicle assigned to the driver.';
            // return [
            //     'status' => false,
            //     'message' => 'No vehicle assigned to the driver.',
            // ];
        }

        try {
            $orderStartDate = Carbon::parse($order->scheduled_at);
            $orderEndDate = Carbon::parse($order->estimated_end_date);

            // Check for overlapping leave requests
            $leaveRequest = LeaveRequest::where('driver_uuid', $driver_uuid)
                ->where(function ($query) use ($orderStartDate, $orderEndDate) {
                    $query->where(function ($q) use ($orderStartDate, $orderEndDate) {
                        $q->where('start_date', '<=', $orderEndDate->format('Y-m-d'))
                          ->where('end_date', '>=', $orderStartDate->format('Y-m-d'));
                    });
                })
                ->whereNull('deleted_at')
                ->first();
        
            if ($leaveRequest) {
                $warnings[] = 'The order is assigned successfully, but the driver is on leave.';
                // return [
                //     'status' => false,
                //     'message' => 'Driver is on leave during the scheduled order period.',
                // ];
            }

            // Check for overlapping active orders
            $activeOrder = Order::where('driver_assigned_uuid', $driver_uuid)
                ->whereNotIn('status', ['completed', 'cancelled'])
                ->where(function ($query) use ($orderStartDate, $orderEndDate) {
                    $query->where(function ($q) use ($orderStartDate, $orderEndDate) {
                        $q->where('scheduled_at', '<=', $orderEndDate)
                          ->where('estimated_end_date', '>=', $orderStartDate);
                    });
                })
                ->first();

            if ($activeOrder) {
                $warnings[] = 'The order is assigned successfully despite the driver having another active order.';
                // return [
                //     'status' => false,
                //     'message' => 'Driver has another active order during this period.',
                // ];
            }

            return [
                'status' => true,
                'error' => 'Driver is available'
            ];


        } catch (\Exception $e) {
            return [
                'status' => false,
                'error' => 'Error checking driver availability'
            ];
        }
    }
}