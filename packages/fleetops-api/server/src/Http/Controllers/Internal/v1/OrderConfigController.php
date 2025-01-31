<?php

namespace Fleetbase\FleetOps\Http\Controllers\Internal\v1;

use Fleetbase\Exceptions\FleetbaseRequestValidationException;
use Fleetbase\FleetOps\Http\Controllers\FleetOpsController;
use Fleetbase\FleetOps\Http\Requests\Internal\CreateOrderConfigRequest;
use Fleetbase\FleetOps\Models\OrderConfig;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class OrderConfigController extends FleetOpsController
{
    /**
     * The resource to query.
     *
     * @var string
     */
    public $resource = 'order-config';

    /**
     * Creates a record with request payload.
     *
     * @return \Illuminate\Http\Response
     */
    public function createRecord(Request $request)
    {
        // Create validation request
        $createOrderRequest  = CreateOrderConfigRequest::createFrom($request);
        $rules               = $createOrderRequest->rules();

        // Manually validate request
        $validator = Validator::make($request->input('orderConfig'), $rules);
        if ($validator->fails()) {
            return $createOrderRequest->responseWithErrors($validator);
        }

        try {
            $record = $this->model->createRecordFromRequest($request);

            return ['order_config' => new $this->resource($record)];
        } catch (\Exception $e) {
            return response()->error($e->getMessage());
        } catch (\Illuminate\Database\QueryException $e) {
            return response()->error($e->getMessage());
        } catch (FleetbaseRequestValidationException $e) {
            return response()->error($e->getErrors());
        }
    }

    /**
     * Delete's an order config.
     *
     * @return \Illuminate\Http\Response
     */
    public function deleteRecord($id, Request $request)
    {
        $orderConfig = OrderConfig::where('uuid', $id)->first();
        if (!$orderConfig) {
            return response()->error('No order config found.');
        }

        // `core_service` order configs cannot be deleted
        if ($orderConfig->core_service) {
            return response()->error('Core service order config\'s cannot be deleted.');
        }

        if ($orderConfig) {
            $orderConfig->delete();

            $this->resource::wrap($this->resourceSingularlName);

            return new $this->resource($orderConfig);
        }
    }
}
