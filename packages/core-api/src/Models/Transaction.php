<?php

namespace Fleetbase\Models;

use Fleetbase\Casts\Json;
use Fleetbase\Casts\PolymorphicType;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasMetaAttributes;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;

class Transaction extends Model
{
    use HasUuid;
    use HasPublicId;
    use HasApiModelBehavior;
    use HasMetaAttributes;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'transactions';

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'transaction';

    /**
     * The attributes that can be queried.
     *
     * @var array
     */
    protected $searchableColumns = [];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = ['public_id', 'owner_uuid', 'owner_type', 'customer_uuid', 'customer_type', 'company_uuid', 'gateway_transaction_id', 'gateway', 'gateway_uuid', 'amount', 'currency', 'description', 'meta', 'type', 'status'];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = [];

    /**
     * The attributes excluded from the model's JSON form.
     *
     * @var array
     */
    protected $hidden = [];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'meta'          => Json::class,
        'customer_type' => PolymorphicType::class,
    ];

    /**
     * Transaction items.
     *
     * @var array
     */
    public function items()
    {
        return $this->hasMany(TransactionItem::class);
    }

    /**
     * The customer if any for this place.
     *
     * @var Model
     */
    public function customer()
    {
        return $this->morphTo(__FUNCTION__, 'customer_type', 'customer_uuid')->withoutGlobalScopes();
    }

    /**
     * Generates a fleetbase transaction number.
     *
     * @var array
     */
    public static function generateInternalNumber($length = 10)
    {
        $number = 'TR';
        for ($i = 0; $i < $length; $i++) {
            $number .= mt_rand(0, 9);
        }

        return $number;
    }

    /**
     * Generates a unique transaction number.
     *
     * @var array
     */
    public static function generateNumber($length = 10)
    {
        $n  = self::generateInternalNumber($length);
        $tr = self::where('gateway_transaction_id', $n)
            ->withTrashed()
            ->first();
        while (is_object($tr) && $n == $tr->gateway_transaction_id) {
            $n = self::generateInternalNumber($length);
        }

        return $n;
    }
}
