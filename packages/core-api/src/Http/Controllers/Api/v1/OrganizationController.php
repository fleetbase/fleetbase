<?php

namespace Fleetbase\Http\Controllers\Api\v1;

use Fleetbase\Http\Controllers\Controller;
use Fleetbase\Http\Resources\Organization;
use Fleetbase\Models\ApiCredential;
use Fleetbase\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

class OrganizationController extends Controller
{
    public function getCurrent(Request $request)
    {
        $token       = $request->bearerToken();
        $isSecretKey = Str::startsWith($token, '$');
        $companyId   = null;

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
        if ($apiCredential) {
            $companyId = $apiCredential->company_uuid;
        }

        // If no api credential found then try for personal access token then get company from the tokenable
        if (!$apiCredential) {
            $apiCredential = PersonalAccessToken::findToken($token);

            if ($apiCredential->tokenable) {
                $companyId = $apiCredential->tokenable->company_uuid;
            }
        }

        // Handle no api credential found
        if (!$apiCredential) {
            return response()->error('No API key found to fetch company details with.');
        }

        // Get the organization owning the API key
        $organization = Company::where('uuid', $companyId)->first();

        return new Organization($organization);
    }
}
