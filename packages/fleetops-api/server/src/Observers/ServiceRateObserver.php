<?php

namespace Fleetbase\FleetOps\Observers;

use Fleetbase\FleetOps\Models\ServiceRate;
use Fleetbase\FleetOps\Support\Utils;

class ServiceRateObserver
{
    /**
     * Handle the ServiceRate "creating" event.
     *
     * @return void
     */
    public function creating(ServiceRate $serviceRate)
    {
        // convert these attributes to numbers only
        $toNumbers = ['base_fee', 'per_km_flat_rate_fee', 'peak_hours_flat_fee', 'peak_hours_percent', 'cod_flat_fee', 'cod_percent'];

        // convert to numbers for all attributes above
        foreach ($toNumbers as $attribute) {
            if (isset($serviceRate->{$attribute})) {
                $serviceRate->{$attribute} = Utils::numbersOnly($serviceRate->{$attribute});
            }
        }
    }

    /**
     * Handle the ServiceRate "created" event.
     *
     * @return void
     */
    public function created(ServiceRate $serviceRate)
    {
        $serviceRateFees       = request()->input('serviceRate.rate_fees');
        $serviceRateParcelFees = request()->input('serviceRate.parcel_fees');

        if ($serviceRate->isFixedMeter() || $serviceRate->isPerDrop()) {
            $serviceRate->setServiceRateFees($serviceRateFees);
        }

        if ($serviceRate->isParcelService()) {
            $serviceRate->setServiceRateParcelFees($serviceRateParcelFees);
        }
    }

    /**
     * Handle the ServiceRate "updated" event.
     *
     * @return void
     */
    public function updated(ServiceRate $serviceRate)
    {
        $serviceRateFees       = request()->input('serviceRate.rate_fees');
        $serviceRateParcelFees = request()->input('serviceRate.parcel_fees');

        if ($serviceRate->isFixedMeter() || $serviceRate->isPerDrop()) {
            $serviceRate->setServiceRateFees($serviceRateFees);
        }

        if ($serviceRate->isParcelService()) {
            $serviceRate->setServiceRateParcelFees($serviceRateParcelFees);
        }
    }

    /**
     * Handle the ServiceRate "creating" event.
     *
     * @return void
     */
    public function deleted(ServiceRate $serviceRate)
    {
        $serviceRate->load(['parcelFees', 'rateFees']);

        Utils::deleteModels($serviceRate->parcelFees);
        Utils::deleteModels($serviceRate->rateFees);
    }
}
