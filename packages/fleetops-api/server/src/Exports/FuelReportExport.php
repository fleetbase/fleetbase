<?php

namespace Fleetbase\FleetOps\Exports;

use Fleetbase\FleetOps\Models\FuelReport;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class FuelReportExport implements FromCollection, WithHeadings, WithMapping, WithColumnFormatting, ShouldAutoSize
{
    protected array $selections = [];

    public function __construct(array $selections = [])
    {
        $this->selections = $selections;
    }

    public function map($fuelReport): array
    {
        return [
            $fuelReport->public_id,
            $fuelReport->reporter,
            $fuelReport->driver_name,
            $fuelReport->vehicle_name,
            $fuelReport->status,
            $fuelReport->volume,
            $fuelReport->odometer,
            $fuelReport->created_at,
        ];
    }

    public function headings(): array
    {
        return [
            'ID',
            'Reporter',
            'Driver',
            'Vehicle',
            'Status',
            'Volume',
            'Odometer',
            'Date Created',
        ];
    }

    public function columnFormats(): array
    {
        return [
            'H' => NumberFormat::FORMAT_DATE_DDMMYYYY,
        ];
    }

    /**
     * @return \Illuminate\Support\Collection
     */
    public function collection()
    {
        if ($this->selections) {
            return FuelReport::where('company_uuid', session('company'))
                ->whereIn('uuid', $this->selections)
                ->get();
        }

        return FuelReport::where('company_uuid', session('company'))->get();
    }
}
