<?php

namespace Fleetbase\FleetOps\Models;

use Brick\Geo\IO\GeoJSONReader;
use Fleetbase\Casts\Money;
use Fleetbase\FleetOps\Support\Algo;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Models\Model;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\SendsWebhooks;
use Fleetbase\Traits\TracksApiCredential;
use Illuminate\Support\Facades\DB;

class ServiceRate extends Model
{
    use HasUuid;
    use HasPublicId;
    use TracksApiCredential;
    use SendsWebhooks;
    use HasApiModelBehavior;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'service_rates';

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'service';

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
    protected $fillable = [
        '_key',
        'company_uuid',
        'service_area_uuid',
        'zone_uuid',
        'order_config_uuid',
        'service_name',
        'service_type',
        'per_meter_flat_rate_fee',
        'per_meter_unit',
        'base_fee',
        'algorithm',
        'rate_calculation_method',
        'has_cod_fee',
        'cod_calculation_method',
        'cod_flat_fee',
        'cod_percent',
        'has_peak_hours_fee',
        'peak_hours_calculation_method',
        'peak_hours_flat_fee',
        'peak_hours_percent',
        'peak_hours_start',
        'peak_hours_end',
        'currency',
        'duration_terms',
        'estimated_days',
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'base_fee'                => Money::class,
        'per_meter_flat_rate_fee' => Money::class,
        'cod_flat_fee'            => Money::class,
        'peak_hours_flat_fee'     => Money::class,
    ];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = ['service_area_name', 'zone_name'];

    /**
     * The attributes excluded from the model's JSON form.
     *
     * @var array
     */
    protected $hidden = ['serviceArea', 'zone'];

    /**
     * Attributes that is filterable on this model.
     *
     * @var array
     */
    protected $filterParams = [];

    /**
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function rateFees()
    {
        return $this->hasMany(ServiceRateFee::class);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function parcelFees()
    {
        return $this->hasMany(ServiceRateParcelFee::class);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function orderConfig()
    {
        return $this->belongsTo(OrderConfig::class)->withTrashed();
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function serviceArea()
    {
        return $this->belongsTo(ServiceArea::class)->whereNull('deleted_at');
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function zone()
    {
        return $this->belongsTo(Zone::class);
    }

    /**
     * Get the service area name attribute.
     */
    public function getServiceAreaNameAttribute(): ?string
    {
        return data_get($this, 'serviceArea.name');
    }

    /**
     * Get the zone name attribute.
     */
    public function getZoneNameAttribute(): ?string
    {
        return data_get($this, 'zone.name');
    }

    /**
     * Set the number of estimated days for the service to complete.
     *
     * @param int $estimatedDays
     *
     * @return void
     */
    public function setEstimatedDaysAttribute($estimatedDays = 0)
    {
        $this->attributes['estimated_days'] = $estimatedDays ?? 0;
    }

    /**
     * Check if the rate calculation method matches the given method.
     *
     * @param string $method
     */
    public function isRateCalculationMethod($method): bool
    {
        return $this->rate_calculation_method === $method;
    }

    /**
     * Check if the rate calculation method is "fixed_meter".
     */
    public function isFixedMeter(): bool
    {
        return $this->rate_calculation_method === 'fixed_meter';
    }

    /**
     * Check if the rate calculation method is "per_meter".
     */
    public function isPerMeter(): bool
    {
        return $this->rate_calculation_method === 'per_meter';
    }

    /**
     * Check if the rate calculation method is "per_drop".
     */
    public function isPerDrop(): bool
    {
        return $this->rate_calculation_method === 'per_drop';
    }

    /**
     * Check if the rate calculation method is "algo".
     */
    public function isAlgorithm(): bool
    {
        return $this->rate_calculation_method === 'algo';
    }

    /**
     * Check if the service type is "parcel".
     */
    public function isParcelService(): bool
    {
        return $this->service_type === 'parcel';
    }

    /**
     * Check if the object has a peak hours fee.
     */
    public function hasPeakHoursFee(): bool
    {
        return (bool) $this->has_peak_hours_fee;
    }

