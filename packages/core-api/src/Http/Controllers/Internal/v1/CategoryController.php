<?php

namespace Fleetbase\Http\Controllers\Internal\v1;

use Fleetbase\Exceptions\FleetbaseRequestValidationException;
use Fleetbase\Http\Controllers\FleetbaseController;
use Fleetbase\Http\Requests\Internal\CreateCategoryRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CategoryController extends FleetbaseController
{
    /**
     * The resource to query.
     *
     * @var string
     */
    public $resource = 'category';

    /**
     * Creates a record with request payload.
     *
     * @return \Illuminate\Http\Response
     */
    public function createRecord(Request $request)
    {
        // create validation request
        $createCategoryRequest = CreateCategoryRequest::createFrom($request);
        $rules                 = $createCategoryRequest->rules();

        // manually validate request
        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $createCategoryRequest->responseWithErrors($validator);
        }

        try {
            $record = $this->model->createRecordFromRequest($request);

            return ['category' => new $this->resource($record)];
        } catch (\Exception $e) {
            return response()->error($e->getMessage());
        } catch (\Illuminate\Database\QueryException $e) {
            return response()->error($e->getMessage());
        } catch (FleetbaseRequestValidationException $e) {
            return response()->error($e->getErrors());
        }
    }
}
