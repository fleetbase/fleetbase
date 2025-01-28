<?php

return [
    'username' => env('TWILIO_USERNAME'), // optional when using auth token
    'password' => env('TWILIO_PASSWORD'), // optional when using auth token
    'auth_token' => env('TWILIO_TOKEN'), // optional when using username and password
    'account_sid' => env('TWILIO_SID'),

    'from' => env('TWILIO_FROM'), // optional
    'alphanumeric_sender' => env('TWILIO_ALPHA_SENDER'),

    /**
     * See https://www.twilio.com/docs/sms/services.
     */
    'sms_service_sid' => env('TWILIO_SMS_SERVICE_SID'),

    /**
     * Specify a number where all calls/messages should be routed. This can be used in development/staging environments
     * for testing.
     */
    'debug_to' => env('TWILIO_DEBUG_TO'),

    /**
     * If an exception is thrown with one of these error codes, it will be caught & suppressed.
     * To replicate the 2.x behaviour, specify '*' in the array, which will cause all exceptions to be suppressed.
     * Suppressed errors will not be logged or reported, but the `NotificationFailed` event will be emitted.
     *
     * @see https://www.twilio.com/docs/api/errors
     */
    'ignored_error_codes' => [
        21608, // The 'to' phone number provided is not yet verified for this account.
        21211, // Invalid 'To' Phone Number
        21614, // 'To' number is not a valid mobile number
        21408, // Permission to send an SMS has not been enabled for the region indicated by the 'To' number
    ],
];