    /**
     * Check if the current time is within peak hours.
     */
    public function isWithinPeakHours(): bool
    {
        $currentTime = strtotime(date('H:i'));
        $startTime   = strtotime($this->peak_hours_start);
        $endTime     = strtotime($this->peak_hours_end);

        return $currentTime >= $startTime && $currentTime <= $endTime;
    }

    /**
     * Check if the peak hours calculation method is "flat".
     */
    public function hasPeakHoursFlatFee(): bool
    {
        return $this->peak_hours_calculation_method === 'flat';
    }

    /**
     * Check if the peak hours calculation method is "percentage".
     */
    public function hasPeakHoursPercentageFee(): bool
    {
        return $this->peak_hours_calculation_method === 'percentage';
    }

    /**
     * Check if the object has a COD fee.
     */
    public function hasCodFee(): bool
    {
        return (bool) $this->has_cod_fee;
    }

    /**
     * Check if the COD calculation method is "flat".
     */
    public function hasCodFlatFee(): bool
    {
        return $this->cod_calculation_method === 'flat';
    }

    /**
     * Check if the COD calculation method is "percentage".
     */
    public function hasCodPercentageFee(): bool
    {
        return $this->cod_calculation_method === 'percentage';
    }

    /**
     * Check if the object has a related zone.
     */
    public function hasZone(): bool
    {
        return $this->loadMissing('zone')->zone instanceof Zone;
    }

    /**
     * Check if the object has a related service area.
     */
    public function hasServiceArea(): bool
    {
        return $this->loadMissing('serviceArea')->serviceArea instanceof ServiceArea;
    }

    /**
     * Set the service rate fees for the current object.
     *
     * @param array|null $serviceRateFees an optional array of service rate fees
     *
     * @return $this
     */
    public function setServiceRateFees(?array $serviceRateFees = [])
    {
        if (!$serviceRateFees) {
            return $this;
        }

        $iterate = count($serviceRateFees);

        for ($i = 0; $i < $iterate; $i++) {
            // if already has uuid then we just update the record and remove from insert array
            if (!empty($serviceRateFees[$i]['uuid'])) {
                $id                   = $serviceRateFees[$i]['uuid'];
                $updateableAttributes = collect($serviceRateFees[$i])->except(['uuid', 'created_at', 'updated_at'])->toArray();

                if ($updateableAttributes) {
                    ServiceRateFee::where('uuid', $id)->update($updateableAttributes);
                }

                unset($serviceRateFees[$i]);
                continue;
            }

            $serviceRateFees[$i]['service_rate_uuid'] = $this->uuid;
        }

        $serviceRateFees = collect($serviceRateFees)->filter()->values()->toArray();
        ServiceRateFee::bulkInsert($serviceRateFees);

        return $this;
    }

    /**
     * Set the service rate parcel fees for the current object.
     *
     * @param array|null $serviceRateParcelFees an optional array of service rate parcel fees
     *
     * @return $this
     */
    public function setServiceRateParcelFees(?array $serviceRateParcelFees = [])
    {
        if (!$serviceRateParcelFees) {
            return $this;
        }

        $iterate = count($serviceRateParcelFees);

        for ($i = 0; $i < $iterate; $i++) {
            // if already has uuid then we just update the record and remove from insert array
            if (isset($serviceRateParcelFees[$i]['uuid'])) {
                $id                   = $serviceRateParcelFees[$i]['uuid'];
                $updateableAttributes = collect($serviceRateParcelFees[$i])->except(['uuid', 'created_at', 'updated_at'])->toArray();

                if ($updateableAttributes) {
                    ServiceRateParcelFee::where('uuid', $id)->update($updateableAttributes);
                }

                unset($serviceRateParcelFees[$i]);
                continue;
            }

            $serviceRateParcelFees[$i]['service_rate_uuid'] = $this->uuid;
        }

        $serviceRateParcelFees = collect($serviceRateParcelFees)->filter()->values()->toArray();
        ServiceRateParcelFee::bulkInsert($serviceRateParcelFees);

        return $this;
    }

