<?php

namespace Fleetbase\Exports;

use Fleetbase\Models\Company;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class CompanyExport implements FromCollection, WithHeadings, WithMapping, WithColumnFormatting, ShouldAutoSize
{
    protected array $selections = [];

    public function __construct(array $selections = [])
    {
        $this->selections = $selections;
    }

    public function map($company): array
    {
        return [
            $company->name,
            data_get($company, 'owner.name'),
            data_get($company, 'owner.email'),
            data_get($company, 'owner.phone'),
            $company->companyUsers ? $company->companyUsers->count() : $company->companyUsers()->count(),
            $company->created_at,
        ];
    }

    public function headings(): array
    {
        return [
            'Name',
            'Owner',
            'Email',
            'Phone',
            'Users Count',
            'Created',
        ];
    }

    public function columnFormats(): array
    {
        return [
            'D' => '+#',
            'F' => NumberFormat::FORMAT_DATE_DDMMYYYY,
        ];
    }

    /**
     * @return \Illuminate\Support\Collection
     */
    public function collection()
    {
        if ($this->selections) {
            return Company::whereIn('uuid', $this->selections)->with(['companyUsers'])->get();
        }

        return Company::with(['companyUsers'])->get();
    }
}
