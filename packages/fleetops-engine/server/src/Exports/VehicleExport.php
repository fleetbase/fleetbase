<?php

namespace Fleetbase\FleetOps\Exports;

use Fleetbase\FleetOps\Models\Vehicle;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class VehicleExport implements FromCollection, WithHeadings, WithMapping, WithColumnFormatting, ShouldAutoSize
{
    protected array $selections = [];

    public function __construct(array $selections = [])
    {
        $this->selections = $selections;
    }

    public function map($vehicle): array
    {
        return [
            $vehicle->public_id,
            $vehicle->internal_id,
            $vehicle->display_name,
            $vehicle->driver_name,
            $vehicle->make,
            $vehicle->model,
            $vehicle->year,
            $vehicle->created_at,
        ];
    }

    public function headings(): array
    {
        return [
            'ID',
            'Internal ID',
            'Name',
            'Driver Assigned',
            'Make',
            'Model',
            'Year',
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
            return Vehicle::where('company_uuid', session('company'))->whereIn('uuid', $this->selections)->with(['driver'])->get();
        }

        return Vehicle::where('company_uuid', session('company'))->with(['driver'])->get();
    }
}