    /**
     * Get the service rates applicable for the given waypoints.
     *
     * @param array         $waypoints     an array of waypoints to check against service areas and zones
     * @param \Closure|null $queryCallback an optional closure to modify the service rates query
     *
     * @return array an array of applicable service rates
     */
    public static function getServicableForWaypoints($waypoints = [], ?\Closure $queryCallback = null): array
    {
        $reader                 = new GeoJSONReader();
        $applicableServiceRates = [];
        $serviceRatesQuery      = static::with(['zone', 'serviceArea']);

        if (is_callable($queryCallback)) {
            $queryCallback($serviceRatesQuery);
        }

        // get service rates
        $serviceRates = $serviceRatesQuery->get();

        foreach ($serviceRates as $serviceRate) {
            if ($serviceRate->hasServiceArea()) {
                if (Utils::exists($serviceRate, 'serviceArea.border')) {
                    // make sure all waypoints fall within the service area
                    foreach ($serviceRate->serviceArea->border as $polygon) {
                        $polygon = $reader->read($polygon->toJson());

                        foreach ($waypoints as $waypoint) {
                            if (!$polygon->contains($waypoint)) {
                                // waypoint outside of service area, not applicable to route
                                continue;
                            }
                        }
                    }
                }
            }

            if ($serviceRate->hasZone()) {
                // make sure all waypoints fall within the service area
                if (Utils::exists($serviceRate, 'zone.border')) {
                    foreach ($serviceRate->zone->border as $polygon) {
                        $polygon = $reader->read($polygon->toJson());

                        foreach ($waypoints as $waypoint) {
                            if (!$polygon->contains($waypoint)) {
                                // waypoint outside of zone, not applicable to route
                                continue;
                            }
                        }
                    }
                }
            }

            $applicableServiceRates[] = $serviceRate;
        }

        return $applicableServiceRates;
    }

    /**
     * Get the service rates applicable for the given places based on service type and currency.
     *
     * @param array         $places        an array of places to check against service areas and zones
     * @param string|null   $service       an optional service type to filter service rates
     * @param string|null   $currency      an optional currency to filter service rates
     * @param \Closure|null $queryCallback an optional closure to modify the service rates query
     *
     * @return array an array of applicable service rates
     */
    public static function getServicableForPlaces($places = [], $service = null, $currency = null, ?\Closure $queryCallback = null): array
    {
        $reader                 = new GeoJSONReader();
        $applicableServiceRates = [];
        $serviceRatesQuery      = static::with(['zone', 'serviceArea', 'rateFees', 'parcelFees']);

        if ($currency) {
            $serviceRatesQuery->where(DB::raw('lower(currency)'), strtolower($currency));
        }

        if ($service) {
            $serviceRatesQuery->where('service_type', $service);
        }

        if (is_callable($queryCallback)) {
            $queryCallback($serviceRatesQuery);
        }

        $serviceRates = $serviceRatesQuery->get();

        $waypoints = collect($places)->map(function ($place) {
            $place = Place::createFromMixed($place);

            if ($place instanceof Place) {
                return $place->getLocationAsPoint();
            }
        });

        foreach ($serviceRates as $serviceRate) {
            if ($serviceRate->hasServiceArea()) {
                // make sure all waypoints fall within the service area
                foreach ($serviceRate->serviceArea->border as $polygon) {
                    $polygon = $reader->read($polygon->toJson());

                    foreach ($waypoints as $waypoint) {
                        if (!$polygon->contains($waypoint)) {
                            // waypoint outside of service area, not applicable to route
                            continue;
                        }
                    }
                }
            }

            if ($serviceRate->hasZone()) {
                // make sure all waypoints fall within the service area
                foreach ($serviceRate->zone->border as $polygon) {
                    $polygon = $reader->read($polygon->toJson());

                    foreach ($waypoints as $waypoint) {
                        if (!$polygon->contains($waypoint)) {
                            // waypoint outside of zone, not applicable to route
                            continue;
                        }
                    }
                }
            }

            $applicableServiceRates[] = $serviceRate;
        }

        return $applicableServiceRates;
    }

