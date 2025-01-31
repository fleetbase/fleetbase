<?php

namespace Fleetbase\Http\Controllers\Internal\v1;

use Fleetbase\Exports\ApiCredentialExport;
use Fleetbase\Http\Controllers\FleetbaseController;
use Fleetbase\Http\Requests\ExportRequest;
use Fleetbase\Models\ApiCredential;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;

class ApiCredentialController extends FleetbaseController
{
    /**
     * The resource to query.
     *
     * @var string
     */
    public $resource = 'api_credential';

    /**
     * The service which this controller belongs to.
     *
     * @var string
     */
    public $service = 'developers';

    /**
     * Export the companies/users api credentials to excel or csv.
     *
     * @return \Illuminate\Http\Response
     */
    public static function export(ExportRequest $request)
    {
        $format   = $request->input('format', 'xlsx');
        $fileName = trim(Str::slug('api-credentials-' . date('Y-m-d-H:i')) . '.' . $format);

        return Excel::download(new ApiCredentialExport(), $fileName);
    }

    /**
     * Rolls an API key.
     *
     * @return \Illuminate\Http\Response
     */
    public static function roll($id, Request $request)
    {
        // get incoming params
        $password   = $request->input('password');
        $expiration = $request->input('expiration');
        $user       = $request->user();

        // authenticate the users request
        if (!$user || !Auth::validate(['email' => $user->email, 'password' => $password, 'request' => $request])) {
            return response()->error('Authentication required to roll key failed.', 401);
        }

        // get the api key to roll
        $apiCredential = ApiCredential::find($id);

        // if no api key respond with error
        if (!$apiCredential) {
            return response()->error('API credential attempted to roll could not be found.');
        }

        // create api credentials seed
        $seed = array_map('intval', str_split(time() . $apiCredential->id));

        // regenerate api key
        $newCredentials = ApiCredential::generateKeys($seed, $apiCredential->test_mode);

        // store the previous key
        $previousApiKey = $apiCredential->key;

        // update credentials
        $apiCredential->key    = data_get($newCredentials, 'key');
        $apiCredential->secret = data_get($newCredentials, 'secret');

        // update expiration if applicable
        if ($expiration) {
            $apiCredential->expires_at = $expiration;
        }

        try {
            $apiCredential->save();
        } catch (\Exception|\Illuminate\Database\QueryException $e) {
            return response()->error('Attempt to roll key failed.');
        }

        // update all resources
        $tables = DB::connection('sandbox')
            ->getDoctrineSchemaManager()
            ->listTableNames();

        // replace all resources created with this key with the new api key
        foreach ($tables as $table) {
            if (in_array($table, ApiCredential::$skipTables) || Str::startsWith($table, 'telescope')) {
                continue;
            }
            DB::connection('sandbox')
                ->table($table)
                ->where('_key', $previousApiKey)
                ->update(['_key' => $apiCredential->key]);
        }

        return response()->json(
            [
                'apiCredential' => $apiCredential,
            ]
        );
    }
}
