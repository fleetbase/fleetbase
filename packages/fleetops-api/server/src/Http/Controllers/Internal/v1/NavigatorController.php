<?php

namespace Fleetbase\FleetOps\Http\Controllers\Internal\v1;

use Fleetbase\Http\Controllers\Controller;
use Fleetbase\Http\Resources\Organization;
use Fleetbase\Models\ApiCredential;
use Fleetbase\Models\Company;
use Fleetbase\Models\Setting;
use Fleetbase\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class NavigatorController extends Controller
{
    public function linkApp()
    {
        $adminUser = User::where('type', 'admin')->first();

        if ($adminUser->company) {
            $apiCredential = ApiCredential::firstOrCreate(
                [
                    'user_uuid'    => $adminUser->uuid,
                    'company_uuid' => $adminUser->company_uuid,
                    'name'         => 'NavigationAppLinker',
                ],
                [
                    'user_uuid'    => $adminUser->uuid,
                    'company_uuid' => $adminUser->company->uuid,
                    'name'         => 'NavigationAppLinker',
                ]
            );

            return redirect()->away('flbnavigator://configure?key=' . $apiCredential->key . '&host=' . url()->secure('/') . '&socketcluster_host=' . env('SOCKETCLUSTER_HOST', 'socket') . '&socketcluster_port=' . env('SOCKETCLUSTER_PORT', 8000));
        }

        return response()->error('Organization for linking not found.');
    }

    public function getLinkAppUrl()
    {
        return response()->json([
            'linkUrl' => url('int/v1/fleet-ops/navigator/link-app'),
        ]);
    }

    public function getCurrentOrganization(Request $request)
    {
        $token       = $request->bearerToken();
        $isSecretKey = Str::startsWith($token, '$');

        // Depending on API key format set the connection to find credential on
        $connection = Str::startsWith($token, 'flb_test_') ? 'sandbox' : 'mysql';

        // Find the API Credential record
        $findApKey = ApiCredential::on($connection)
            ->where(function ($query) use ($isSecretKey, $token) {
                if ($isSecretKey) {
                    $query->where('secret', $token);
                } else {
                    $query->where('key', $token);
                }
            })
            ->with(['company.owner'])
            ->withoutGlobalScopes();

        // Get the api credential model record
        $apiCredential = $findApKey->first();

        // Handle no api credential found
        if (!$apiCredential) {
            return response()->error('No API key found to fetch company details with.');
        }

        // Get the organization owning the API key
        $organization = Company::where('uuid', $apiCredential->company_uuid)->first();

        return new Organization($organization);
    }

    public function getDriverOnboardSettings()
    {
        $onBoardSettings  = Setting::where('key', 'fleet-ops.driver-onboard')->value('value');

        return response()->json($onBoardSettings);
    }
}