    /**
     * Generate a quote for a given pickup and dropoff point and entities.
     *
     * @param string $pickupPoint  the coordinates of the pickup point
     * @param string $dropoffPoint the coordinates of the dropoff point
     * @param array  $entities     an array of entities to be considered for the quote
     *
     * @return mixed the calculated quote based on the preliminary data
     */
    public function pointQuote($pickupPoint, $dropoffPoint, $entities = [])
    {
        $payload           = new Payload();
        $payload->entities = $entities;
        $payload->pickup   = $pickup = new Place([
            'location' => Utils::getPointFromCoordinates($pickupPoint),
        ]);
        $payload->dropoff = $dropoff = new Place([
            'location' => Utils::getPointFromCoordinates($dropoffPoint),
        ]);

        // calculate distance and time
        $matrix = Utils::getDrivingDistanceAndTime($payload->pickup, $payload->dropoff);

        return $this->quoteFromPreliminaryData($entities, [$pickup, $dropoff], $matrix->distance, $matrix->time);
    }

    /**
     * Generate a quote based on the preliminary data provided.
     *
     * @param array     $entities         an array of entities to be considered for the quote
     * @param array     $waypoints        an array of waypoints to be considered for the quote
     * @param int|null  $totalDistance    the total distance for the service in meters
     * @param int|null  $totalTime        the total time for the service in seconds
     * @param bool|null $isCashOnDelivery flag indicating if the payment method is Cash on Delivery
     *
     * @return array an array containing the calculated quote and line items
     */
    public function quoteFromPreliminaryData($entities = [], $waypoints = [], ?int $totalDistance = 0, ?int $totalTime = 0, ?bool $isCashOnDelivery = false)
    {
        $lines    = collect();
        $subTotal = data_get($this, 'base_fee', 0);

        $lines->push([
            'details'          => 'Base Fee',
            'raw_amount'       => $subTotal,
            'amount'           => Utils::numbersOnly($subTotal),
            'formatted_amount' => Utils::moneyFormat($subTotal, $this->currency),
            'currency'         => $this->currency,
            'code'             => 'BASE_FEE',
        ]);

        if ($this->isFixedMeter()) {
            $distanceFee = $this->findServiceRateFeeByDistance($totalDistance);

            if ($distanceFee) {
                $subTotal += Utils::numbersOnly($distanceFee->fee);

                $lines->push([
                    'details'          => 'Service Fee',
                    'raw_amount'       => $distanceFee->fee,
                    'amount'           => Utils::numbersOnly($distanceFee->fee),
                    'formatted_amount' => Utils::moneyFormat($distanceFee->fee, $this->currency),
                    'currency'         => $this->currency,
                    'code'             => 'BASE_FEE',
                ]);
            }
        }

        if ($this->isPerDrop()) {
            $rateFee = $this->findServiceRateFeeByMinMax(count($waypoints));

            if ($rateFee) {
                $subTotal += Utils::numbersOnly($rateFee->fee);

                $lines->push([
                    'details'          => 'Service Fee',
                    'amount'           => Utils::numbersOnly($rateFee->fee),
                    'formatted_amount' => Utils::moneyFormat($rateFee->fee, $this->currency),
                    'currency'         => $this->currency,
                    'code'             => 'BASE_FEE',
                ]);
            }
        }

        if ($this->isPerMeter()) {
            $perMeterDistance = $this->per_meter_unit === 'km' ? round($totalDistance / 1000) : $totalDistance;
            $rateFee          = $perMeterDistance * $this->per_meter_flat_rate_fee;
            $subTotal += $rateFee;

            $lines->push([
                'details'          => 'Service Fee',
                'amount'           => Utils::numbersOnly($rateFee),
                'formatted_amount' => Utils::moneyFormat($rateFee, $this->currency),
                'currency'         => $this->currency,
                'code'             => 'BASE_FEE',
            ]);
        }

        if ($this->isAlgorithm()) {
            $rateFee = Algo::exec(
                $this->algorithm,
                [
                    'distance' => $totalDistance,
                    'time'     => $totalTime,
                ],
                true
            );

            $subTotal += Utils::numbersOnly($rateFee);

            $lines->push([
                'details'          => 'Service Fee',
                'amount'           => Utils::numbersOnly($rateFee),
                'formatted_amount' => Utils::moneyFormat($rateFee, $this->currency),
                'currency'         => $this->currency,
                'code'             => 'BASE_FEE',
            ]);
        }

        // if parcel fee's add into the base rate
        if ($this->isParcelService()) {
            $parcels = collect($entities)->where('type', 'parcel')->all();

            foreach ($parcels as $parcel) {
                // convert all length units to cm and weight units to grams
                $length           = $parcel->length_unit->toUnit('cm');
                $width            = $parcel->width_unit->toUnit('cm');
                $height           = $parcel->height_unit->toUnit('cm');
                $weight           = $parcel->mass_unit->toUnit('g');
                $serviceParcelFee = null;

                // iterate through parcel fees to find where it fits
                foreach ($this->parcelFees as $parcelFee) {
                    $feeLength = $parcelFee->length_unit->toUnit('cm');
                    $feeWidth  = $parcelFee->width_unit->toUnit('cm');
                    $feeHeight = $parcelFee->height_unit->toUnit('cm');
                    $feeWeight = $parcelFee->mass_unit->toUnit('g');

                    $previousParcelFee = $parcelFee;

                    if ($length > $feeLength && $width > $feeWidth && $height > $feeHeight && $weight > $feeWeight) {
                        continue;
                    } elseif ($length < $feeLength && $width < $feeWidth && $height < $feeHeight && $weight < $feeWeight) {
                        $serviceParcelFee = $previousParcelFee;
                    } else {
                        $serviceParcelFee = $parcelFee;
                    }
                }

                // if no distance fee use the last
                if ($serviceParcelFee === null) {
                    $serviceParcelFee = $this->parcelFees->sortByDesc()->first();
                }

                $subTotal += $serviceParcelFee->fee;

                $lines->push([
                    'details'          => $serviceParcelFee->name . ' parcel fee',
                    'amount'           => Utils::numbersOnly($serviceParcelFee->fee),
                    'formatted_amount' => Utils::moneyFormat($serviceParcelFee->fee, $this->currency),
                    'currency'         => $this->currency,
                    'code'             => 'PARCEL_FEE',
                ]);
            }
        }

        // set the base rate
        $baseRate = $subTotal;

        // if the rate has cod add this into the quote price
        if ($this->hasCodFee() && $isCashOnDelivery) {
            if ($this->hasCodFlatFee()) {
                $subTotal += $codFee = $this->cod_flat_fee;
            } elseif ($this->hasCodPercentageFee()) {
                $subTotal += $codFee = Utils::calculatePercentage($this->cod_percent, $baseRate);
            }

            $lines->push([
                'details'          => 'Cash on delivery fee',
                'amount'           => Utils::numbersOnly($codFee),
                'formatted_amount' => Utils::moneyFormat($codFee, $this->currency),
                'currency'         => $this->currency,
                'code'             => 'COD_FEE',
            ]);
        }

        // if this has peak hour fee add in
        if ($this->hasPeakHoursFee() && $this->isWithinPeakHours()) {
            if ($this->hasPeakHoursFlatFee()) {
                $subTotal += $peakHoursFee = $this->peak_hours_flat_fee;
            } elseif ($this->hasPeakHoursPercentageFee()) {
                $subTotal += $peakHoursFee = Utils::calculatePercentage($this->peak_hours_percent, $baseRate);
            }

            $lines->push([
                'details'          => 'Peak hours fee',
                'amount'           => Utils::numbersOnly($peakHoursFee),
                'formatted_amount' => Utils::moneyFormat($peakHoursFee, $this->currency),
                'currency'         => $this->currency,
                'code'             => 'PEAK_HOUR_FEE',
            ]);
        }

        return [$subTotal, $lines];
    }

