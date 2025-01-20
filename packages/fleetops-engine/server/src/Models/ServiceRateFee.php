<?php

namespace Fleetbase\FleetOps\Models;

use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Models\Model;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\TracksApiCredential;

class ServiceRateFee extends Model
{
    use HasUuid;
    use TracksApiCredential;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'service_rate_fees';

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
    protected $fillable = ['_key', 'service_rate_uuid', 'distance', 'distance_unit', 'min', 'max', 'unit', 'fee', 'currency'];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'min'      => 'integer',
        'max'      => 'integer',
        'fee'      => 'integer',
        'distance' => 'integer',
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
        $row['fee']      = Utils::numbersOnly($row['fee'] ?? null);
        $row['distance'] = Utils::numbersOnly($row['distance'] ?? null);
        $row['min']      = Utils::numbersOnly($row['min'] ?? null);
        $row['max']      = Utils::numbersOnly($row['max'] ?? null);

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
     * Set the distance as numbers only.
     *
     * @void
     */
    public function setDistanceAttribute($value)
    {
        $this->attributes['distance'] = Utils::numbersOnly($value);
    }

    public function isWithinMinMax(int $number = 0): bool
    {
        return $number >= $this->min && $number <= $this->max;
    }
}
