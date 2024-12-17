<?php

namespace App\Http\Controllers\Api\v1;

use Fleetbase\FleetOps\Http\Controllers\Api\v1\OrderController as BaseOrderController;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class CustomOrderController extends BaseOrderController
{
   
    /**
     * Example of overriding an existing method
     * Make sure to match the parent method signature
     */
    public function query(Request $request)
    {
        // Your custom implementation here
        // Or call parent method with modifications:
        return "welcome";
    }

    /**
     * Example of adding a new method
     */
    public function customEndpoint()
    {
        // Your custom implementation here
    }
}