    /**
     * Generate a quote based on the payload provided.
     *
     * @param Payload $payload an instance of the Payload class containing all necessary data for the quote calculation
     *
     * @return array an array containing the calculated quote and line items
     */
    public function quote(Payload $payload)
    {
        $lines    = collect();
        $subTotal = $this->base_fee ?? 0;

        $lines->push([
            'details'          => 'Base Fee',
            'amount'           => Utils::numbersOnly($subTotal),
            'formatted_amount' => Utils::moneyFormat($subTotal, $this->currency),
            'currency'         => $this->currency,
            'code'             => 'BASE_FEE',
        ]);

        // Prepare all waypoints and origin and destination
        $waypoints    = $payload->getAllStops();
        $origin       = $waypoints->first();
        $destinations = $waypoints->skip(1)->toArray();

        // Lookup distance matrix for total distance and time
        $distanceMatrix = Utils::distanceMatrix([$origin], $destinations);
        $totalDistance  = $distanceMatrix->distance;
        $totalTime      = $distanceMatrix->time;

        if ($this->isFixedMeter()) {
            $distanceFee = $this->findServiceRateFeeByDistance($totalDistance);

            if ($distanceFee) {
                $subTotal += Utils::numbersOnly($distanceFee->fee);

                $lines->push([
                    'details'          => 'Service Fee',
                    'amount'           => Utils::numbersOnly($distanceFee->fee),
                    'formatted_amount' => Utils::moneyFormat($distanceFee->fee, $this->currency),
                    'currency'         => $this->currency,
                    'code'             => 'BASE_FEE',
                ]);
            }
        }

        if ($this->isPerDrop()) {
            $rateFee = $this->findServiceRateFeeByMinMax(count($waypoints));

            if ($rateFee) {
                $subTotal += Utils::numbersOnly($rateFee->fee);

                $lines->push([
                    'details'          => 'Service Fee',
                    'amount'           => Utils::numbersOnly($rateFee->fee),
                    'formatted_amount' => Utils::moneyFormat($rateFee->fee, $this->currency),
                    'currency'         => $this->currency,
                    'code'             => 'BASE_FEE',
                ]);
            }
        }

        if ($this->isPerMeter()) {
            $perMeterDistance = $this->per_meter_unit === 'km' ? round($totalDistance / 1000) : $totalDistance;
            $rateFee          = $perMeterDistance * $this->per_meter_flat_rate_fee;
            $subTotal += $rateFee;

            $lines->push([
                'details'          => 'Service Fee',
                'amount'           => Utils::numbersOnly($rateFee),
                'formatted_amount' => Utils::moneyFormat($rateFee, $this->currency),
                'currency'         => $this->currency,
                'code'             => 'BASE_FEE',
            ]);
        }

        if ($this->isAlgorithm()) {
            $rateFee = Algo::exec(
                $this->algorithm,
                [
                    'distance' => $totalDistance,
                    'time'     => $totalTime,
                ],
                true
            );

            $subTotal += Utils::numbersOnly($rateFee);

            $lines->push([
                'details'          => 'Service Fee',
                'amount'           => Utils::numbersOnly($rateFee),
                'formatted_amount' => Utils::moneyFormat($rateFee, $this->currency),
                'currency'         => $this->currency,
                'code'             => 'BASE_FEE',
            ]);
        }

        // if parcel fee's add into the base rate
        if ($this->isParcelService()) {
            $parcels = $payload->entities->where('type', 'parcel')->all();

            foreach ($parcels as $parcel) {
                // convert all length units to cm and weight units to grams
                $length           = $parcel->length_unit->toUnit('cm');
                $width            = $parcel->width_unit->toUnit('cm');
                $height           = $parcel->height_unit->toUnit('cm');
                $weight           = $parcel->mass_unit->toUnit('g');
                $serviceParcelFee = null;

                // iterate through parcel fees to find where it fits
                foreach ($this->parcelFees as $parcelFee) {
                    $feeLength = $parcelFee->length_unit->toUnit('cm');
                    $feeWidth  = $parcelFee->width_unit->toUnit('cm');
                    $feeHeight = $parcelFee->height_unit->toUnit('cm');
                    $feeWeight = $parcelFee->mass_unit->toUnit('g');

                    $previousParcelFee = $parcelFee;

                    if ($length > $feeLength && $width > $feeWidth && $height > $feeHeight && $weight > $feeWeight) {
                        continue;
                    } elseif ($length < $feeLength && $width < $feeWidth && $height < $feeHeight && $weight < $feeWeight) {
                        $serviceParcelFee = $previousParcelFee;
                    } else {
                        $serviceParcelFee = $parcelFee;
                    }
                }

                // if no distance fee use the last
                if ($serviceParcelFee === null) {
                    $serviceParcelFee = $this->parcelFees->sortByDesc()->first();
                }

                $subTotal += $serviceParcelFee->fee;

                $lines->push([
                    'details'          => $serviceParcelFee->name . ' parcel fee',
                    'amount'           => Utils::numbersOnly($serviceParcelFee->fee),
                    'formatted_amount' => Utils::moneyFormat($serviceParcelFee->fee, $this->currency),
                    'currency'         => $this->currency,
                    'code'             => 'PARCEL_FEE',
                ]);
            }
        }

        // set the base rate
        $baseRate = $subTotal;

        // if the rate has cod add this into the quote price
        if ($this->hasCodFee() && $payload->cod_amount !== null) {
            if ($this->hasCodFlatFee()) {
                $subTotal += $codFee = $this->cod_flat_fee;
            } elseif ($this->hasCodPercentageFee()) {
                $subTotal += $codFee = Utils::calculatePercentage($this->cod_percent, $baseRate);
            }

            $lines->push([
                'details'          => 'Cash on delivery fee',
                'amount'           => Utils::numbersOnly($codFee),
                'formatted_amount' => Utils::moneyFormat($codFee, $this->currency),
                'currency'         => $this->currency,
                'code'             => 'COD_FEE',
            ]);
        }

        // if this has peak hour fee add in
        if ($this->hasPeakHoursFee() && $this->isWithinPeakHours()) {
            if ($this->hasPeakHoursFlatFee()) {
                $subTotal += $peakHoursFee = $this->peak_hours_flat_fee;
            } elseif ($this->hasPeakHoursPercentageFee()) {
                $subTotal += $peakHoursFee = Utils::calculatePercentage($this->peak_hours_percent, $baseRate);
            }

            $lines->push([
                'details'          => 'Peak hours fee',
                'amount'           => Utils::numbersOnly($peakHoursFee),
                'formatted_amount' => Utils::moneyFormat($peakHoursFee, $this->currency),
                'currency'         => $this->currency,
                'code'             => 'PEAK_HOUR_FEE',
            ]);
        }

        return [$subTotal, $lines];
    }

