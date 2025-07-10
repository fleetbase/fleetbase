<?php

namespace Fleetbase\FleetOps\Models;

use Barryvdh\DomPDF\Facade\Pdf;
use Fleetbase\Casts\Json;
use Fleetbase\Casts\PolymorphicType;
use Fleetbase\FleetOps\Events\OrderCanceled;
use Fleetbase\FleetOps\Events\OrderCompleted;
use Fleetbase\FleetOps\Events\OrderDispatched;
use Fleetbase\FleetOps\Events\OrderDriverAssigned;
use Fleetbase\FleetOps\Flow\Activity;
use Fleetbase\FleetOps\Support\OrderTracker;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\FleetOps\Traits\HasTrackingNumber;
use Fleetbase\LaravelMysqlSpatial\Types\Point;
use Fleetbase\Models\CustomField;
use Fleetbase\Models\CustomFieldValue;
use Fleetbase\Models\Model;
use Fleetbase\Models\Transaction;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasInternalId;
use Fleetbase\Traits\HasMetaAttributes;
use Fleetbase\Traits\HasOptionsAttributes;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\Searchable;
use Fleetbase\Traits\SendsWebhooks;
use Fleetbase\Traits\TracksApiCredential;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Order extends Model
{
    use HasUuid;
    use HasPublicId;
    use HasInternalId;
    use SendsWebhooks;
    use HasApiModelBehavior;
    use HasOptionsAttributes;
    use HasMetaAttributes;
    use TracksApiCredential;
    use Searchable;
    use LogsActivity;
    use HasTrackingNumber;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'orders';

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'order';

    /**
     * The attributes that can be queried.
     *
     * @var array
     */
    protected $searchableColumns = ['public_id', 'internal_id', 'trackingNumber.tracking_number'];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        '_key',
        'public_id',
        'internal_id',
        'route_uuid',
        'customer_uuid',
        'customer_type',
        'facilitator_uuid',
        'facilitator_type',
        'pickup_uuid',
        'dropoff_uuid',
        'return_uuid',
        'company_uuid',
        'session_uuid',
        'payload_uuid',
        'order_config_uuid',
        'transaction_uuid',
        'purchase_rate_uuid',
        'tracking_number_uuid',
        'driver_assigned_uuid',
        'vehicle_assigned_uuid',
        'created_by_uuid',
        'updated_by_uuid',
        'scheduled_at',
        'estimated_end_date',
        'dispatched_at',
        'dispatched',
        'adhoc',
        'adhoc_distance',
        'started',
        'started_at',
        'pod_method',
        'pod_required',
        'is_route_optimized',
        'distance',
        'time',
        'meta',
        'notes',
        'type',
        'status',
        'fleet_uuid',
        'sub_fleet_uuid',
    ];

    /**
     * Attributes that is filterable on this model.
     *
     * @var array
     */
    protected $filterParams = [
        'service_quote_uuid',
        'unassigned',
        'pod_required',
        'started',
        'adhoc',
        'nearby',
        'storefront',
        'unassigned',
        'active',
        'tracking',
        'facilitator',
        'payload',
        'pickup',
        'dropoff',
        'return',
        'customer',
        'driver',
        'entity_status',
        'created_by',
        'updated_by',
        'layout',
        'with_tracker_data',
    ];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = [
        'driver_name',
        'tracking',
        'total_entities',
        'transaction_amount',
        'customer_name',
        'customer_phone',
        'facilitator_name',
        'customer_is_vendor',
        'customer_is_contact',
        'facilitator_is_vendor',
        'facilitator_is_contact',
        'has_driver_assigned',
        'pickup_name',
        'dropoff_name',
        'payload_id',
        'purchase_rate_id',
        'is_scheduled',
        'qr_code',
        'created_by_name',
        'updated_by_name',
    ];

    /**
     * Relationships to always append to model.
     *
     * @var array
     */
    protected $with = [];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    
    protected $casts = [
        'meta'             => Json::class,
        'options'          => Json::class,
        'customer_type'    => PolymorphicType::class,
        'facilitator_type' => PolymorphicType::class,
        'dispatched'       => 'boolean',
        'adhoc'            => 'boolean',
        'started'          => 'boolean',
        'pod_required'     => 'boolean',
        'scheduled_at'     => 'datetime',
        'estimated_end_date'  => 'datetime',
        'dispatched_at'    => 'datetime',
        'started_at'       => 'datetime',
    ];

    /**
     * The attributes excluded from the model's JSON form.
     *
     * @var array
     */
    protected $hidden = [
        'id',
        '_key',
    ];

    /**
     * Get the activity log options for the model.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logOnly(['*'])->logOnlyDirty();
    }

    /**
     * @return \Barryvdh\DomPDF\PDF
     */
    public function pdfLabel()
    {
        return Pdf::loadHTML($this->label());
    }

    /**
     * @return \Illuminate\Http\Response
     */
    public function pdfLabelStream()
    {
        return $this->pdfLabel()->stream();
    }

    /**
     * @return \Illuminate\View\View
     */
    public function label()
    {
        $this->load(['trackingNumber', 'company']);

        return view('fleetops::labels/default', [
            'order'          => $this,
            'trackingNumber' => $this->trackingNumber,
            'company'        => $this->company,
        ])->render();
    }

    public function orderConfig(): BelongsTo
    {
        return $this->belongsTo(OrderConfig::class)->withTrashed();
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function route(): BelongsTo
    {
        return $this->belongsTo(Route::class);
    }

    public function payload(): BelongsTo
    {
        return $this->belongsTo(Payload::class)->with(['pickup', 'dropoff', 'return', 'waypoints', 'entities']);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(\Fleetbase\Models\Company::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(\Fleetbase\Models\User::class);
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(\Fleetbase\Models\User::class);
    }

    /**
     * @return BelongsTo
     */
    public function driverAssigned(): BelongsTo|Builder
    {
        return $this->belongsTo(Driver::class)->without(['devices', 'vendor']);
    }

    /**
     * @return BelongsTo
     */
    public function driver(): BelongsTo|Builder
    {
        return $this->belongsTo(Driver::class)->without(['devices', 'vendor']);
    }

    /**
     * @return BelongsTo
     */
    public function vehicleAssigned(): BelongsTo|Builder
    {
        return $this->belongsTo(Vehicle::class)->without(['devices', 'vendor', 'fleets']);
    }

    /**
     * @return BelongsTo
     */
    public function vehicle(): BelongsTo|Builder
    {
        return $this->belongsTo(Vehicle::class)->without(['devices', 'vendor', 'fleets']);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(\Fleetbase\Models\Comment::class, 'subject_uuid')->whereNull('parent_comment_uuid')->latest();
    }

    public function files(): HasMany
    {
        return $this->hasMany(\Fleetbase\Models\File::class, 'subject_uuid')->latest();
    }

    public function customFields(): HasMany
    {
        return $this->hasMany(CustomField::class, 'subject_uuid')->orderBy('order');
    }

    public function customFieldValues(): HasMany
    {
        return $this->hasMany(CustomFieldValue::class, 'subject_uuid');
    }

    public function drivers(): HasManyThrough
    {
        return $this->hasManyThrough(Driver::class, Entity::class, 'tracking_number_uuid', 'tracking_number_uuid');
    }

    public function trackingNumber(): BelongsTo
    {
        return $this->belongsTo(TrackingNumber::class)->without(['owner']);
    }

    public function trackingStatuses(): HasMany
    {
        return $this->hasMany(TrackingStatus::class, 'tracking_number_uuid', 'tracking_number_uuid');
    }

    public function proofs(): HasMany
    {
        return $this->hasMany(Proof::class, 'subject_uuid');
    }

    /**
     * @return HasMany
     */
    public function purchaseRate(): BelongsTo
    {
        return $this->belongsTo(PurchaseRate::class);
    }

    /**
     * @return MorphTo
     */
    public function facilitator(): MorphTo|Builder
    {
        return $this->morphTo(__FUNCTION__, 'facilitator_type', 'facilitator_uuid')->withTrashed();
    }

    public function customer(): MorphTo
    {
        return $this->morphTo(__FUNCTION__, 'customer_type', 'customer_uuid');
    }

    public function authenticatableCustomer(): BelongsTo
    {
        return $this->belongsTo(Contact::class, 'customer_uuid')->where('type', 'customer');
    }

    /**
     * Get the adhoc distance for this order, or fallback to settings or default value which is 6km.
     *
     * @return int
     */
    public function getAdhocDistance()
    {
        return $this->adhoc_distance ?? data_get($this, 'company.options.fleetops.adhoc_distance', 6000);
    }

    /**
     * The assigned drivers full name.
     *
     * @return string
     */
    public function getDriverNameAttribute()
    {
        return data_get($this, 'driverAssigned.name');
    }

    /**
     * The assigned vehicle name.
     *
     * @return string
     */
    public function getVehicleNameAttribute()
    {
        return data_get($this, 'vehicleAssigned.display_name');
    }

    /**
     * The tracking number for the order.
     *
     * @return string
     */
    public function getTrackingAttribute()
    {
        return data_get($this, 'trackingNumber.tracking_number');
    }

    /**
     * The number of items for this order.
     *
     * @return string
     */
    public function getTotalEntitiesAttribute()
    {
        return (int) $this->fromCache('payload.total_entities');
    }

    /**
     * The transaction amount for the order.
     *
     * @return string
     */
    public function getTransactionAmountAttribute()
    {
        return data_get($this, 'transaction.amount');
    }

    /**
     * The customer name for the order.
     *
     * @return string
     */
    public function getCustomerNameAttribute()
    {
        return data_get($this, 'customer.name');
    }

    /**
     * The customer phone for the order.
     *
     * @return string
     */
    public function getCustomerPhoneAttribute()
    {
        return data_get($this, 'customer.phone');
    }

    /**
     * The facilitator name for the order.
     *
     * @return string
     */
    public function getFacilitatorNameAttribute()
    {
        return data_get($this, 'facilitator.name');
    }

    /**
     * True of the facilitator is a vendor `facilitator_is_vendor`.
     *
     * @return bool
     */
    public function getFacilitatorIsVendorAttribute()
    {
        return $this->facilitator_type === 'Fleetbase\\FleetOps\\Models\\Vendor';
    }

    /**
     * True of the facilitator is a integrated vendor `facilitator_is_integrated_vendor`.
     *
     * @return bool
     */
    public function getFacilitatorIsIntegratedVendorAttribute()
    {
        return $this->facilitator_type === 'Fleetbase\\FleetOps\\Models\\IntegratedVendor';
    }

    /**
     * True of the facilitator is a contact `facilitator_is_contact`.
     *
     * @return bool
     */
    public function getFacilitatorIsContactAttribute()
    {
        return $this->facilitator_type === 'Fleetbase\\FleetOps\\Models\\Contact';
    }

    /**
     * True of the customer is a vendor `customer_is_vendor`.
     *
     * @return bool
     */
    public function getCustomerIsVendorAttribute()
    {
        return $this->customer_type === 'Fleetbase\\FleetOps\\Models\\Vendor';
    }

    /**
     * True of the customer is a contact `customer_is_contact`.
     *
     * @return bool
     */
    public function getCustomerIsContactAttribute()
    {
        return $this->customer_type === 'Fleetbase\\FleetOps\\Models\\Contact';
    }

    /**
     * The pickup location name.
     */
    public function getPickupNameAttribute()
    {
        return $this->payload ? $this->payload->pickup_name : null;
    }

    /**
     * The dropoff location name.
     */
    public function getDropoffNameAttribute()
    {
        return $this->payload ? $this->payload->dropoff_name : null;
    }

    /**
     * The purchase rate public id.
     */
    public function getPurchaseRateIdAttribute()
    {
        return data_get($this, 'purchaseRate.public_id');
    }

    /**
     * The payload public id.
     */
    public function getPayloadIdAttribute()
    {
        return data_get($this, 'payload.public_id');
    }

    /**
     * The payload public id.
     *
     * @return string
     */
    public function getQrCodeAttribute()
    {
        return data_get($this, 'trackingNumber.qr_code');
    }

    /**
     * The name of the user who created the order.
     *
     * @return string
     */
    public function getCreatedByNameAttribute()
    {
        return data_get($this, 'createdBy.name');
    }

    /**
     * The name of the user who last updated.
     *
     * @return string
     */
    public function getUpdatedByNameAttribute()
    {
        return data_get($this, 'updatedBy.name');
    }

    /**
     * Set the order type attribute, which defaults to `default`.
     */
    public function setTypeAttribute(?string $type = null): void
    {
        $this->attributes['type'] = is_string($type) ? Str::slug($type) : 'default';
    }

    /**
     * Set the order status attribute, which defaults to `created`.
     */
    public function setStatusAttribute(?string $status = null): void
    {
        $this->attributes['status'] = is_string($status) ? Str::snake($status) : 'created';
    }

    /**
     * Checks if a driver is assigned to the order.
     *
     * @return bool returns true if a driver is assigned, false otherwise
     */
    public function getHasDriverAssignedAttribute()
    {
        return (bool) $this->driver_assigned_uuid;
    }

    /**
     * Determines if the order is ready for dispatch.
     * An order is ready for dispatch if it has a driver assigned or if it is marked as adhoc.
     *
     * @return bool returns true if the order is ready for dispatch, false otherwise
     */
    public function getIsReadyForDispatchAttribute()
    {
        return $this->hasDrvierAssigned || $this->adhoc;
    }

    /**
     * Checks if the order is scheduled.
     * Determines if a valid scheduled date and time is set for the order.
     *
     * @return bool returns true if the order is scheduled, false otherwise
     */
    public function getIsScheduledAttribute(): bool
    {
        return !empty($this->scheduled_at) && Carbon::parse($this->scheduled_at)->isValid();
    }

    /**
     * Determines if the order is assigned to a driver but not yet dispatched.
     *
     * @return bool returns true if the order is assigned to a driver but not dispatched, false otherwise
     */
    public function getIsAssignedNotDispatchedAttribute(): bool
    {
        return !empty($this->driver_assigned_uuid) && $this->dispatched_at === null;
    }

    /**
     * Checks if the order has not been dispatched.
     *
     * @return bool returns true if the order has not been dispatched, false otherwise
     */
    public function getIsNotDispatchedAttribute(): bool
    {
        return $this->dispatched_at === null;
    }

    /**
     * Indicates whether the order is from an integrated vendor.
     *
     * @return bool returns true if the order is from an integrated vendor, false otherwise
     */
    public function getIsIntegratedVendorOrderAttribute()
    {
        return $this->isIntegratedVendorOrder();
    }

    /**
     * Associates a given payload with the order.
     * Sets the payload_uuid and updates the payload relationship for the order.
     *
     * @param Payload|null $payload the Payload instance to associate with the order
     *
     * @return Order the Order instance for method chaining
     */
    public function setPayload(?Payload $payload): Order
    {
        $this->payload_uuid = $payload->uuid;
        $this->setRelation('payload', $payload);
        $this->save();

        return $this;
    }

    /**
     * Creates a new payload for the order with the provided attributes.
     * Optionally sets the newly created payload as the payload of the order.
     *
     * @param array|null $attributes the attributes for creating the payload
     * @param bool       $setPayload whether to set the newly created payload as the order's payload
     *
     * @return Payload the newly created Payload instance
     */
    public function createPayload(?array $attributes = [], bool $setPayload = true): Payload
    {
        // set payload type if not set
        if (!isset($attributes['type'])) {
            $attributes['type'] = $this->type;
        }

        if (isset($attributes['pickup']) && is_array($attributes['pickup'])) {
            $pickup = Place::createFromMixed($attributes['pickup']);

            if ($pickup instanceof Place) {
                $attributes['pickup_uuid'] = $pickup->uuid;
            }
        }

        if (isset($attributes['dropoff']) && is_array($attributes['dropoff'])) {
            $dropoff = Place::createFromMixed($attributes['dropoff']);

            if ($dropoff instanceof Place) {
                $attributes['dropoff_uuid'] = $dropoff->uuid;
            }
        }

        if (isset($attributes['return']) && is_array($attributes['return'])) {
            $return = Place::createFromMixed($attributes['return']);

            if ($return instanceof Place) {
                $attributes['return_uuid'] = $return->uuid;
            }
        }

        $payload = Payload::create($attributes);

        if ($setPayload) {
            $this->setPayload($payload);
        }

        return $payload;
    }

    /**
     * Inserts a new payload for the order into the database with the provided attributes.
     * Optionally sets the inserted payload as the payload of the order.
     *
     * @param array|null $attributes the attributes for inserting the payload
     * @param bool       $setPayload whether to set the inserted payload as the order's payload
     *
     * @return Payload the inserted Payload instance
     */
    public function insertPayload(?array $attributes = [], bool $setPayload = true): Payload
    {
        // set payload type if not set
        if (!isset($attributes['type'])) {
            $attributes['type'] = $this->type;
        }

        if (isset($attributes['pickup']) && is_array($attributes['pickup'])) {
            $pickupId = Place::insertFromMixed($attributes['pickup']);

            $attributes['pickup_uuid'] = $pickupId;
        }

        if (isset($attributes['dropoff']) && is_array($attributes['dropoff'])) {
            $dropoffId = Place::insertFromMixed($attributes['dropoff']);

            $attributes['dropoff_uuid'] = $dropoffId;
        }

        if (isset($attributes['return']) && is_array($attributes['return'])) {
            $returnId = Place::insertFromMixed($attributes['return']);

            $attributes['return_uuid'] = $returnId;
        }

        $fillable   = $this->getFillable();
        $insertKeys = array_keys($attributes);
        // clean insert data
        foreach ($insertKeys as $key) {
            if (!in_array($key, $fillable)) {
                unset($attributes[$key]);
            }
        }

        $attributes['uuid']         = $uuid = (string) Str::uuid();
        $attributes['public_id']    = static::generatePublicId('payload');
        $attributes['_key']         = session('api_key', 'console');
        $attributes['created_at']   = Carbon::now()->toDateTimeString();
        $attributes['company_uuid'] = session('company');

        $result = Payload::insert($attributes);

        if (!$result) {
            return $this->createPayload($attributes);
        }

        // get newly inserted payload
        $payload = Payload::find($uuid);

        // manyally trigger payload created event
        $payload->fireModelEvent('created', false);

        if ($setPayload) {
            $this->setPayload($payload);
        }

        return $payload;
    }

    /**
     * Retrieves the payload associated with the order.
     * If the payload is not already loaded, it loads the payload relationship.
     *
     * @return Payload|null the Payload model associated with the order
     */
    public function getPayload(?\Closure $callback = null): ?Payload
    {
        $this->loadMissing('payload');
        if ($this->payload) {
            if (is_callable($callback)) {
                $callback($this->payload);
            }

            return $this->payload;
        }

        if (Str::isUuid($this->payload_uuid)) {
            $payload = Payload::where('uuid', $this->payload_uuid)->first();
            if ($payload) {
                if (is_callable($callback)) {
                    $callback($payload);
                }

                return $payload;
            }
        }

        if (is_callable($callback)) {
            $callback($this->payload);
        }

        return $this->payload;
    }

    /**
     * Sets or updates the route for the order.
     * If a Route instance is provided, it sets the order_uuid and saves the Route.
     * Otherwise, it creates a new Route with the provided attributes.
     *
     * @param array|Route|null $attributes attributes for the route or a Route instance
     *
     * @return self the Order instance for method chaining
     */
    public function setRoute(?array $attributes = [])
    {
        if (!$attributes) {
            return $this;
        }

        if ($attributes instanceof Route) {
            $attributes->set('order_uuid', $this->order_uuid);
            $attributes->save();

            return $this;
        }

        if (isset($attributes['payload'])) {
            $attributes['details'] = $attributes['payload'];
            unset($attributes['payload']);
        }

        $attributes['order_uuid']   = $this->uuid;
        $attributes['company_uuid'] = $this->company_uuid ?? session('company');

        $route = new Route($attributes);
        $route->save();

        $this->update(['route_uuid' => $route->uuid]);

        return $this;
    }

    /**
     * Retrieves the current destination location for the order.
     * It prioritizes dropoff location, then waypoints, and defaults to a zero-point if none are set.
     *
     * @return Point the current destination location as a Point instance
     */
    public function getCurrentDestinationLocation()
    {
        if (isset($this->payload) && isset($this->payload->dropoff)) {
            return $this->payload->dropoff->location;
        }
        if ($this->payload && $this->payload->waypoints->count()!=0 && $this->payload->current_waypoint_uuid) {
            $waypoint = $this->payload->waypoints->firstWhere ('uuid', $this->payload->current_waypoint_uuid);
            if ($waypoint) {
                return $waypoint->location;
            }
        }
        if ($this->payload && $this->payload->waypoints->count()!=0) {
            return $this->payload->waypoints->first()->location;
        }
        return new Point(0, 0);
    }

    /**
     * Retrieves the last known location for the order.
     * It checks the driver assigned location, then the pickup location, followed by waypoints.
     *
     * @return Point the last known location as a Point instance
     */
    public function getLastLocation()
    {
        if ($this->driverAssigned && $this->driverAssigned->location) {
            return $this->driverAssigned->location;
        }

        if ($this->payload && $this->payload->pickup && $this->payload->pickup->location) {
            return $this->payload->pickup->location;
        }

        if ($this->payload && $this->payload->waypoints->count() && $this->payload->current_waypoint_uuid) {
            return $this->payload->waypoints->firstWhere('uuid', $this->payload->current_waypoint_uuid)->location;
        }

        if ($this->payload && $this->payload->waypoints->count()) {
            return $this->payload->waypoints->first()->location;
        }

        return new Point(0, 0);
    }

    /**
     * Purchases a service quote for the order and creates a purchase rate.
     * The purchase rate details are saved to the order.
     *
     * @param string $serviceQuoteId the UUID of the service quote
     * @param array  $meta           additional metadata for the purchase
     *
     * @return bool returns true if the purchase rate is successfully saved
     */
    public function purchaseQuote(string $serviceQuoteId, $meta = [])
    {
        // $serviceQuote = ServiceQuote::where('uuid', $serviceQuoteId)->first();
        // create purchase rate for order
        $purchasedRate = PurchaseRate::create([
            'customer_uuid'      => $this->customer_uuid,
            'customer_type'      => $this->customer_type,
            'company_uuid'       => session('company'),
            'service_quote_uuid' => $serviceQuoteId,
            'payload_uuid'       => $this->payload_uuid,
            'status'             => 'created',
            'meta'               => $meta,
        ]);

        $this->purchase_rate_uuid = $purchasedRate->uuid;

        return $this->save();
    }

    /**
     * Purchases a service quote for the order, or creates a transaction without a service quote if none is provided.
     * The function handles different types of service quote identifiers and creates a purchase rate accordingly.
     *
     * @param mixed $serviceQuote the service quote or its identifier
     * @param array $meta         additional metadata for the purchase
     *
     * @return self|bool the Order instance for method chaining, or false on failure
     */
    public function purchaseServiceQuote($serviceQuote, $meta = [])
    {
        if (!$serviceQuote) {
            // create transaction for order
            $this->createOrderTransactionWithoutServiceQuote();

            return $this;
        }

        if (Str::isUuid($serviceQuote)) {
            $serviceQuote = ServiceQuote::where('uuid', $serviceQuote)->first();
        }

        if (Utils::isPublicId($serviceQuote)) {
            $serviceQuote = ServiceQuote::where('public_id', $serviceQuote)->first();
        }

        if ($serviceQuote instanceof ServiceQuote) {
            $purchasedRate = PurchaseRate::create([
                'customer_uuid'      => $this->customer_uuid,
                'customer_type'      => $this->customer_type,
                'company_uuid'       => session('company', $this->company_uuid),
                'service_quote_uuid' => $serviceQuote->uuid,
                'payload_uuid'       => $this->payload_uuid,
                'status'             => 'created',
                'meta'               => $meta,
            ]);

            return $this->update([
                'purchase_rate_uuid' => $purchasedRate->uuid,
            ]);
        }

        return false;
    }

    /**
     * Creates a transaction for the order without a service quote.
     * This method is used when an order is made without selecting a specific service quote.
     *
     * @return Transaction|null the created Transaction model or null on failure
     */
    public function createOrderTransactionWithoutServiceQuote(): ?Transaction
    {
        $transaction = null;

        try {
            // create transaction and transaction items
            $transaction = Transaction::create([
                'company_uuid'           => session('company', $this->company_uuid),
                'customer_uuid'          => $this->customer_uuid,
                'customer_type'          => $this->customer_type,
                'gateway_transaction_id' => Transaction::generateNumber(),
                'gateway'                => 'internal',
                'amount'                 => 0,
                'currency'               => data_get($this->company, 'country') ? Utils::getCurrenyFromCountryCode(data_get($this->company, 'country')) : 'SGD',
                'description'            => 'Dispatch order',
                'type'                   => 'dispatch',
                'status'                 => 'success',
            ]);

            // set transaction to order
            $this->update(['transaction_uuid' => $transaction->uuid]);
        } catch (\Throwable $e) {
            // log error unable to create order transaction
        }

        return $transaction;
    }

    /**
     * Determines if the order should be dispatched based on the scheduled time and a precision interval.
     *
     * @param int $precision the number of minutes before and after the scheduled time to consider for dispatching
     *
     * @return bool returns true if the order should be dispatched, false otherwise
     */
    public function shouldDispatch($precision = 1)
    {
        $min = Carbon::now()->subMinutes($precision);
        $max = Carbon::now()->addMinutes($precision);

        return !$this->dispatched && Carbon::fromString($this->scheduled_at)->between($min, $max);
    }

    /**
     * Dispatches the order.
     * Sets the dispatched flag and dispatched_at timestamp. Optionally saves the order and flushes attribute cache.
     *
     * @param bool $save whether to save the order after dispatching
     *
     * @return mixed the result of the OrderDispatched event
     */
    public function dispatch($save = true)
    {
        $this->dispatched    = true;
        $this->dispatched_at = now();

        if ($save === true) {
            $this->save();
            $this->flushAttributesCache();
        }

        return event(new OrderDispatched($this));
    }

    /**
     * Inserts a dispatch activity into the order.
     * Retrieves and applies a dispatch activity specific to the order.
     *
     * @return Order the updated Order instance
     */
    public function insertDispatchActivity(): Order
    {
        // get dispatch activity if any and apply to order
        $dispatchActivity = $this->config()->getDispatchActivity();

        if ($dispatchActivity) {
            $this->updateActivity($dispatchActivity);
        }

        return $this;
    }

    /**
     * Dispatches the order and inserts a dispatch activity.
     * Combines the functionalities of dispatching the order and inserting a dispatch activity.
     *
     * @return Order the updated Order instance
     */
    public function dispatchWithActivity(): Order
    {
        $this->dispatch();
        $this->insertDispatchActivity();

        return $this;
    }

    /**
     * Dispatches the order only if it hasn't been dispatched yet.
     * A check is performed before dispatching the order.
     *
     * @return Order the updated Order instance
     */
    public function firstDispatch(): Order
    {
        if ($this->dispatched) {
            $this->dispatch();
        }

        return $this;
    }

    /**
     * Dispatches the order with activity only if it hasn't been dispatched yet.
     * A check is performed before dispatching the order and inserting the dispatch activity.
     *
     * @return Order the updated Order instance
     */
    public function firstDispatchWithActivity(): Order
    {
        if ($this->dispatched) {
            $this->dispatchWithActivity();
        }

        return $this;
    }

    /**
     * Cancels the order.
     * Sets the order status to 'canceled' and handles cancellation for integrated vendor orders.
     *
     * @return mixed the result of the OrderCanceled event
     */
    public function cancel()
    {
        $this->status = 'canceled';

        if ($this->isIntegratedVendorOrder()) {
            $api = $this->facilitator->api();

            if (method_exists($api, 'cancelFromFleetbaseOrder')) {
                $api->cancelFromFleetbaseOrder($this);
            }
        }

        return event(new OrderCanceled($this));
    }

    /**
     * Notifies that a driver has been assigned to the order.
     * Triggers an event when a driver is assigned to the order.
     *
     * @return mixed the result of the OrderDriverAssigned event, if a driver is assigned
     */
    public function notifyDriverAssigned()
    {
        if ($this->driver_assigned_uuid) {
            return event(new OrderDriverAssigned($this));
        }
    }

    /**
     * Updates the activity of the order.
     * Updates the order status and inserts a new activity based on the provided activity details.
     *
     * @param Activity $activity the activity details to be updated
     * @param mixed    $proof    additional proof or details for the activity update
     *
     * @return Order the updated Order instance
     */
    public function updateActivity(?Activity $activity = null, $proof = null): Order
    {
        if (!Utils::isActivity($activity)) {
            return $this;
        }

        // Get location
        $location = $this->getLastLocation();

        // Insert dispatch activity
        $this->insertActivity($activity, $location, $proof);

        // Update status using code
        $this->setStatus($activity->get('code'), true);

        // Fire activity events
        $activity->fireEvents($this);

        return $this;
    }

    /**
     * Notifies that the order has been completed.
     * Triggers an event indicating the completion of the order.
     *
     * @return mixed the result of the OrderCompleted event
     */
    public function notifyCompleted()
    {
        return event(new OrderCompleted($this));
    }

    /**
     * Completes the order and updates its activities.
     *
     * This method is responsible for marking the order as completed. It achieves this by
     * creating a new 'completed' Activity instance and updating the order's status and activities
     * accordingly. Additionally, this method triggers a notification to indicate that the order
     * has been completed. Optionally, proof or additional details can be provided to accompany
     * the activity update.
     *
     * The process involves the following steps:
     * 1. Creating a new Activity instance with the 'completed' code and relevant details.
     * 2. Notifying that the order has been completed via `notifyCompleted`.
     * 3. Updating the order's activity with the new 'completed' activity through `updateActivity`.
     *
     * @param Proof|null $proof Optional. Additional proof or details for the activity update.
     *
     * @return Order the order instance with updated activities, reflecting the completion status
     */
    public function complete(?Proof $proof = null): self
    {
        $this->notifyCompleted();

        $doesntHaveCompletedActivity = TrackingStatus::where(['tracking_number_uuid' => $this->tracking_number_uuid, 'code' => 'COMPLETED'])->doesntExist();
        if ($doesntHaveCompletedActivity) {
            $activity = $this->config()->getCompletedActivity();

            return $this->updateActivity($activity, $proof);
        }

        return $this;
    }

    /**
     * Sets the customer for the order.
     * Updates the customer_uuid and customer_type attributes based on the provided model.
     *
     * @param Model $model the customer model to set for the order
     */
    public function setCustomer($model)
    {
        $this->customer_uuid = $model->uuid;
        $this->customer_type = Utils::getMutationType($model);
    }

    /**
     * Sets the customer type attribute for the order.
     * Transforms and sets the customer type attribute based on specific string handling rules.
     *
     * @param string $type the customer type to be set
     */
    public function setCustomerTypeAttribute($type)
    {
        if (is_string($type)) {
            $isNotNamespace           = !Str::contains($type, '\\');
            $doesNotStartWithFleetOps = !Str::startsWith($type, 'fleet-ops');
            $isValidType              = $type === 'contact' || $type === 'vendor';

            // preprend fleet-ops IF not a namespace and does not start with fleet-ops
            // this is for handling ember style registry spacing
            if ($isNotNamespace && $doesNotStartWithFleetOps && $isValidType) {
                $type = 'fleet-ops:' . $type;
            }

            $this->attributes['customer_type'] = Utils::getMutationType($type);
        }
    }

    /**
     * Sets the facilitator type attribute for the order.
     * Transforms and sets the facilitator type attribute based on specific string handling rules.
     *
     * @param string $type the facilitator type to be set
     */
    public function setFacilitatorTypeAttribute($type)
    {
        if (is_string($type)) {
            $isNotNamespace           = !Str::contains($type, '\\');
            $doesNotStartWithFleetOps = !Str::startsWith($type, 'fleet-ops');
            $isValidType              = $type === 'contact' || $type === 'vendor';

            // preprend fleet-ops IF not a namespace and does not start with fleet-ops
            // this is for handling ember style registry spacing
            if ($isNotNamespace && $doesNotStartWithFleetOps && $isValidType) {
                $type = 'fleet-ops:' . $type;
            }

            $this->attributes['facilitator_type'] = Utils::getMutationType($type);
        }
    }

    /**
     * Sets the pickup location of the payload to the driver's current location.
     * Optionally forces the update or sets the location based on specific order conditions.
     *
     * @param bool $force whether to force the update of the pickup location
     */
    public function setDriverLocationAsPickup($force = false)
    {
        if ($force === true) {
            $this->load('driverAssigned');

            if ($this->driverAssigned instanceof Driver) {
                $this->payload->setPickup($this->driverAssigned->location, ['save' => true]);
            }
        }

        // if payload is using a special key `pickup_is_driver_location`
        // and driver is assigned set the pickup point as the drivers current location
        if ($this->isDirty('driver_assigned_uuid') && !empty($this->driver_assigned_uuid) && $this->payload && $this->payload->hasMeta('pickup_is_driver_location')) {
            $this->load('driverAssigned');

            if ($this->driverAssigned instanceof Driver) {
                $this->payload->setPickup($this->driverAssigned->location, ['save' => true]);
            }
        }
    }

    /**
     * Determines if the pickup location is set to be from the driver's current location.
     *
     * @return bool returns true if the pickup location should be the driver's current location, false otherwise
     */
    public function isPickupIsFromDriverLocation()
    {
        return $this->payload instanceof Payload && $this->payload->hasMeta('pickup_is_driver_location');
    }

    /**
     * Updates the status of the order.
     * Allows updating multiple statuses or a specific status based on a code or the order's flow.
     *
     * @param string|array|null $code the status code(s) to update the order status to
     *
     * @return bool returns true if the status is successfully updated, false otherwise
     */
    public function updateStatus($code = null)
    {
        // update multiple status codes
        if (is_array($code)) {
            return collect($code)->every(function ($activityCode) {
                return $this->updateStatus($activityCode);
            });
        }

        $flow     = $this->config()->nextActivity();
        $activity = null;

        if (count($flow) === 1 && $code === null) {
            $activity = $flow[0];
        }

        if ($code) {
            $activity = $flow->firstWhere('code', $code);
        }

        if (!Utils::isActivity($activity)) {
            return false;
        }

        $isDispatchActivity = Utils::isActivity($activity) && $activity->is('dispatched');
        $isReadyForDispatch = $this->isReadyForDispatch;

        if ($isDispatchActivity && $isReadyForDispatch) {
            $this->dispatch(true);
        }

        $location = $this->getLastLocation();

        $this->setStatus($activity->code);
        $this->insertActivity($activity, $location);

        // fire events if any
        $activity->fireEvents($this);

        return true;
    }

    /**
     * Checks if the specified driver is assigned to the order.
     *
     * @param mixed $driver the driver instance, UUID, or public ID to check against
     *
     * @return bool returns true if the specified driver is assigned to the order, false otherwise
     */
    public function isDriver($driver)
    {
        if ($driver instanceof Driver) {
            return $driver->uuid === $this->driver_assigned_uuid;
        }

        if (is_string($driver)) {
            return $driver === $this->driver_assigned_uuid || ($this->driverAssigned && $driver === $this->driverAssigned->public_id);
        }

        return $driver === $this->driverAssigned;
    }

    /**
     * Assigns a driver to the order.
     * Sets the driver_assigned_uuid and updates the related relationships.
     * Optionally notifies about the driver assignment.
     *
     * @param mixed $driver the driver instance or identifier to assign
     * @param bool  $silent whether to suppress the notification of the driver assignment
     *
     * @return Order the updated Order instance
     */
    public function assignDriver($driver, $silent = false)
    {
        if ($driver instanceof Driver) {
            $this->driver_assigned_uuid = $driver->uuid;
        }

        if (is_string($driver)) {
            if (Str::startsWith($driver, 'driver_')) {
                $driver = Driver::select(['uuid', 'public_id'])->where('public_id', $driver)->whereNull('deleted_at')->withoutGlobalScopes()->first();
                if ($driver) {
                    return $this->assignDriver($driver);
                }

                throw new \Exception('Invalid driver provided for assignment!');
            }

            $this->driver_assigned_uuid = $driver;
        }

        if ($driver instanceof Driver) {
            $this->setRelation('driverAssigned', $driver);
        }

        if (!$silent) {
            $this->notifyDriverAssigned();
        }

        $this->save();

        return $this;
    }

    /**
     * Retrieves the current origin position for the order.
     * The origin is either the driver's current location or the payload's pickup/current waypoint.
     *
     * @return Point|null the current origin position as a Point instance, or null if not set
     */
    public function getCurrentOriginPosition()
    {
        if ($this->hasDriverAssigned) {
            $this->load(['driverAssigned']);
            $driverAssigned = $this->driverAssigned;

            if (!$driverAssigned) {
                $driverAssigned = Driver::where('uuid', $this->driver_assigned_uuid)->first();
            }

            if ($driverAssigned instanceof Driver) {
                return $driverAssigned->location;
            }
        }

        $origin = null;

        if ($this->payload) {
            $origin = $this->payload->getPickupOrCurrentWaypoint();
        }

        return $origin ? $origin->location : null;
    }

    /**
     * Retrieves the destination position for the order.
     * The destination is either the payload's dropoff or the last waypoint.
     *
     * @return Point|null the destination position as a Point instance, or null if not set
     */
    public function getDestinationPosition()
    {
        $destination = null;

        if ($this->payload) {
            $destination = $this->payload->getDropoffOrLastWaypoint();
        }

        return $destination ? $destination->location : null;
    }

    /**
     * Sets the preliminary distance and time for the order.
     * Uses a utility method to calculate the distance and time between the current origin and destination positions.
     *
     * @return Order the updated Order instance
     */
    public function setPreliminaryDistanceAndTime()
    {
        $origin      = $this->getCurrentOriginPosition();
        $destination = $this->getDestinationPosition();

        if ($origin === null || $destination === null) {
            return $this;
        }

        $matrix = Utils::getPreliminaryDistanceMatrix($origin, $destination);

        $this->update(['distance' => $matrix->distance, 'time' => $matrix->time]);

        return $this;
    }

    /**
     * Sets the accurate distance and time for the order based on driving distance.
     * Uses a utility method to calculate the driving distance and time between the current origin and destination positions.
     *
     * @return Order the updated Order instance
     */
    public function setDistanceAndTime($options = []): Order
    {
        $origin      = $this->getCurrentOriginPosition();
        $destination = $this->getDestinationPosition();
        $matrix      = Utils::getDrivingDistanceAndTime($origin, $destination, $options);
        if ($origin === null || $destination === null) {
            return $this;
        }

        $this->update(['distance' => $matrix->distance, 'time' => $matrix->time]);

        return $this;
    }

    /**
     * Determines if the order is from an integrated vendor.
     *
     * @return bool returns true if the order is from an integrated vendor, false otherwise
     */
    public function isIntegratedVendorOrder()
    {
        return $this->facilitator_is_integrated_vendor === true;
    }

    /**
     * Retrieves the adhoc ping distance for the order.
     * Defaults to a specified value or a configuration setting.
     *
     * @return int the adhoc ping distance in meters
     */
    public function getAdhocPingDistance(): int
    {
        return (int) Utils::get($this, 'adhoc_distance', Utils::get($this, 'company.options.fleetops.adhoc_distance', 6000));
    }

    /**
     * Retrieves a custom field by its key.
     *
     * This method searches for a custom field where the name or label matches the given key.
     *
     * @param string $key the key used to search for the custom field
     *
     * @return CustomField|null the found CustomField object or null if not found
     */
    public function getCustomField(string $key): ?CustomField
    {
        $name         = Str::slug($key);
        $label        = Str::title($key);

        return $this->customFields()->where('name', $name)->orWhere('label', $label)->first();
    }

    /**
     * Retrieves the custom field value for the specified custom field.
     *
     * @param CustomField $customField the custom field to retrieve the value for
     *
     * @return CustomFieldValue|null the custom field value, or null if not found
     */
    public function getCustomFieldValue(CustomField $customField): ?CustomFieldValue
    {
        $customFieldValue = $this->customFieldValues()->where('custom_field_uuid', $customField->uuid)->first();
        if ($customFieldValue) {
            return $customFieldValue;
        }

        return null;
    }

    /**
     * Retrieves the value of a custom field by its key.
     *
     * @param string $key the key of the custom field
     *
     * @return mixed|null the value of the custom field, or null if not found
     */
    public function getCustomFieldValueByKey(string $key)
    {
        $customField = $this->getCustomField($key);
        if ($customField) {
            $customFieldValue = $this->getCustomFieldValue($customField);
            if ($customFieldValue) {
                return $customFieldValue->value;
            }
        }

        return null;
    }

    /**
     * Checks if a custom field exists.
     *
     * @param string $key the key of the custom field
     */
    public function isCustomField(string $key): bool
    {
        $name         = Str::slug($key);
        $label        = Str::title($key);

        return $this->customFields()->where('name', $name)->orWhere('label', $label)->exists();
    }

    /**
     * Retrieves all custom field values associated with the order.
     *
     * @return array an array of custom field values
     */
    public function getCustomFieldValues(): array
    {
        $customFields = [];
        foreach ($this->customFieldValues as $customFieldValue) {
            $key = Str::snake(strtolower($customFieldValue->custom_field_label));
            if ($key) {
                $customFields[$key] = $customFieldValue->value;
            }
        }

        return $customFields;
    }

    /**
     * Retrieves the OrderConfig associated with this order.
     *
     * This function first attempts to load the 'orderConfig' relationship.
     * If 'orderConfig' is already loaded and is an instance of OrderConfig,
     * it returns this instance. If not, and if the 'order_config_uuid' is
     * a valid UUID, it attempts to retrieve the OrderConfig by this UUID,
     * including any trashed instances. If none of these conditions are met,
     * it returns null.
     *
     * @return OrderConfig|null the OrderConfig associated with this order, or null if not found
     *
     * @throws \Exception type of exceptions this function might throw, if any
     */
    public function config(): OrderConfig
    {
        $this->load(['orderConfig']);

        if ($this->orderConfig instanceof OrderConfig) {
            $this->orderConfig->setOrderContext($this);

            return $this->orderConfig;
        }

        if (Str::isUuid($this->order_config_uuid)) {
            $orderConfig = OrderConfig::where('uuid', $this->order_config_uuid)->withTrashed()->first();
            $orderConfig->setOrderContext($this);

            return $orderConfig;
        }

        return null;
    }

    /**
     * Retrieves the flow configuration from the order config.
     *
     * This method accesses the order config and returns its 'flow' property.
     * The flow property is expected to be an array that outlines the sequence or
     * structure of activities or steps in the order process. If the flow property
     * is not an array or is not set, an empty array is returned.
     *
     * @return array the flow configuration array from the order config, or an empty array if not set or not an array
     */
    public function getConfigFlow(): array
    {
        $orderConfig = $this->config();
        if (is_array($orderConfig->flow)) {
            return $orderConfig->flow;
        }

        return [];
    }

    /**
     * Resolves a given value which can be a static value or a dynamic property name.
     *
     * This method attempts to resolve the dynamic property first, if not found it returns the given value.
     *
     * @return mixed the resolved value, or the input value if the resolution finds nothing
     */
    public function resolveDynamicProperty(string $property)
    {
        $snakedProperty = Str::snake($property);

        // check if existing property
        if ($this->{$snakedProperty}) {
            return $this->{$snakedProperty};
        }

        // Check if custom field property
        if ($this->isCustomField($property)) {
            return $this->getCustomFieldValueByKey($property);
        }

        // Check if meta attribute
        if ($this->hasMeta($property)) {
            return $this->getMeta($property);
        }

        return data_get($this, $property);
    }

    /**
     * Resolves the value of a dynamic property.
     *
     * This method attempts to resolve the property from the object, then as a custom field, and finally as a meta attribute.
     * If none of these are found, it returns the value using the `data_get` helper function.
     *
     * @return mixed the resolved value of the property, or the original property if not found
     */
    public function resolveDynamicValue(string $value)
    {
        $resolved = $this->resolveDynamicProperty($value);
        if ($resolved) {
            return $resolved;
        }

        return $value;
    }

    public function loadAssignedDriver(): self
    {
        $this->loadMissing(['driverAssigned']);
        $driverAssigned = $this->driverAssigned;

        if ($driverAssigned) {
            $this->setRelation('driverAssigned', $driverAssigned);

            return $this;
        }

        if (Str::isUuid($this->driver_assigned_uuid)) {
            $driverAssigned = Driver::where('uuid', $this->driver_assigned_uuid)->first();
            if ($driverAssigned) {
                $this->setRelation('driverAssigned', $driverAssigned);

                return $this;
            }
        }

        return $this;
    }

    public function tracker(): OrderTracker
    {
        return new OrderTracker($this);
    }

    public function hasCompletedActivity(Activity $activity): bool
    {
        $this->loadMissing('trackingStatuses');
        if ($this->trackingStatuses) {
            return $this->trackingStatuses->contains(function ($trackingStatus) use ($activity) {
                return strtolower($trackingStatus->code) === strtolower($activity->code);
            });
        }

        return false;
    }
    public function routeSegments()
    {
        return $this->hasMany(\Fleetbase\FleetOps\Models\RouteSegment::class, 'order_id', 'id')->where('deleted', 0);;
    }


}
