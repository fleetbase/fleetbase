<?php

namespace Fleetbase\FleetOps\Http\Controllers\Api\v1;

use Fleetbase\Http\Controllers\Controller;
use Fleetbase\Models\Company;
use Fleetbase\Models\Setting;

class NavigatorController extends Controller
{
    /**
     * Retrieve the driver onboard settings.
     *
     * This method retrieves the driver onboard settings for the current company session. If no company session
     * is found in the request, an error response is returned. The method retrieves the company ID from the session,
     * then fetches the saved driver onboard settings. If settings for the current company are found, they are returned,
     * otherwise, default settings are provided.
     *
     * @return \Illuminate\Http\JsonResponse
     */

    /**
     * Retrieve driver onboard settings.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getDriverOnboardSettings($companyId)
    {
        $company                = Company::select()->where('public_id', $companyId)->first();
        $driverOnboardSettings  = Setting::where('key', 'fleet-ops.driver-onboard-settings.' . $company->uuid)->value('value');
        if (!$driverOnboardSettings) {
            $driverOnboardSettings = [];
        }

        return response()->json(['driverOnboardSettings' => $driverOnboardSettings]);
    }
}
