<?php

namespace Fleetbase\Listeners;

use Fleetbase\Events\ResourceLifecycleEvent;
use Fleetbase\Models\ApiCredential;
use Fleetbase\Models\ApiEvent;
use Fleetbase\Models\User;
use Fleetbase\Models\WebhookEndpoint;
use Fleetbase\Models\WebhookRequestLog;
use Fleetbase\Support\Utils;
use Fleetbase\Webhook\WebhookCall;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\QueryException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

class SendResourceLifecycleWebhook implements ShouldQueue
{
    /**
     * Handle the event.
     *
     * @param ResourceLifecycleEvent $event
     *
     * @return void
     */
    public function handle($event)
    {
        $this->setSessionFromEvent($event);

        // get session variables or fallback to event value
        $companyId       = session()->get('company', $event->companySession);
        $apiCredentialId = session()->get('api_credential', $event->apiCredential);
        $apiKey          = session()->get('api_key', $event->apiKey ?? 'console');
        $apiSecret       = session()->get('api_secret', $event->apiSecret ?? 'internal');
        $apiEnvironment  = session()->get('api_environment', $event->apiEnvironment ?? 'live');
        $isSandbox       = session()->get('is_sandbox', $event->isSandbox);

        // Prepare event
        $eventData = [
            'company_uuid'        => $companyId,
            'event'               => $event->broadcastAs(),
            'source'              => $apiCredentialId ? 'api' : 'console',
            'data'                => $event->getEventData(),
            'method'              => $event->requestMethod,
            'description'         => $this->getHumanReadableEventDescription($event),
        ];

        // Get api credential from session
        $apiCredential = session('api_credential');

        // Validate api credential, if not uuid then it could be internal
        if ($apiCredential && Str::isUuid($apiCredential) && ApiCredential::where('uuid', session('api_credential'))->exists()) {
            $eventData['api_credential_uuid'] = $apiCredential;
        }

        // Check if it was a personal access token which made the request
        if ($apiCredential && is_numeric($apiCredential) && PersonalAccessToken::where('id', $apiCredential)->exists()) {
            $eventData['access_token_id'] = (int) $apiCredential;
        }

        try {
            // log the api event
            $apiEvent = ApiEvent::create($eventData);
        } catch (\Exception|QueryException $e) {
            Log::error($e->getMessage());

            return;
        }

        // get all webhooks for current company
        $webhooks = WebhookEndpoint::where([
            'company_uuid' => $companyId,
            'status'       => 'enabled',
            'mode'         => $apiEnvironment,
        ])->get();

        // Send Webhook for event
        foreach ($webhooks as $webhook) {
            // Only Send Webhook if webhook requires this event
            if ($webhook->cannotFireEvent($apiEvent->event)) {
                continue;
            }

            $durationStart = now();
            $connection    = $isSandbox ? 'sandbox' : 'mysql';

            try {
                // Send Webhook for the event
                WebhookCall::create()
                    ->meta([
                        'is_sandbox'          => $isSandbox,
                        'api_key'             => $apiKey,
                        'api_credential_uuid' => data_get($apiEvent, 'api_credential_uuid'),
                        'access_token_id'     => data_get($apiEvent, 'access_token_id'),
                        'company_uuid'        => $webhook->company_uuid,
                        'api_event_uuid'      => $apiEvent->uuid,
                        'webhook_uuid'        => $webhook->uuid,
                        'sent_at'             => Carbon::now(),
                    ])
                    ->url($webhook->url)
                    ->payload($event->data)
                    ->useSecret($apiSecret)
                    ->dispatch();
            } catch (\Exception|\Aws\Sqs\Exception\SqsException $exception) {
                // get webhook attempt request/response interfaces
                $response = $exception->getResponse();
                $request  = $exception->getRequest();

                // Log error
                Log::error($exception->getMessage());

                // Prepare log data
                $webhookRequestLogData = [
                    'company_uuid'        => $webhook->company_uuid,
                    'webhook_uuid'        => $webhook->uuid,
                    'api_event_uuid'      => $apiEvent->uuid,
                    'method'              => $request->getMethod(),
                    'status_code'         => $exception->getStatusCode(),
                    'reason_phrase'       => $response->getReasonPhrase(),
                    'duration'            => $durationStart->diffInSeconds(now()),
                    'url'                 => $request->getUri(),
                    'attempt'             => 1,
                    'response'            => $response->getBody(),
                    'status'              => 'failed',
                    'headers'             => $request->getHeaders(),
                    'meta'                => [
                        'exception'         => get_class($exception),
                        'exception_message' => $exception->getMessage(),
                    ],
                    'sent_at' => $durationStart,
                ];

                // Validate api credential, if not uuid then it could be internal
                if (isset($eventData['api_credential_uuid'])) {
                    $webhookRequestLogData['api_credential_uuid'] = $eventData['api_credential_uuid'];
                }

                // Check if it was a personal access token which made the request
                if (isset($eventData['access_token_id'])) {
                    $webhookRequestLogData['access_token_id'] = $eventData['access_token_id'];
                }

                // log webhook error in logs
                WebhookRequestLog::on($connection)->create($webhookRequestLogData);
            }
        }
    }

    public function setSessionFromEvent($event)
    {
        // set session variables if not set
        if (!session()->has('api_credential')) {
            session()->put('api_credential', $event->apiCredential);
        }

        if (!session()->has('api_key')) {
            session()->put('api_key', $event->apiKey);
        }

        if (!session()->has('api_secret')) {
            session()->put('api_secret', $event->apiSecret);
        }

        if (!session()->has('api_environment')) {
            session()->put('api_environment', $event->apiEnvironment);
        }

        if (!session()->has('is_sandbox')) {
            session()->put('is_sandbox', $event->isSandbox);
        }

        if (!session()->has('company')) {
            session()->put('company', $event->companySession);
        }

        if (!session()->has('user')) {
            session()->put('user', $event->userSession);
        }
    }

    /**
     * Generate a description for the lifecycle event.
     *
     * @return string
     */
    public function getHumanReadableEventDescription(ResourceLifecycleEvent $event)
    {
        // get the model class name
        $modelType = $event->modelHumanName;
        $eventName = strtolower(Utils::humanize($event->eventName));

        // for driver assign
        if ($event->eventName === 'driver_assigned') {
            $eventName = 'assigned a driver';
        }

        // initialize description
        $description = $eventName === 'created' ? 'A new ' : '';
        $description = $eventName === 'updated' ? 'A ' : $description;

        // if model has  name use it instead of `A ...`
        if (isset($event->modelRecordName)) {
            $modelName = $event->modelRecordName;
            // set the description x is a / was
            $description = $eventName === 'created' ? $modelName . ' is a new ' . $modelType : '';
            $description = $eventName !== 'created' ? 'A ' . $modelType . ' (' . $modelName . ') was ' . $eventName : $description;
        } else {
            // set the resouce type in the description
            $description .= $modelType . ' ';
            $description .= 'was ' . $eventName;
        }

        if ($event->apiEnvironment && $event->apiKey) {
            $description .= ' via API';
        } elseif ($event->userSession) {
            // if event is triggered by a user in the console
            // get current user
            $user = User::find($event->userSession);

            if ($user) {
                $description .= ' by ' . $user->name;
            }
        }

        // return description
        return $description;
    }
}
