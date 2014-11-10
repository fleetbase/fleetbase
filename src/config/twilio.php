<?php

return array(

    /*
    |--------------------------------------------------------------------------
    | SID
    |--------------------------------------------------------------------------
    |
    | Your Twilio Account SID #
    |
    */

    'sid' => '',

    /*
    |--------------------------------------------------------------------------
    | Access Token
    |--------------------------------------------------------------------------
    |
    | Access token that can be found in your Twilio dashboard
    |
    */

    'token' => '',

    /*
    |--------------------------------------------------------------------------
    | From Number
    |--------------------------------------------------------------------------
    |
    | The Phone number registered with Twilio that your SMS & Calls will come from
    |
    */

    'from' => '',

    /*
    |--------------------------------------------------------------------------
    | Verify Twilios SSL Certificates
    |--------------------------------------------------------------------------
    |
    | Allows the client to bypass verifiying Twilios SSL certificates.
    | It is STRONGLY advised to leave this set to true for production environments.
    |
    */

    'ssl_verify' => true

);
