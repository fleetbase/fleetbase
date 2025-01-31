<?php

namespace Fleetbase\FleetOps\Exports;

use Fleetbase\FleetOps\Models\Driver;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class DriverExport implements FromCollection, WithHeadings, WithMapping, WithColumnFormatting, ShouldAutoSize
{
    protected array $selections = [];

    public function __construct(array $selections = [])
    {
        $this->selections = $selections;
    }

    public function map($driver): array
    {
        return [
            $driver->public_id,
            $driver->internal_id,
            $driver->name,
            $driver->vendor_name,
            $driver->vehicle_name,
            $driver->phone,
            $driver->drivers_license_number,
            $driver->country,
            $driver->created_at,
        ];
    }

    public function headings(): array
    {
        return [
            'ID',
            'Internal ID',
            'Name',
            'Vendor',
            'Vehicle',
            'Phone',
            'License #',
            'Country',
            'Date Created',
        ];
    }

    public function columnFormats(): array
    {
        return [
            'F' => '+#',
            'I' => NumberFormat::FORMAT_DATE_DDMMYYYY,
        ];
    }

    /**
     * @return \Illuminate\Support\Collection
     */
    public function collection()
    {
        if ($this->selections) {
            return Driver::where('company_uuid', session('company'))->whereIn('uuid', $this->selections)->get();
        }

        return Driver::where('company_uuid', session('company'))->get();
    }
}
