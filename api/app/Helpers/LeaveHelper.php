<?php
namespace App\Helpers;

use Fleetbase\FleetOps\Models\Driver;

class LeaveHelper
{
    /**
     * Check if the driver's leave balance is sufficient.
     * Returns a warning message if balance is insufficient, otherwise null.
     */
    public static function checkLeaveBalanceWarning($driverUuid, $totalDays)
    {
        $driver = Driver::where('uuid', $driverUuid)->whereNull('deleted_at')->first();
        if (!$driver) {
            return response()->json([
                'success' => false,
                'errors' => __('messages.no_driver_found'),
                'warning' => true
            ], 400);
        }
        if ($driver && ($driver->leave_balance === 0 || $driver->leave_balance < $totalDays)) {
          
            return response()->json([
                'success' => false,
                'errors' => __('messages.leave_balance_insufficient'),
                'warning' => true
            ], 400);
        }

        return null;
    }
}