    /**
     * Find the ServiceRateFee based on the total distance.
     *
     * @param int $totalDistance the total distance in meters
     *
     * @return ServiceRateFee|null the ServiceRateFee instance if found, otherwise null
     */
    public function findServiceRateFeeByDistance(int $totalDistance): ?ServiceRateFee
    {
        $this->load('rateFees');

        $distanceInKms = round($totalDistance / 1000);
        $distanceFee   = null;

        foreach ($this->rateFees as $rateFee) {
            $previousRateFee = $rateFee;

            if ($distanceInKms > $rateFee->distance) {
                continue;
            } elseif ($rateFee->distance > $distanceInKms) {
                $distanceFee = $previousRateFee;
            } else {
                $distanceFee = $rateFee;
            }
        }

        // if no distance fee use the last
        if ($distanceFee === null) {
            $distanceFee = $this->rateFees->sortByDesc('distance')->first();
        }

        return $distanceFee;
    }

    /**
     * Find the ServiceRateFee based on the given number within the min and max range.
     *
     * @param int $number the number to check within the ServiceRateFee's min and max range
     *
     * @return ServiceRateFee|null the ServiceRateFee instance if found, otherwise null
     */
    public function findServiceRateFeeByMinMax(int $number): ?ServiceRateFee
    {
        $this->load('rateFees');

        $serviceRateFee = null;

        foreach ($this->rateFees as $rateFee) {
            if ($rateFee->isWithinMinMax($number)) {
                $serviceRateFee = $rateFee;
                break;
            }
        }

        // if no distance fee use the last
        if ($serviceRateFee === null) {
            $serviceRateFee = $this->rateFees->sortByDesc('max')->first();
        }

        return $serviceRateFee;
    }
}
