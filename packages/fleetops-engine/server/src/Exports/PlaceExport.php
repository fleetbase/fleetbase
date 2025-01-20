<?php

namespace Fleetbase\FleetOps\Exports;

use Fleetbase\FleetOps\Models\Place;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class PlaceExport implements FromCollection, WithHeadings, WithMapping, WithColumnFormatting, ShouldAutoSize
{
    protected array $selections = [];

    public function __construct(array $selections = [])
    {
        $this->selections = $selections;
    }

    public function map($place): array
    {
        return [
            $place->public_id,
            $place->name,
            $place->phone,
            strtoupper($place->address),
            strtoupper($place->city),
            $place->postal_code,
            strtoupper($place->country_name),
            $place->created_at,
        ];
    }

    public function headings(): array
    {
        return [
            'ID',
            'Name',
            'Phone',
            'Address',
            'City',
            'Postal Code',
            'Country',
            'Date Created',
        ];
    }

    public function columnFormats(): array
    {
        return [
            'C' => '+#',
            'F' => NumberFormat::FORMAT_GENERAL,
            'H' => NumberFormat::FORMAT_DATE_DDMMYYYY,
        ];
    }

    /**
     * @return \Illuminate\Support\Collection
     */
    public function collection()
    {
        if ($this->selections) {
            return Place::where('company_uuid', session('company'))->whereIn('uuid', $this->selections)->get();
        }

        return Place::where('company_uuid', session('company'))->get();
    }
}
