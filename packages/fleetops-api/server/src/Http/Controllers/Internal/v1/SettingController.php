<?php

namespace Fleetbase\FleetOps\Http\Controllers\Internal\v1;

use Fleetbase\Http\Controllers\Controller;
use Fleetbase\Models\Setting;
use Fleetbase\Support\Auth;
use Illuminate\Http\Request;

/**
 * Class SettingController.
 */
class SettingController extends Controller
{
    /**
     * Save entity editing settings.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function saveEntityEditingSettings(Request $request)
    {
        $entityEditingSettings  = $request->input('entityEditingSettings', []);

        // Save entity editing settings
        Setting::configure('fleet-ops.entity-editing-settings', $entityEditingSettings);

        return response()->json(['entityEditingSettings' => $entityEditingSettings]);
    }

    /**
     * Retrieve entity editing settings.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getEntityEditingSettings()
    {
        $entityEditingSettings  = Setting::where('key', 'fleet-ops.entity-editing-settings')->value('value');
        if (!$entityEditingSettings) {
            $entityEditingSettings = [];
        }

        return response()->json(['entityEditingSettings' => $entityEditingSettings]);
    }

    /**
     * Retrieve driver onboard settings.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getDriverOnboardSettings($companyId)
    {
        $driverOnboardSettings  = Setting::where('key', 'fleet-ops.driver-onboard-settings.' . $companyId)->value('value');
        if (!$driverOnboardSettings) {
            $driverOnboardSettings = [];
        }

        return response()->json(['driverOnboardSettings' => $driverOnboardSettings]);
    }

    /**
     * Save driver onboard settings.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function savedDriverOnboardSettings(Request $request)
    {
        $driverOnboardSettings = $request->array('driverOnboardSettings', []);

        if ($driverOnboardSettings['enableDriverOnboardFromApp'] == false) {
            $driverOnboardSettings['driverMustProvideOnboardDoucments'] = false;
            $driverOnboardSettings['requiredOnboardDocuments']          = [];
            $driverOnboardSettings['driverOnboardAppMethod']            = '';
            $driverOnboardSettings['enableDriverOnboardFromApp']        = false;
        }

        Setting::configure('fleet-ops.driver-onboard-settings.' . $driverOnboardSettings['companyId'], $driverOnboardSettings);

        return response()->json(['driverOnboardSettings' => $driverOnboardSettings]);
    }

    public function saveCustomerEnabledOrderConfigs(Request $request)
    {
        $enabledOrderConfigs = array_values($request->array('enabledOrderConfigs'));
        Setting::configureCompany('fleet-ops.customer-enabled-order-configs', $enabledOrderConfigs);

        return response()->json($enabledOrderConfigs);
    }

    public function getCustomerEnabledOrderConfigs()
    {
        $enabledOrderConfigs = Setting::lookupFromCompany('fleet-ops.customer-enabled-order-configs', []);

        return response()->json(array_values($enabledOrderConfigs));
    }

    public function saveCustomerPortalPaymentConfig(Request $request)
    {
        $paymentsConfig = $request->array('paymentsConfig');
        Setting::configureCompany('fleet-ops.customer-payments-configs', $paymentsConfig);

        return response()->json($paymentsConfig);
    }

    public function getCustomerPortalPaymentConfig()
    {
        $paymentsConfig = Setting::lookupFromCompany('fleet-ops.customer-payments-configs', ['paymentsEnabled' => false]);

        if (is_array($paymentsConfig)) {
            // check if payments have been onboard
            $company                                    = Auth::getCompany();
            $paymentsConfig['paymentsOnboardCompleted'] = $company && isset($company->stripe_connect_id);
        }

        return response()->json($paymentsConfig);
    }
}
