<?php

namespace Fleetbase\FleetOps\Exports;

use Fleetbase\FleetOps\Models\Issue;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class IssueExport implements FromCollection, WithHeadings, WithMapping, WithColumnFormatting, ShouldAutoSize
{
    protected array $selections = [];

    public function __construct(array $selections = [])
    {
        $this->selections = $selections;
    }

    public function map($issue): array
    {
        return [
            $issue->public_id,
            $issue->priority,
            $issue->type,
            $issue->category,
            $issue->reporter_name,
            $issue->assignee_name,
            $issue->driver_name,
            $issue->vehicle_name,
            $issue->status,
            $issue->created_at,
        ];
    }

    public function headings(): array
    {
        return [
            'ID',
            'Priority',
            'Type',
            'Category',
            'Reporter',
            'Assignee',
            'Driver',
            'Vehicle',
            'Status',
            'Date Created',
        ];
    }

    public function columnFormats(): array
    {
        return [
            'J' => NumberFormat::FORMAT_DATE_DDMMYYYY,
        ];
    }

    /**
     * @return \Illuminate\Support\Collection
     */
    public function collection()
    {
        if (!empty($this->selections)) {
            return Issue::where('company_uuid', session('company'))->whereIn('uuid', $this->selections)->get();
        }

        return Issue::where('company_uuid', session('company'))->get();
    }
}
