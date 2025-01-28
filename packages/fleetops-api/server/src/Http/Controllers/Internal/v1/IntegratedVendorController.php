<?php

namespace Fleetbase\FleetOps\Http\Controllers\Internal\v1;

use Fleetbase\FleetOps\Http\Controllers\FleetOpsController;
use Fleetbase\FleetOps\Models\IntegratedVendor;
use Fleetbase\FleetOps\Support\IntegratedVendors;
use Fleetbase\Http\Requests\Internal\BulkDeleteRequest;
use Illuminate\Http\Request;

class IntegratedVendorController extends FleetOpsController
{
    /**
     * The resource to query.
     *
     * @var string
     */
    public $resource = 'integrated_vendor';

    /**
     * Get available integrated vendors.
     *
     * @return \Illuminate\Http\Response
     */
    public function getSupported(Request $request)
    {
        $supported = IntegratedVendors::all()->map(function ($vendor) {
            return $vendor->toArray();
        });

        return response()->json($supported);
    }

    /**
     * Bulk delete resources.
     *
     * @return \Illuminate\Http\Response
     */
    public function bulkDelete(BulkDeleteRequest $request)
    {
        $ids = $request->input('ids', []);

        if (!$ids) {
            return response()->error('Nothing to delete.');
        }

        /** @var \Fleetbase\Models\IntegratedVendor */
        $count   = IntegratedVendor::whereIn('uuid', $ids)->count();
        $deleted = IntegratedVendor::whereIn('uuid', $ids)->delete();

        if (!$deleted) {
            return response()->error('Failed to bulk delete vendors.');
        }

        return response()->json(
            [
                'status'  => 'OK',
                'message' => 'Deleted ' . $count . ' integrated vendors',
            ],
            200
        );
    }
}
