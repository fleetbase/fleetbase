<?php

namespace Fleetbase\FleetOps\Support;

use Illuminate\Support\Str;

class VehicleData
{
    public static function getMakeModel2015Data(): array
    {
        $json        = file_get_contents(base_path('vendor/fleetbase/fleetops-api/server/data/vehicle_make_model_data_2015.json'));
        $data        = json_decode($json);
        $groupedData = [];

        foreach ($data as $datum) {
            if (!isset($groupedData[$datum->make])) {
                $groupedData[$datum->make] = [];
            }

            $groupedData[$datum->make][] = ['model' => $datum->model, $datum->year];
        }

        return $groupedData;
    }

    public static function parse(string $vehicleName): array
    {
        $vehicleName   = strtolower($vehicleName);
        $data          = static::getMakeModel2015Data();
        $makes         = array_keys($data);
        $resolvedMake  = null;
        $resolvedModel = null;
        $resolvedYear  = null;

        // Parse the string by way of deduction
        // Decuct the make first
        $make = null;
        foreach ($makes as $make) {
            $makeQuery = strtolower($make);
            if (Str::contains($vehicleName, $makeQuery)) {
                $resolvedMake = Str::title($make);
                $vehicleName  = str_replace($makeQuery, '', $vehicleName);
                break;
            }
        }

        // Deduct year
        $resolvedYear = null;
        if (preg_match('/(19|20)\d{2}/', $vehicleName, $matches)) {
            $resolvedYear = $matches[0];
            $vehicleName  = str_replace($resolvedYear, '', $vehicleName);
        }

        // Attempt to resolve model
        if (isset($data[$make]) && is_array($data[$make])) {
            $models = $data[$make];
            foreach ($models as $model) {
                $modelName  = $model['model'];
                $modelQuery = strtolower($modelName);
                if (Str::contains($vehicleName, $modelQuery)) {
                    $resolvedModel = $modelName;
                    break;
                }
            }
        }

        // If no resolved model, model name becomes remaining string of vehicle name
        if (!$resolvedModel) {
            $resolvedModel = Str::title(trim($vehicleName));
        }

        return ['make' => $resolvedMake, 'model' => $resolvedModel, 'year' => $resolvedYear];
    }
}
