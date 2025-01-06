<?php

namespace App\Models;

// use Fleetbase\FleetOps\Models\FuelReport as BaseFuelReport;

use Fleetbase\Models\Model;
use Fleetbase\Casts\Json;
use Fleetbase\FleetOps\Casts\Point;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\LaravelMysqlSpatial\Eloquent\SpatialTrait;
use Fleetbase\Models\User;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\Searchable;
use Fleetbase\Traits\TracksApiCredential;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Fleetbase\FleetOps\Models\Vehicle;
use Fleetbase\FleetOps\Models\Driver;

class FuelReport extends Model
{
    use HasUuid;
    use TracksApiCredential;
    use HasPublicId;
    use HasApiModelBehavior;
    use SpatialTrait;
    use Searchable;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'fuel_reports';

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'fuel_report';

    /**
     * These attributes that can be queried.
     *
     * @var array
     */
    protected $searchableColumns = ['report', 'vehicle.name', 'driver.name'];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'company_uuid',
        'driver_uuid',
        'vehicle_uuid',
        'reported_by_uuid',
        'report',
        'odometer',
        'location',
        'amount',
        'currency',
        'volume',
        'metric_unit',
        'meta',
        'status',
        'report_type',      // New field
        'payment_method',   // New field
        'card_type'    
    ];

    /**
     * The attributes that are spatial columns.
     *
     * @var array
     */
    protected $spatialFields = ['location'];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'location' => Point::class,
        'meta'     => Json::class,
    ];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = ['vehicle_name', 'driver_name', 'reporter_name'];

    /**
     * The attributes excluded from the model's JSON form.
     *
     * @var array
     */
    protected $hidden = ['driver', 'vehicle'];

    /**
     * Filterable attributes/parameters.
     *
     * @var array
     */
    protected $filterParams = ['type', 'status', 'reporter'];

    /**
     * Set the parcel fee as only numbers.
     *
     * @void
     */
    public function setAmountAttribute($value)
    {
        $this->attributes['amount'] = Utils::numbersOnly($value);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function driver()
    {
        return $this->belongsTo(Driver::class)->without(['vehicle']);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class)->without(['driver']);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function reportedBy()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function reporter()
    {
        return $this->belongsTo(User::class, 'reported_by_uuid');
    }

    /**
     * Get the driver's name assigned to vehicle.
     *
     * @var Model
     */
    public function getDriverNameAttribute()
    {
        return data_get($this, 'driver.name');
    }

    /**
     * Get the vehicless name.
     *
     * @var Model
     */
    public function getVehicleNameAttribute()
    {
        return data_get($this, 'vehicle.display_name');
    }

    /**
     * Get the vehicless name.
     *
     * @var Model
     */
    public function getReporterNameAttribute()
    {
        return data_get($this, 'reportedBy.name');
    }

    public function files(): HasMany
    {
        return $this->hasMany(\Fleetbase\Models\File::class, 'subject_uuid')->latest();
    }
    public static function createFromImport(array $row, bool $saveInstance = false): FuelReport
    {
        // Filter array for null key values
        $row = array_filter($row);

        // Get fuelReport columns
        $reporterName  = Utils::or($row, ['reporter', 'reporter_name', 'reported_by', 'reported_by_name']);
        $report        = Utils::or($row, ['report', 'fuel_report', 'content', 'info']);
        $odometer      = Utils::or($row, ['odometer', 'usage']);
        $amount        = Utils::or($row, ['amount', 'cost', 'price']);
        $currency      = Utils::or($row, ['currency', 'amount_currency']);
        $volume        = Utils::or($row, ['volume', 'fuel_amount', 'fuel_volume', 'gas_amount', 'gas_volume']);
        $metricUnit    = Utils::or($row, ['volume_unit', 'fuel_unit', 'metric', 'metric_unit', 'gas_unit'], 'l');
        $driverName    = Utils::or($row, ['driver', 'driver_name']);
        $vehicleName   = Utils::or($row, ['vehicle', 'vehicle_name']);
        $status        = Utils::or($row, ['status', 'fuel_status'], 'pending');

        // Resolve relations
        $reporter = is_string($reporterName) ? User::whereRaw('lower(name) like ?', ['%' . strtolower($reporterName) . '%'])->first() : null;
        $driver   = is_string($driverName) ? Driver::findByIdentifier($driverName) : null;
        $vehicle  = is_string($vehicleName) ? Vehicle::findByName($vehicleName) : null;

        // Create fuelReport
        $fuelReport = new static([
            'company_uuid'    => session('company'),
            'report'          => $report,
            'odometer'        => $odometer,
            'amount'          => Utils::numbersOnly($amount),
            'currency'        => $currency,
            'volume'          => $volume,
            'metric_unit'     => $metricUnit,
            'status'          => $status,
            'location'        => Utils::parsePointToWkt(new Point(0, 0)),
        ]);

        if ($reporter) {
            $fuelReport->reported_by_uuid = $reporter->uuid;
        }

        if ($driver) {
            $fuelReport->driver_uuid = $driver->uuid;
        }

        if ($vehicle) {
            $fuelReport->vehicle_uuid = $vehicle->uuid;
        }

        if ($saveInstance === true) {
            $fuelReport->save();
        }

        return $fuelReport;
    }
}
