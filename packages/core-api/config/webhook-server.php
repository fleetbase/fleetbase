<?php

return [
    /*
     *  The default queue that should be used to send webhook requests.
     */
    'queue' => env('WEBHOOK_SERVER_QUEUE'),

    /*
     * The default http verb to use.
     */
    'http_verb' => 'post',

    /*
     * This class is responsible for calculating the signature that will be added to
     * the headers of the webhook request. A webhook client can use the signature
     * to verify the request hasn't been tampered with.
     */
    'signer' => \Fleetbase\Webhook\Signer\DefaultSigner::class,

    /*
     * This is the name of the header where the signature will be added.
     */
    'signature_header_name' => 'Signature',

    /*
     * These are the headers that will be added to all webhook requests.
     */
    'headers' => [
        'Content-Type' => 'application/json',
    ],

    /*
     * If a call to a webhook takes longer that this amount of seconds
     * the attempt will be considered failed.
     */
    'timeout_in_seconds' => 5,

    /*
     * The amount of times the webhook should be called before we give up.
     */
    'tries' => 3,

    /*
     * This class determines how many seconds there should be between attempts.
     */
    'backoff_strategy' => \Fleetbase\Webhook\BackoffStrategy\ExponentialBackoffStrategy::class,

    /*
     * This class is used to dispatch webhooks on to the queue.
     */
    'webhook_job' => \Fleetbase\Webhook\CallWebhookJob::class,

    /*
     * By default we will verify that the ssl certificate of the destination
     * of the webhook is valid.
     */
    'verify_ssl' => false,

    /*
     * When set to true, an exception will be thrown when the last attempt fails
     */
    'throw_exception_on_failure' => false,

    /*
     * When using Laravel Horizon you can specify tags that should be used on the
     * underlying job that performs the webhook request.
     */
    'tags' => [],
];
