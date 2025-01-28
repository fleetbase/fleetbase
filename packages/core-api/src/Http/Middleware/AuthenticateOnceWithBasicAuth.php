<?php

namespace Fleetbase\Http\Middleware;

use Fleetbase\Models\ApiCredential;
use Fleetbase\Support\Auth;
use Fleetbase\Support\Utils;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

class AuthenticateOnceWithBasicAuth
{
    /**
     * Handle an incoming request.
     *
     * @param Request $request
     */
    public function handle($request, \Closure $next)
    {
        $authenticationResponse = $this->authenticatedWithBasic($request);
        
        if ($authenticationResponse === true) {
            return $next($request);
        }

        if ($authenticationResponse instanceof \Illuminate\Http\Response) {
            return $authenticationResponse;
        }

        return response()->error('Oops! The API credentials provided were not valid', 401);
    }

    /**
     * Authenticate the request using basic authentication.
     *
     * @param string|null $connection
     */
    public function authenticatedWithBasic(Request $request, $connection = null)
    {
        // get secret key
        $token = $request->bearerToken();
        if (!$token) {
            return response()->error('Oops! No api credentials found with this request', 401);
        }

        // Check if sanctum token
        if ($sanctumToken = $this->getSanctumToken($token)) {
            return $this->authenticateSanctumToken($sanctumToken);
        }

        // Check if secret key
        $isSecretKey = Str::startsWith($token, '$');

        // Depending on API key format set the connection to find credential on
        if (!$connection) {
            $connection = Str::startsWith($token, 'flb_test_') ? 'sandbox' : 'mysql';
        }

        // Find the API Credential record
        $findApKey = ApiCredential::on($connection)
            ->where('key', $token)
            ->with(['company.owner'])
            ->withoutGlobalScopes();

        // Only if User-Agent = "'@fleetbase/sdk;node" allow secret key to authenticate
        if ($request->userAgent() === '@fleetbase/sdk;node') {
            $findApKey = $findApKey->orWhere('secret', $token);
        }

        $apiCredential = $findApKey->first();

        // If secret key and no api credential found check sandbox connection
        if ($isSecretKey && !$apiCredential && $connection === 'mysql') {
            return $this->authenticatedWithBasic($request, 'sandbox');
        }

        // If OPTIONS set api key and continue
        if ($request->isMethod('OPTIONS')) {
            // Set api credential session
            Auth::setApiKey($apiCredential);

            return true;
        }

        // Credentials don't exist
        if (!$apiCredential || Utils::isEmpty($apiCredential, 'company.owner')) {
            return response()->error('Oops! The api credentials provided were not valid', 401);
        }

        // If credentials have expired
        if ($apiCredential->hasExpired()) {
            return response()->error('Oops! These api credentials have expired', 401);
        }

        // Login user
        Auth::setSession($apiCredential);

        // Set sandbox session if applicable
        Auth::setSandboxSession($request, $apiCredential);

        // Set api credential session
        Auth::setApiKey($apiCredential);

        return true;
    }

    /**
     * Authenticate the request using Sanctum token.
     */
    private function authenticateSanctumToken(PersonalAccessToken $sanctumToken)
    {
        if ($sanctumToken && $sanctumToken->tokenable instanceof \Fleetbase\Models\User) {
            // Make sure company is set
            if (!Str::isUuid($sanctumToken->tokenable->company_uuid)) {
                return response()->error('Oops! The api credentials provided were not valid', 401);
            }

            // Set user to session
            Auth::setSession($sanctumToken->tokenable);

            // Get API Credential for User
            $apiCredential = ApiCredential::where('company_uuid', $sanctumToken->tokenable->company_uuid)->first();
            if ($apiCredential) {
                // Set api credential session
                Auth::setApiKey($apiCredential);
            } else {
                Auth::setApiKey($sanctumToken);
            }

            return true;
        }

        return response()->error('Oops! The api credentials provided were not valid', 401);
    }

    /**
     * Get an instance of the PersonalAccessToken if valid.
     */
    private function getSanctumToken(string $token): ?PersonalAccessToken
    {
        $sanctumToken = PersonalAccessToken::findToken($token);
        if ($sanctumToken instanceof PersonalAccessToken) {
            return $sanctumToken;
        }

        return null;
    }
}
