<?php

namespace Fleetbase\Http\Controllers\Internal\v1;

use Fleetbase\Http\Controllers\FleetbaseController;

class ApiRequestLogController extends FleetbaseController
{
    /**
     * The resource to query.
     *
     * @var string
     */
    public $resource = 'api_request_log';

    /**
     * The service which this controller belongs to.
     *
     * @var string
     */
    public $service = 'developers';
}
