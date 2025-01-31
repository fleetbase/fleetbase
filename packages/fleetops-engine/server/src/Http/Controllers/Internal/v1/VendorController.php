<?php

namespace Fleetbase\FleetOps\Http\Controllers\Internal\v1;

use Fleetbase\FleetOps\Exports\VendorExport;
use Fleetbase\FleetOps\Http\Controllers\FleetOpsController;
use Fleetbase\FleetOps\Imports\VendorImport;
use Fleetbase\FleetOps\Models\Driver;
use Fleetbase\FleetOps\Models\Vendor;
use Fleetbase\Http\Requests\ExportRequest;
use Fleetbase\Http\Requests\ImportRequest;
use Fleetbase\Http\Requests\Internal\BulkDeleteRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;

class VendorController extends FleetOpsController
{
    /**
     * The resource to query.
     *
     * @var string
     */
    public $resource = 'vendor';

    /**
     * Returns the vendor as a `facilitator-vendor`.
     *
     * @var string id
     */
    public function getAsFacilitator($id)
    {
        $vendor = Vendor::where('uuid', $id)->withTrashed()->first();

        if (!$vendor) {
            return response()->error('Facilitator not found.');
        }

        return response()->json([
            'facilitatorVendor' => $vendor,
        ]);
    }

    /**
     * Returns the vendor as a `customer-vendor`.
     *
     * @var string id
     */
    public function getAsCustomer($id)
    {
        $vendor = Vendor::where('uuid', $id)->withTrashed()->first();

        if (!$vendor) {
            return response()->error('Customer not found.');
        }

        return response()->json([
            'customerVendor' => $vendor,
        ]);
    }

    /**
     * Export the vendors to excel or csv.
     *
     * @return \Illuminate\Http\Response
     */
    public static function export(ExportRequest $request)
    {
        $format       = $request->input('format', 'xlsx');
        $selections   = $request->array('selections');
        $fileName     = trim(Str::slug('vendors-' . date('Y-m-d-H:i')) . '.' . $format);

        return Excel::download(new VendorExport($selections), $fileName);
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

        /** @var \Fleetbase\Models\Vendor */
        $count   = Vendor::whereIn('uuid', $ids)->count();
        $deleted = Vendor::whereIn('uuid', $ids)->delete();

        if (!$deleted) {
            return response()->error('Failed to bulk delete vendors.');
        }

        return response()->json(
            [
                'status'  => 'OK',
                'message' => 'Deleted ' . $count . ' vendors',
            ],
            200
        );
    }

    /**
     * Get all status options for an vehicle.
     *
     * @return \Illuminate\Http\Response
     */
    public function statuses()
    {
        $statuses = DB::table('vendors')
            ->select('status')
            ->where('company_uuid', session('company'))
            ->distinct()
            ->get()
            ->pluck('status')
            ->filter()
            ->values();

        return response()->json($statuses);
    }

    /**
     * Process import files (excel,csv) into Fleetbase order data.
     *
     * @return \Illuminate\Http\Response
     */
    public function import(ImportRequest $request)
    {
        $disk           = $request->input('disk', config('filesystems.default'));
        $files          = $request->resolveFilesFromIds();

        foreach ($files as $file) {
            try {
                Excel::import(new VendorImport(), $file->path, $disk);
            } catch (\Throwable $e) {
                return response()->error('Invalid file, unable to proccess.');
            }
        }

        return response()->json(['status' => 'ok', 'message' => 'Import completed']);
    }

    /**
     * Assign a driver to this vendor.
     *
     * @return \Illuminate\Http\Response
     */
    public function assignDriver(string $id, Request $request)
    {
        // Validate only param
        if (!$request->isUuid('driver')) {
            return response()->error('No driver selected to assign to vendor.');
        }

        // Find driver
        $driver = Driver::where('uuid', $request->input('driver'))->first();
        if (!$driver) {
            return response()->error('Selected driver cannot be found.');
        }

        // Validate vendor
        $vendor = Vendor::where('uuid', $id)->first();
        if (!$vendor) {
            return response()->error('Vendor attempting to assign driver to is invalid.');
        }

        // Assign driver to vendor
        $driver->update(['vendor_uuid' => $vendor->uuid]);

        return response()->json([
            'status' => 'ok',
        ]);
    }

    /**
     * Remove a driver from this vendor.
     *
     * @return \Illuminate\Http\Response
     */
    public function removeDriver(string $id, Request $request)
    {
        // Validate only param
        if (!$request->isUuid('driver')) {
            return response()->error('No driver selected to remove from vendor.');
        }

        // Find driver
        $driver = Driver::where('uuid', $request->input('driver'))->first();
        if (!$driver) {
            return response()->error('Selected driver cannot be found.');
        }

        // Validate vendor
        $vendor = Vendor::where('uuid', $id)->first();
        if (!$vendor) {
            return response()->error('Vendor attempting to remove driver from is invalid.');
        }

        // Remove driver from vendor
        $driver->update(['vendor_uuid' => null]);

        return response()->json([
            'status' => 'ok',
        ]);
    }
}
