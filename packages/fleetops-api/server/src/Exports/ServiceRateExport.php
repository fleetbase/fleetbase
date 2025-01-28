<?php

namespace Fleetbase\FleetOps\Exports;

use Fleetbase\FleetOps\Models\ServiceRate;
use Fleetbase\FleetOps\Support\Utils;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class ServiceRateExport implements FromCollection, WithHeadings, WithMapping, WithColumnFormatting, ShouldAutoSize
{
    protected array $selections = [];

    public function __construct(array $selections = [])
    {
        $this->selections = $selections;
    }

    public function map($serviceRate): array
    {
        return [
            $serviceRate->public_id,
            $serviceRate->service_name,
            Str::title($serviceRate->service_type),
            Utils::moneyFormat($serviceRate->base_fee, $serviceRate->currency),
            $serviceRate->rate_calculation_method,
            $serviceRate->service_area_name,
            $serviceRate->zone_name,
            $serviceRate->currency,
            $serviceRate->created_at,
        ];
    }

    public function headings(): array
    {
        return [
            'ID',
            'Service',
            'Type',
            'Base Fee',
            'Calculation Method',
            'Service Area',
            'Zone',
            'Currency',
            'Date Created',
        ];
    }

    public function columnFormats(): array
    {
        return [
            'I' => NumberFormat::FORMAT_DATE_DDMMYYYY,
        ];
    }

    /**
     * @return \Illuminate\Support\Collection
     */
    public function collection()
    {
        if ($this->selections) {
            return ServiceRate::where('company_uuid', session('company'))->whereIn('uuid', $this->selections)->get();
        }

        return ServiceRate::where('company_uuid', session('company'))->get();
    }
}
