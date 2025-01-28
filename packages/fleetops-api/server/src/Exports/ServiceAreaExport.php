<?php

namespace Fleetbase\FleetOps\Exports;

use Fleetbase\FleetOps\Models\ServiceArea;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class ServiceAreaExport implements FromCollection, WithHeadings, WithMapping, WithColumnFormatting, ShouldAutoSize
{
    protected array $selections = [];

    public function __construct(array $selections = [])
    {
        $this->selections = $selections;
    }

    public function map($servicArea): array
    {
        return [
            $servicArea->public_id,
            $servicArea->name,
            $servicArea->zones instanceof Collection ? $servicArea->zones->map(function ($zone) {
                return $zone->name;
            })->join(', ') : null,
            $servicArea->status,
            $servicArea->created_at,
        ];
    }

    public function headings(): array
    {
        return [
            'ID',
            'Name',
            'Zones',
            'Status',
            'Date Created',
        ];
    }

    public function columnFormats(): array
    {
        return [
            'E' => NumberFormat::FORMAT_DATE_DDMMYYYY,
        ];
    }

    /**
     * @return Collection
     */
    public function collection()
    {
        if ($this->selections) {
            return ServiceArea::where('company_uuid', session('company'))->whereIn('uuid', $this->selections)->with(['zones'])->get();
        }

        return ServiceArea::where('company_uuid', session('company'))->with(['zones'])->get();
    }
}
