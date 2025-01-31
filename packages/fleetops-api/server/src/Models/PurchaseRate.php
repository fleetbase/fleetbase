<?php

namespace Fleetbase\FleetOps\Models;

use Fleetbase\Casts\Json;
use Fleetbase\Casts\PolymorphicType;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Models\Model;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasMetaAttributes;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\SendsWebhooks;
use Fleetbase\Traits\TracksApiCredential;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PurchaseRate extends Model
{
    use HasUuid;
    use HasPublicId;
    use SendsWebhooks;
    use TracksApiCredential;
    use HasMetaAttributes;
    use HasApiModelBehavior;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'purchase_rates';

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'rate';

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
    protected $fillable = ['_key', 'customer_uuid', 'customer_type', 'company_uuid', 'service_quote_uuid', 'transaction_uuid', 'payload_uuid', 'status', 'meta'];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'meta'             => Json::class,
        'customer_type'    => PolymorphicType::class,
    ];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = ['customer_is_vendor', 'customer_is_contact', 'amount', 'currency', 'service_quote_id', 'order_id', 'transaction_id', 'customer_id'];

    /**
     * The attributes excluded from the model's JSON form.
     *
     * @var array
     */
    protected $hidden = [];

    public function order(): HasOne
    {
        return $this->hasOne(Order::class);
    }

    public function serviceQuote(): BelongsTo
    {
        return $this->belongsTo(ServiceQuote::class);
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(\Fleetbase\Models\Transaction::class);
    }

    public function payload(): BelongsTo
    {
        return $this->belongsTo(Payload::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(\Fleetbase\Models\Company::class);
    }

    public function customer(): MorphTo
    {
        return $this->morphTo(__FUNCTION__, 'customer_type', 'customer_uuid');
    }

    public function getCustomerIsVendorAttribute(): bool
    {
        return Str::contains(strtolower($this->customer_type), 'vendor');
    }

    public function getCustomerIsContactAttribute(): bool
    {
        return Str::contains(strtolower($this->customer_type), 'contact');
    }

    public function getAmountAttribute(): float|int|null
    {
        if (!$this->relationLoaded('serviceQuote')) {
            return 0;
        }

        return data_get($this, 'serviceQuote.amount');
    }

    public function getCurrencyAttribute(): ?string
    {
        if (!$this->relationLoaded('serviceQuote')) {
            return null;
        }

        return data_get($this, 'serviceQuote.currency');
    }

    public function getServiceQuoteIdAttribute(): ?string
    {
        if (!$this->relationLoaded('serviceQuote')) {
            return null;
        }

        return data_get($this, 'serviceQuote.public_id');
    }

    public function getOrderIdAttribute(): ?string
    {
        if (!$this->relationLoaded('order')) {
            return null;
        }

        return data_get($this, 'order.public_id');
    }

    public function getCustomerIdAttribute(): ?string
    {
        if (!$this->relationLoaded('customer')) {
            return null;
        }

        return data_get($this, 'customer.public_id');
    }

    public function getTransactionIdAttribute(): ?string
    {
        if (!$this->relationLoaded('transaction')) {
            return null;
        }

        return data_get($this, 'transaction.public_id');
    }

    public static function resolveFromRequest(Request $request): ?PurchaseRate
    {
        $purchaseRate = $request->or(['order.purchase_rate_uuid', 'purchase_rate', 'purchase_rate_id', 'order.purchase_rate']);

        if (empty($purchaseRate)) {
            return null;
        }

        if (Str::isUuid($purchaseRate)) {
            $purchaseRate = static::where('uuid', $purchaseRate)->first();
        }

        if (Utils::isPublicId($purchaseRate)) {
            $purchaseRate = static::where('public_id', $purchaseRate)->first();
        }

        return $purchaseRate;
    }
}
