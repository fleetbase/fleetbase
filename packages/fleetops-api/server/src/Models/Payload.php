<?php

namespace Fleetbase\FleetOps\Models;

use Fleetbase\Casts\Json;
use Fleetbase\FleetOps\Flow\Activity;
use Fleetbase\FleetOps\Http\Resources\v1\Payload as PayloadResource;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\LaravelMysqlSpatial\Types\Point;
use Fleetbase\Models\Model;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasMetaAttributes;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\TracksApiCredential;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Fleetbase\FleetOps\Models\TrackingStatus;
use Fleetbase\FleetOps\Models\Waypoint;

class Payload extends Model
{
    use HasUuid;
    use HasPublicId;
    use HasApiModelBehavior;
    use TracksApiCredential;
    use HasMetaAttributes;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'payloads';

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'payload';

    /**
     * Delegate a HTTP resource to use for this model.
     *
     * @var string
     */
    protected $httpResource = PayloadResource::class;

    /**
     * These attributes that can be queried.
     *
     * @var array
     */
    protected $searchableColumns = [];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = ['_key', 'company_uuid', 'pickup_uuid', 'dropoff_uuid', 'return_uuid', 'current_waypoint_uuid', 'meta', 'payment_method', 'cod_amount', 'cod_currency', 'cod_payment_method', 'type'];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'meta' => Json::class,
    ];

    /**
     * Relations to load with the model.
     *
     * @var array
     */
    protected $with = ['entities', 'waypoints']; // 'pickup', 'dropoff', 'return',

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = ['pickup_name', 'dropoff_name'];

    /**
     * The attributes excluded from the model's JSON form.
     *
     * @var array
     */
    protected $hidden = [];

    /**
     * Address/name of the dropoff location.
     */
    public function getDropoffNameAttribute()
    {
        $dropoff = $this->getDropoffOrLastWaypoint();

        return $dropoff->address ?? $dropoff->name ?? $dropoff->street1 ?? null;
    }

    /**
     * Address/name of the pickup location.
     */
    public function getPickupNameAttribute()
    {
        $pickup = $this->getPickupOrCurrentWaypoint();

        return $pickup->address ?? $pickup->name ?? $pickup->street1 ?? null;
    }

    /**
     * Entities in the payload.
     */
    public function entities()
    {
        return $this->hasMany(Entity::class);
    }

    /**
     * Waypoint records in the payload.
     */
    public function waypointMarkers()
    {
        return $this->hasMany(Waypoint::class)->whereNull('waypoints.deleted_at')->with(['place']);
    }

    public function getTotalEntitiesAttribute()
    {
        return $this->entities()->count();
    }

    public function getTotalWaypointsAttribute()
    {
        return $this->waypoints()->count();
    }

    /**
     * The order the payload belongs to.
     */
    public function order()
    {
        return $this->hasOne(Order::class)->without(['payload']);
    }

    /**
     * The address the shipment will be delivered to.
     */
    public function dropoff()
    {
        return $this->belongsTo(Place::class, 'dropoff_uuid')->whereNull('deleted_at')->withoutGlobalScopes();
    }

    /**
     * The address the shipment will be delivered from.
     */
    public function pickup()
    {
        return $this->belongsTo(Place::class, 'pickup_uuid')->whereNull('deleted_at')->withoutGlobalScopes();
    }

    /**
     * The address the shipment will be sent to upon failed delivery.
     */
    public function return()
    {
        return $this->belongsTo(Place::class)->withoutGlobalScopes();
    }

    /**
     * The current waypoint of the payload in progress.
     */
    public function currentWaypoint()
    {
        return $this->belongsTo(Place::class, 'current_waypoint_uuid')->withoutGlobalScopes();
    }

    /**
     * Waypoints between start and end.
     *
     * @return \Illuminate\Database\Eloquent\Concerns\HasManyThrough
     */
    public function waypoints()
    {
        return $this->hasManyThrough(Place::class, Waypoint::class, 'payload_uuid', 'uuid', 'uuid', 'place_uuid')->whereNull('waypoints.deleted_at')->withoutGlobalScopes();
    }

    /**
     * Always convert fee and rate to integer before insert.
     */
    public function setCodAmountAttribute($value)
    {
        $this->attributes['cod_amount'] = Utils::numbersOnly($value);
    }

    public function setEntities($entities = [])
    {
        if (empty($entities) || !is_array($entities)) {
            return $this;
        }

        foreach ($entities as $attributes) {
            if (isset($attributes['_import_id'])) {
                $waypoint = $this->waypoints->firstWhere('_import_id', $attributes['_import_id']);

                if ($waypoint) {
                    $attributes['destination_uuid'] = $waypoint->uuid;
                }
            }

            // if a destination or waypoint is explicitly set
            if (empty($attributes['destination_uuid'])) {
                $destinationKey = Utils::or($attributes, ['waypoint', 'destination']);
                $destination    = $this->findDestinationFromKey($destinationKey);
                if ($destination instanceof Place) {
                    $attributes['destination_uuid'] = $destination->uuid;
                }
            }

            // Validate destination actually exists
            if (isset($attributes['destination_uuid']) && Place::where('uuid', $attributes['destination_uuid'])->doesntExist()) {
                $validDestination = $this->_findCorrectDestinationForEntity($attributes);
                if ($validDestination) {
                    $attributes['destination_uuid'] = $validDestination->uuid;
                }
            }

            $entity = new Entity($attributes);
            $this->entities()->save($entity);
        }

        return $this;
    }

    public function insertEntities($entities = [])
    {
        if (empty($entities) || !is_array($entities)) {
            return $this;
        }

        $this->load(['waypoints']);

        foreach ($entities as $attributes) {
            if (isset($attributes['_import_id']) && !isset($attributes['destination_uuid'])) {
                $waypoint = $this->waypoints->firstWhere('_import_id', $attributes['_import_id']);

                if ($waypoint) {
                    $attributes['destination_uuid'] = $waypoint->uuid;
                }
            }

            // if a destination or waypoint is explicitly set
            if (empty($attributes['destination_uuid'])) {
                $destinationKey = Utils::or($attributes, ['waypoint', 'destination']);
                $destination    = $this->findDestinationFromKey($destinationKey);
                if ($destination instanceof Place) {
                    $attributes['destination_uuid'] = $destination->uuid;
                }
            }

            // Validate destination actually exists
            if (isset($attributes['destination_uuid']) && Place::where('uuid', $attributes['destination_uuid'])->doesntExist()) {
                $validDestination = $this->_findCorrectDestinationForEntity($attributes);
                if ($validDestination) {
                    $attributes['destination_uuid'] = $validDestination->uuid;
                }
            }

            Entity::insertGetUuid($attributes, $this);
        }

        $this->load(['entities']);

        return $this;
    }

    public function setCurrentWaypoint(Place $destination, bool $save = true): Payload
    {
        $this->current_waypoint_uuid = $destination->uuid;

        if ($save) {
            DB::table($this->getTable())->where('uuid', $this->uuid)->update(['current_waypoint_uuid' => $destination->uuid]);
        }

        return $this;
    }

    public function setWaypoints($waypoints = [])
    {
        if (!is_array($waypoints)) {
            return $this;
        }

        foreach ($waypoints as $index => $attributes) {
            $waypoint = ['payload_uuid' => $this->payload_uuid];

            if (Utils::isset($attributes, 'place') && is_array(Utils::get($attributes, 'place'))) {
                $attributes = Utils::get($attributes, 'place');
            }

            if (is_array($attributes) && array_key_exists('place_uuid', $attributes) && Place::where('uuid', $attributes['place_uuid'])->exists()) {
                $waypoint = [
                    'place_uuid'   => $attributes['place_uuid'],
                    'payload_uuid' => $attributes['payload_uuid'] ?? null,
                    'order'        => $index,
                ];
            } else {
                $place = Place::createFromMixed($attributes);

                // if has a temporary uuid from search create meta attr for search_uuid
                if ($place instanceof Place && isset($attributes['uuid']) && $place->uuid !== $attributes['uuid']) {
                    $place->updateMeta('search_uuid', $attributes['uuid']);
                }

                $waypoint['place_uuid'] = $place->uuid;
            }

            // Handle customer assosciation for waypoint
            if (is_array($attributes) && Utils::notEmpty($attributes['customer_uuid']) && Utils::notEmpty($attributes['customer_type'])) {
                $customerTypeNamespace = Utils::getMutationType($attributes['customer_type']);
                $customerExists        = app($customerTypeNamespace)->where('uuid', $attributes['customer_uuid'])->exists();
                if ($customerExists) {
                    $waypoint['customer_uuid'] = $attributes['customer_uuid'];
                    $waypoint['customer_type'] = $customerTypeNamespace;
                }
            }

            // set payload
            $waypoint['payload_uuid'] = $this->uuid;
            $waypointRecord           = Waypoint::updateOrCreate($waypoint);

            $this->waypointMarkers->push($waypointRecord);
        }

        return $this;
    }

    public function insertWaypoints($waypoints = [])
    {
        if (!is_array($waypoints)) {
            return $this;
        }

        foreach ($waypoints as $index => $attributes) {
            $waypoint = ['payload_uuid' => $this->uuid, 'order' => $index];

            if (Utils::isset($attributes, 'place') && is_array(Utils::get($attributes, 'place'))) {
                $placeAttributes = Utils::get($attributes, 'place');
                if (is_array($placeAttributes)) {
                    $attributes = array_merge($attributes, $placeAttributes);
                }
            }

            if (is_array($attributes) && array_key_exists('place_uuid', $attributes) && Place::where('uuid', $attributes['place_uuid'])->exists()) {
                $waypoint['place_uuid'] = $attributes['place_uuid'];
            } else {
                $placeUuid = Place::insertFromMixed($attributes);

                // if has a temporary uuid from search create meta attr for search_uuid
                if (Str::isUuid($placeUuid) && isset($attributes['uuid']) && $placeUuid !== $attributes['uuid']) {
                    $place = Place::where('uuid', $placeUuid)->first();

                    // set the original destination uuid in meta
                    if ($place instanceof Place) {
                        $place->updateMeta('_console_destination_uuid', $attributes['uuid']);
                        $place->updateMeta('search_uuid', $attributes['uuid']);
                    }
                }

                $waypoint['place_uuid'] = $placeUuid;
            }

            // Handle customer assosciation for waypoint
            if (is_array($attributes) && Utils::notEmpty($attributes['customer_uuid']) && Utils::notEmpty($attributes['customer_type'])) {
                $customerTypeNamespace = Utils::getMutationType($attributes['customer_type']);
                $customerExists        = app($customerTypeNamespace)->where('uuid', $attributes['customer_uuid'])->exists();
                if ($customerExists) {
                    $waypoint['customer_uuid'] = $attributes['customer_uuid'];
                    $waypoint['customer_type'] = $customerTypeNamespace;
                }
            }

            Waypoint::insertGetUuid($waypoint, $this);
        }

        return $this;
    }

    public function updateWaypoints($waypoints = [])
    {
        if (!is_array($waypoints)) {
            return $this;
        }

        $placeIds = [];

        // collect all place ids to insert
        foreach ($waypoints as $index => $attributes) {
            if (Utils::isset($attributes, 'place') && is_array(Utils::get($attributes, 'place'))) {
                $attributes = Utils::get($attributes, 'place');
            }

            if (is_array($attributes) && array_key_exists('place_uuid', $attributes)) {
                $placeIds[] = $attributes['place_uuid'];
            } else {
                $placeUuid  = Place::insertFromMixed($attributes);
                $placeIds[] = $placeUuid;
            }
        }

        /** @return \Illuminate\Database\Eloquent\Collection $waypointMakers */
        $waypointMakers = $this->waypointMarkers()->get();

        // remove all waypoints that are not included in the placeids
        $waypointMakers = $waypointMakers->filter(function ($waypointMarker) use ($placeIds) {
            if (!in_array($waypointMarker->place_uuid, $placeIds)) {
                $waypointMarker->delete();
            }

            return in_array($waypointMarker->place_uuid, $placeIds);
        });

        // update or create waypoint markers
        foreach ($placeIds as $placeId) {
            Waypoint::updateOrCreate(
                [
                    'payload_uuid' => $this->uuid,
                    'place_uuid'   => $placeId,
                ],
                [
                    'payload_uuid' => $this->uuid,
                    'place_uuid'   => $placeId,
                ]
            );
        }

        return $this->refresh()->load(['waypoints']);
    }

    public function _findCorrectDestinationForEntity($entityAttributes = []): ?Place
    {
        $destinationId = Utils::get($entityAttributes, 'destination_uuid');

        $destination = Place::where('meta->search_uuid', $destinationId)->first();
        if (!$destination) {
            $destination = Place::where('meta->_console_destination_uuid', $destinationId)->first();
        }

        return $destination;
    }

    /**
     * Get the payload pickup point or the first waypoint.
     *
     * @return \Fleetbase\Models\Place|null
     */
    public function getDropoffOrLastWaypoint(): ?Place
    {
        $this->loadMissing(['dropoff', 'waypoints']);

        if ($this->dropoff instanceof Place) {
            return $this->dropoff;
        }

        if ($this->waypoints()->count()) {
            return $this->waypoints->last();
        }

        return null;
    }

    /**
     * Get the payload pickup point or the first waypoint.
     *
     * @return \Fleetbase\Models\Place|null
     */
    public function getPickupOrFirstWaypoint(): ?Place
    {
        $this->loadMissing(['pickup', 'waypoints']);

        if ($this->pickup instanceof Place) {
            return $this->pickup;
        }

        if ($this->waypoints()->count()) {
            return $this->waypoints->first();
        }

        return null;
    }

    /**
     * Get the payload pickup point or the current waypoint.
     *
     * @return \Fleetbase\Models\Place|null
     */
    public function getPickupOrCurrentWaypoint(): ?Place
    {
        $this->loadMissing(['pickup', 'dropoff', 'waypoints']);

        if ($this->pickup instanceof Place) {
            return $this->pickup;
        }

        // special case where starting point is drivers current location
        // this special case can be set in order meta `pickup_is_driver_location`
        // this will start the order at the current location of the driver
        if ($this->hasMeta('pickup_is_driver_location')) {
            // if should use the driver location attempt to use dropoff
            if ($this->dropoff instanceof Place) {
                return $this->dropoff;
            }
        }

        // use the current waypoint
        // if the current waypoint isn't found fallback to first waypoint
        if ($this->waypoints()->count()) {
            $destination = null;

            if (Str::isUuid($this->current_waypoint_uuid)) {
                $destination = $this->waypoints->firstWhere('uuid', $this->current_waypoint_uuid);
            }

            if (!$destination) {
                $destination = $this->waypoints->first();
            }

            return $destination;
        }

        return null;
    }

    public function getPickupRegion(): string
    {
        $pickup = $this->getPickupOrCurrentWaypoint();

        return $pickup->country ?? $pickup->province ?? $pickup->district ?? 'SG';
    }

    public function getCountryCode(): string
    {
        $start = $this->getPickupOrCurrentWaypoint();

        return $start->country;
    }

    public function getAllStops()
    {
        $this->loadMissing(['pickup', 'dropoff', 'waypoints']);
        $stops = collect();

        if ($this->pickup) {
            $stops->push($this->pickup);
        }

        if ($this->dropoff) {
            $stops->push($this->dropoff);
        }

        if ($this->waypoints) {
            foreach ($this->waypoints as $waypoint) {
                $stops->push($waypoint);
            }
        }

        // ensure all stops/waypoints are instances of Place
        $stops = $stops->map(function ($place) {
            if (is_array($place)) {
                return new Place($place);
            }

            if ($place instanceof Place) {
                return $place;
            }

            return null;
        });

        return $stops->filter();
    }

    /**
     * Get the pickup location for the payload.
     *
     * @return Point
     */
    public function getPickupLocation()
    {
        $pickup = $this->getPickupOrCurrentWaypoint();

        return $pickup->location ?? new Point(0, 0);
    }

    public function getOrder()
    {
        if ($this->order) {
            return $this->order;
        }

        $this->load('order');

        return $this->order;
    }

    public function removeWaypoints()
    {
        Waypoint::where('payload_uuid', $this->uuid)->delete();
        $this->setRelation('waypoints', collect());

        return $this;
    }

    public function removePlace($property, array $options = [])
    {
        // remove multiple places
        if (is_array($property)) {
            foreach ($property as $prop) {
                if (is_string($prop)) {
                    $this->removePlace($prop, $options);
                }
            }

            return $this;
        }

        $attr     = $property . '_uuid';
        $save     = data_get($options, 'save', false);
        $callback = data_get($options, 'callback', false);

        $this->setAttribute($attr, null);
        $this->setRelation($property, null);

        if ($save) {
            $this->updateQuietly([$attr => null]);
        }

        if (is_callable($callback)) {
            $callback($this);
        }

        return $this;
    }

    public function setPlace($property, Place $place, array $options = [])
    {
        $attr     = $property . '_uuid';
        $instance = Place::createFromMixed($place);
        $save     = data_get($options, 'save', false);
        $callback = data_get($options, 'callback', false);

        if ($instance) {
            if (Str::isUuid($instance)) {
                $this->setAttribute($attr, $instance);
            } elseif ($instance instanceof Model) {
                $this->setAttribute($attr, $instance->uuid);
            } else {
                $this->setAttribute($attr, $instance);
            }
        }

        // Get the ID property
        $id = $this->{$attr};

        // set relationship to model instance to
        if ($instance instanceof Model) {
            $this->setRelation($property, $instance);
        }

        // If optioned to save
        if ($save) {
            $this->updateQuietly([$attr => $id]);
        }

        if (is_callable($callback)) {
            $callback($instance, $this);
        }

        return $this;
    }

    public function setPickup($place, array $options = [])
    {
        // if using the special [driver] value, set the meta `pickup_is_driver_location`
        if ($place === '[driver]') {
            $this->setMeta('pickup_is_driver_location', true);

            return;
        }

        if (!$place instanceof Place) {
            $place = Place::createFromMixed($place);
        }

        return $this->setPlace('pickup', $place, $options);
    }

    public function setDropoff($place, array $options = [])
    {
        if (!$place instanceof Place) {
            $place = Place::createFromMixed($place);
        }

        return $this->setPlace('dropoff', $place, $options);
    }

    public function setReturn($place, array $options = [])
    {
        if (!$place instanceof Place) {
            $place = Place::createFromMixed($place);
        }

        return $this->setPlace('return', $place, $options);
    }

    // when an order only has waypoints -- no pickup/dropoff
    public function getIsMultipleDropOrderAttribute()
    {
        return !$this->pickup && $this->waypoints && $this->waypoints->count() > 0;
    }

    /**
     * Set the first waypoint and update activity.
     *
     * @param Point $location
     *
     * @return void
     */
    public function setFirstWaypoint(?Activity $activity = null, $location = null)
    {
        $destination = null;

        if ($this->isMultipleDropOrder) {
            //complete first waypoint
                // Complete the first waypoint
                $firstWaypoint = $this->waypoints()->first();
                $tracking_number_uuid = optional($this->waypointMarkers()->first())->tracking_number_uuid;
        
                if ($firstWaypoint && $tracking_number_uuid) {
                    $status = TrackingStatus::where('tracking_number_uuid', $tracking_number_uuid)
                        ->whereNull('deleted_at')
                        ->first();
        
                    if ($status) {
                        $status->update([
                            'status' => 'Waypoint completed',
                            'code' => 'COMPLETED',
                            'details' => 'Waypoint has been completed',
                            'updated_at' => now()
                        ]);
                    }
                }
            
            //change second waypoint as current_waypoint while start the order
            $destination = $this->waypoints()->where('order', 1)->first();
        } else {
            //change dropoff as current_waypoint while start the order
            $destination = $this->dropoff ? $this->dropoff :$this->waypoints()->where('order', 1)->first();;
        }

        if (!$destination) {
            return $this;
        }

        $this->current_waypoint_uuid = $destination->uuid;
        $this->saveQuietly();
        $this->updateWaypointActivity($activity, $location);

        return $this->load('currentWaypoint');
    }

    /**
     * Update the current waypoint activity and it's entities.
     *
     * @param Point                               $location
     * @param \Fleetbase\Models\Proof|string|null $proof    resolvable proof of delivery/activity
     *
     * @return $this
     */
    public function updateWaypointActivity(?Activity $activity = null, $location = null, $proof = null)
    {
        if ($this->isMultipleDropOrder && Utils::isActivity($activity) && $location) {
            // update activity for the current waypoint
            $currentWaypoint = $this->waypointMarkers->firstWhere('place_uuid', $this->current_waypoint_uuid);

            if ($currentWaypoint) {
                $currentWaypoint->insertActivity($activity, $location, $proof);
            }

            // update activity for all entities for this destination/waypoint
            $entities = $this->entities->where('destination_uuid', $this->current_waypoint_uuid);

            foreach ($entities as $entity) {
                $entity->insertActivity($activity, $location, $proof);
            }
        }

        return $this;
    }

    /**
     * Set the next waypoint in sequence.
     *
     * @return void
     */
    public function setNextWaypointDestination()
    {
        $nextWaypoint = $this->waypointMarkers->filter(function ($waypoint) {
            // dump($waypoint->place->public_id, strtolower($waypoint->status_code));
            return !in_array(strtolower($waypoint->status_code), ['completed', 'canceled']) && $waypoint->place_uuid !== $this->current_waypoint_uuid;
        })->first();

        if (!$nextWaypoint) {
            return $this;
        }

        $this->current_waypoint_uuid = $nextWaypoint->place_uuid;

        if ($this->currentWaypoint) {
            $this->currentWaypoint->refresh();
        }

        return $this->load('currentWaypoint');
    }

    public function updateOrderDistanceAndTime(): ?Order
    {
        // load the order
        $this->load(['order']);

        // get the order
        $order = $this->order;

        // set google matrix based distance and time
        if ($order instanceof Order) {
            return $order->setDistanceAndTime();
        }

        return null;
    }

    public function findDestinationFromKey(?string $destinationKey = null): ?Place
    {
        if ($destinationKey === null) {
            return null;
        }

        // if waypoint index provided
        if (is_numeric($destinationKey)) {
            $waypoint = $this->waypoints->values()->get($destinationKey);

            if ($waypoint) {
                return $waypoint;
            }
        }

        // if explicitly set to pickup
        if ($destinationKey === 'pickup' && $this->pickup) {
            return $this->pickup;
        }

        // if explicitly set to dropoff
        if ($destinationKey === 'dropoff' && $this->dropoff) {
            return $this->dropoff;
        }

        // if waypoint public_id
        if (Utils::isPublicId($destinationKey)) {
            $waypoint = $this->waypoints->firstWhere('public_id', $destinationKey);

            // if no waypoint found from public_id check pickup/dropoff
            if (!$waypoint) {
                $waypoint = collect([$this->pickup, $this->dropoff])->firstWhere('public_id', $destinationKey);
            }

            if ($waypoint) {
                return $waypoint;
            }
        }

        // if waypoint uuid
        if (Str::isUuid($destinationKey)) {
            $waypoint = $this->waypoints->firstWhere('uuid', $destinationKey);

            // if no waypoint found from uuid check pickup/dropoff
            if (!$waypoint) {
                $waypoint = collect([$this->pickup, $this->dropoff])->firstWhere('uuid', $destinationKey);
            }

            if ($waypoint) {
                return $waypoint;
            }
        }

        // confirm destination_uuid is indeed a place record
        if (isset($attributes['destination_uuid']) && Place::where('uuid', $attributes['destination_uuid'])->doesntExist()) {
            // search waypoints for search_uuid if any
            $destination = Place::where('meta->search_uuid', $attributes['destination_uuid'])->first();

            if ($destination instanceof Place) {
                return $destination;
            }
        }

        // Validate destination actually exists
        if (isset($attributes['destination_uuid']) && Place::where('uuid', $attributes['destination_uuid'])->doesntExist()) {
            $destination = $this->_findCorrectDestinationForEntity($attributes);

            if ($destination instanceof Place) {
                return $destination;
            }
        }

        return null;
    }
}
