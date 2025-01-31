<?php

namespace Fleetbase\FleetOps\Models;

use Fleetbase\Casts\Money;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Models\Model;
use Fleetbase\Traits\HasUuid;
use PhpUnitsOfMeasure\PhysicalQuantity\Length;
use PhpUnitsOfMeasure\PhysicalQuantity\Mass;

class ServiceRateParcelFee extends Model
{
    use HasUuid;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'service_rate_parcel_fees';

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
    protected $fillable = ['_key', 'service_rate_uuid', 'size', 'length', 'width', 'height', 'dimensions_unit', 'weight', 'weight_unit', 'fee', 'currency'];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'fee' => Money::class,
    ];

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

    public static function onRowInsert($row)
    {
        $row['fee'] = Utils::numbersOnly($row['fee']);

        return $row;
    }

    /**
     * Set the fee as only numbers.
     *
     * @void
     */
    public function setFeeAttribute($value)
    {
        $this->attributes['fee'] = Utils::numbersOnly($value);
    }

    /**
     * The length the entity belongs to.
     *
     * @var PhpUnitsOfMeasure\PhysicalQuantity\Length
     */
    public function getLengthUnitAttribute()
    {
        return new Length($this->length, $this->dimensions_unit);
    }

    /**
     * The width the entity belongs to.
     *
     * @var PhpUnitsOfMeasure\PhysicalQuantity\Length
     */
    public function getWidthUnitAttribute()
    {
        return new Length($this->width, $this->dimensions_unit);
    }

    /**
     * The height the entity belongs to.
     *
     * @var PhpUnitsOfMeasure\PhysicalQuantity\Length
     */
    public function getHeightUnitAttribute()
    {
        return new Length($this->height, $this->dimensions_unit);
    }

    /**
     * The weight the entity belongs to.
     *
     * @var PhpUnitsOfMeasure\PhysicalQuantity\Mass
     */
    public function getMassUnitAttribute()
    {
        return new Mass($this->weight, $this->weight_unit);
    }
}
