<?php

namespace Fleetbase\FleetOps\Exports;

use Fleetbase\FleetOps\Models\Contact;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class ContactExport implements FromCollection, WithHeadings, WithMapping, WithColumnFormatting, ShouldAutoSize
{
    protected array $selections = [];

    public function __construct(array $selections = [])
    {
        $this->selections = $selections;
    }

    public function map($contact): array
    {
        return [
            $contact->public_id,
            $contact->internal_id,
            $contact->name,
            $contact->address ? $contact->address->address : null,
            $contact->email,
            $contact->phone,
            $contact->created_at,
        ];
    }

    public function headings(): array
    {
        return [
            'ID',
            'Internal ID',
            'Name',
            'Address',
            'Email',
            'Phone',
            'Date Created',
        ];
    }

    public function columnFormats(): array
    {
        return [
            'F' => '+#',
            'G' => NumberFormat::FORMAT_DATE_DDMMYYYY,
        ];
    }

    /**
     * @return \Illuminate\Support\Collection
     */
    public function collection()
    {
        if ($this->selections) {
            return Contact::where('company_uuid', session('company'))->whereIn('uuid', $this->selections)->get();
        }

        return Contact::where('company_uuid', session('company'))->get();
    }
}
