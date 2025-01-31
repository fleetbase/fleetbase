<?php

namespace Fleetbase\Observers;

use Fleetbase\Models\ApiCredential;

class ApiCredentialObserver
{
    /**
     * Handle the ApiCredential "created" event.
     *
     * @return void
     */
    public function created(ApiCredential $apiCredential)
    {
        // generate the api credentials
        $seed        = array_map('intval', str_split(strtotime($apiCredential->created_at) . $apiCredential->id));
        $credentials = ApiCredential::generateKeys($seed, $apiCredential->test_mode);

        // set the credentials
        $apiCredential->key    = data_get($credentials, 'key');
        $apiCredential->secret = data_get($credentials, 'secret');

        // save credentials
        $apiCredential->save();
    }
}
