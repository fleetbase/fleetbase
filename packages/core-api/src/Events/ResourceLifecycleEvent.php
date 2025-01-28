<?php

namespace Fleetbase\Events;

use Fleetbase\Models\Model;
use Fleetbase\Support\Resolve;
use Fleetbase\Support\Utils;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Database\Eloquent\Model as EloquentModel;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class ResourceLifecycleEvent implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public $modelUuid;
    public $modelClassNamespace;
    public $modelClassName;
    public $modelHumanName;
    public $modelRecordName;
    public $modelName;
    public $namespace;
    public $version;
    public $userSession;
    public $companySession;
    public $eventId;
    public $apiVersion;
    public $requestMethod;
    public $apiCredential;
    public $apiSecret;
    public $apiKey;
    public $apiEnvironment;
    public $isSandbox;

    /**
     * The lifecycle event name.
     *
     * @var string
     */
    public $eventName;

    /**
     * The datetime instance the broadcast ws triggered.
     *
     * @var string
     */
    public $sentAt;

    /**
     * The data sent for this event.
     */
    public array $data = [];

    /**
     * Create a new lifecycle event instance.
     *
     * @param string $eventName
     * @param int    $version
     *
     * @return void
     */
    public function __construct(Model $model, $eventName = null, $version = 1)
    {
        $this->modelUuid           = $model->uuid;
        $this->modelClassNamespace = get_class($model);
        $this->modelClassName      = Utils::classBasename($model);
        $this->modelHumanName      = Str::humanize($this->modelClassName, false);
        $this->modelRecordName     = Utils::or($model, ['name', 'email', 'public_id']);
        $this->modelName           = Str::snake($this->modelClassName);
        $this->namespace           = $this->getNamespaceFromModel($model);
        $this->userSession         = session('user');
        $this->companySession      = session('company');
        $this->eventName           = $eventName ?? $this->eventName;
        $this->sentAt              = Carbon::now()->toDateTimeString();
        $this->version             = $version;
        $this->requestMethod       = request()->method();
        $this->eventId             = uniqid('event_');
        $this->apiVersion          = config('api.version');
        $this->apiCredential       = session('api_credential', 'console');
        $this->apiSecret           = session('api_secret', 'internal');
        $this->apiKey              = session('api_key');
        $this->apiEnvironment      = session('api_environment', 'live');
        $this->isSandbox           = session('is_sandbox', false);
        $this->data                = $this->getEventData();
    }

    /**
     * The event's broadcast name.
     *
     * @return string
     */
    public function broadcastAs()
    {
        return $this->modelName . '.' . $this->eventName;
    }

    /**
     * Get the data to broadcast.
     *
     * @return array
     */
    public function broadcastWith()
    {
        return $this->getEventData();
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return Channel|array
     */
    public function broadcastOn()
    {
        $model              = $this->getModelRecord();
        $channels           = $this->initializeChannels($model);
        $this->addModelSpecificChannels($model, $channels);
        $this->addCompanySpecificChannels($model, $channels);
        $this->addApiCredentialChannel($model, $channels);
        $this->addRelationshipSpecificChannels($model, $channels);
        $this->addChatChannels($model, $channels);

        return $channels;
    }

    /**
     * Initializes channels based on the company session.
     *
     * @param object $model the model related to the event
     *
     * @return array initialized channels array
     */
    protected function initializeChannels($model)
    {
        $companySession = session('company', $model->company_uuid);

        return [new Channel('company.' . $companySession)];
    }

    /**
     * Adds channels specific to the model properties such as uuid and public_id.
     *
     * @param object $model    the model related to the event
     * @param array  $channels reference to the channels array
     */
    protected function addModelSpecificChannels($model, &$channels)
    {
        if (isset($model->public_id)) {
            $channels[] = new Channel($this->modelName . '.' . $model->public_id);
        }
        if (isset($model->uuid)) {
            $channels[] = new Channel($this->modelName . '.' . $model->uuid);
        }
    }

    /**
     * Adds channels specific to the company associated with the model.
     *
     * @param object $model    the model related to the event
     * @param array  $channels reference to the channels array
     */
    protected function addCompanySpecificChannels($model, &$channels)
    {
        if ($model && isset($model->company)) {
            $channels[] = new Channel('company.' . $model->company->public_id);
        }
    }

    /**
     * Adds a channel for API credentials if available in session.
     *
     * @param Model $model    the model related to the event
     * @param array $channels reference to the channels array
     */
    protected function addApiCredentialChannel($model, &$channels)
    {
        if (session()->has('api_credential')) {
            $channels[] = new Channel('api.' . session()->get('api_credential'));
        }
    }

    /**
     * Adds channels related to relationships defined in the model such as driver, customer, facilitator, and vendor.
     *
     * @param object $model    the model related to the event
     * @param array  $channels reference to the channels array
     */
    protected function addRelationshipSpecificChannels($model, &$channels)
    {
        $relationships = ['driverAssigned', 'customer', 'facilitator', 'vendor'];
        foreach ($relationships as $relationship) {
            if ($model && isset($model->{Str::snake($relationship) . '_uuid'})) {
                $channels[] = new Channel($relationship . '.' . $model->{$relationship . '_uuid'});
            }
            if ($model && isset($model->{$relationship})) {
                $channels[] = new Channel($relationship . '.' . $model->{$relationship}->public_id);
            }
        }

        if ($model && data_get($model, 'meta.storefront_id')) {
            $channels[] = new Channel('storefront.' . data_get($model, 'meta.storefront_id'));
        }
    }

    /**
     * Adds chat channel identifiers to the broadcast channels array based on the model's UUID and public ID.
     * This method checks if the provided public ID and UUID are valid using utility functions, then adds
     * them as new Channel instances to the channels array if they are valid.
     *
     * @param mixed $model     the model instance that may contain chat channel identifiers
     * @param array &$channels Reference to the array of channels that will be modified to include new chat channels
     */
    protected function addChatChannels($model, &$channels)
    {
        $publicId = $this->getChatChannelPublicId($model);
        $uuid     = $this->getChatChannelUuid($model);

        if ($this->modelName === 'chat_channel') {
            $userSession = session('user', $model->created_by_uuid);
            $channels[]  = new Channel('user.' . $userSession);
        }

        if ($this->modelName === 'chat_participant') {
            $userSession = session('user', $model->user_uuid);
            $channels[]  = new Channel('user.' . $userSession);
        }

        if ($publicId && Utils::isPublicId($publicId)) {
            $channels[] = new Channel('chat.' . $publicId);
        }
        if ($uuid && Str::isUuid($uuid)) {
            $channels[] = new Channel('chat.' . $uuid);
        }
    }

    /**
     * Retrieves the public ID for a chat channel from a model based on the model type.
     * If the model is a 'chat_channel', it returns the public_id directly from the model.
     * Otherwise, it tries to fetch the public_id from associated chatChannel or chatMessage relations.
     *
     * @param mixed $model the model instance from which to extract the chat channel public ID
     *
     * @return string|null the chat channel's public ID, or null if it cannot be determined
     */
    protected function getChatChannelPublicId($model)
    {
        if ($this->modelName === 'chat_channel') {
            return $model->public_id;
        }

        return data_get($model, 'chatChannel.public_id') ?: data_get($model, 'chatMessage.chatChannel.public_id');
    }

    /**
     * Retrieves the UUID for a chat channel from a model based on the model type.
     * If the model is a 'chat_channel', it returns the uuid directly from the model.
     * Otherwise, it tries to fetch the uuid from the chat_channel_uuid field or from a nested chatMessage relation.
     *
     * @param mixed $model the model instance from which to extract the chat channel UUID
     *
     * @return string|null the chat channel's UUID, or null if it cannot be determined
     */
    protected function getChatChannelUuid($model)
    {
        if ($this->modelName === 'chat_channel') {
            return $model->uuid;
        }

        return data_get($model, 'chat_channel_uuid') ?: data_get($model, 'chatMessage.chat_channel_uuid');
    }

    /**
     * Extracts the namespace from a model's class name. This function splits the full class name
     * of the model and retrieves the first segment, which is typically the namespace.
     * Useful for dynamically determining the namespace for operations that depend on knowing the model's namespace.
     *
     * @param Model $model the Eloquent model instance from which to extract the namespace
     *
     * @return string the namespace of the model
     */
    public function getNamespaceFromModel(Model $model): string
    {
        $namespaceSegments = explode('\Models\\', get_class($model));
        $modelNamespace    = '\\' . Arr::first($namespaceSegments);

        return $modelNamespace;
    }

    /**
     * Constructs the data structure for an event based on the model associated with this event.
     * This method fetches the model instance, retrieves the appropriate HTTP resource, and formats the model data.
     * It checks if specific methods exist on the resource to format the data for a webhook payload or simply converts it to an array.
     * Additionally, it decides whether to keep relational data based on predefined criteria.
     *
     * @return array An array representing the structured data for the event, including identifiers and formatted model data.
     *               This array includes fields like 'id' for the event ID, 'api_version', 'event' for the event type,
     *               'created_at' for the timestamp, and 'data' containing the transformed model information.
     */
    public function getEventData()
    {
        $model               = $this->getModelRecord();
        $resource            = $this->getModelResource($model, $this->namespace, $this->version);
        $resourceData        = [];
        $keepRelations       = ['chat_message'];
        $shouldKeepRelations = in_array($this->modelName, $keepRelations);

        if ($resource) {
            if (method_exists($resource, 'toWebhookPayload')) {
                $resourceData = $resource->toWebhookPayload();
            } elseif (method_exists($resource, 'toArray')) {
                $resourceData = $resource->toArray(request());
            }
        }

        if (!$shouldKeepRelations) {
            $resourceData = static::transformResourceChildrenToId($resourceData);
        }

        $data = [
            'id'          => $this->eventId,
            'api_version' => $this->apiVersion,
            'event'       => $this->broadcastAs(),
            'created_at'  => $this->sentAt,
            'data'        => $resourceData,
        ];

        return $data;
    }

    /**
     * Retrieves a model record from the database based on the model's UUID.
     * This method dynamically creates an instance of the model using its namespace and performs a query to fetch the first record without any global scopes applied.
     *
     * @return Model|null returns the model instance if found, otherwise null
     *
     * @throws \Exception if the model class specified by $namespace does not exist or cannot be instantiated
     */
    public function getModelRecord(): EloquentModel
    {
        $namespace = $this->modelClassNamespace;

        return (new $namespace())->where('uuid', $this->modelUuid)->withoutGlobalScopes()->first();
    }

    /**
     * Resolves and retrieves the HTTP resource associated with a given model.
     * This function delegates to the Resolve::httpResourceForModel method to determine the appropriate HTTP resource class and instantiates it for the provided model.
     *
     * @param Model       $model     the model instance for which the HTTP resource is resolved
     * @param string|null $namespace Optional. The namespace to search within for the resource class. Defaults to null, which will use predefined namespace logic.
     * @param int|null    $version   Optional. The API version number to use when resolving the resource class. Defaults to null, implying default version handling.
     *
     * @return JsonResource returns an instantiated JSON resource object that wraps the model
     */
    public function getModelResource($model, ?string $namespace = null, ?int $version = null): JsonResource
    {
        return Resolve::httpResourceForModel($model, $namespace, $version);
    }

    /**
     * Transforms elements within an array that are instances of JsonResource or Carbon into simpler representations.
     * JsonResource instances are transformed based on their resource properties to a simplified identifier (e.g., public_id, internal_id, uuid).
     * Carbon instances are converted to their DateTime string representation.
     *
     * @param array $data the array containing elements that might be instances of JsonResource or Carbon
     *
     * @return array the transformed array with complex objects simplified
     */
    public static function transformResourceChildrenToId(array $data = []): array
    {
        foreach ($data as $key => $value) {
            if ($value instanceof JsonResource) {
                if (!$value->resource) {
                    $data[$key] = null;
                    continue;
                }

                $id         = Utils::or($value->resource, ['public_id', 'internal_id', 'uuid']);
                $data[$key] = $id;
            }

            if ($value instanceof Carbon) {
                $data[$key] = $value->toDateTimeString();
            }
        }

        return $data;
    }
}
