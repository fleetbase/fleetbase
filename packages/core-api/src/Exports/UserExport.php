<?php

namespace Fleetbase\Exports;

use Fleetbase\Models\User;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class UserExport implements FromCollection, WithHeadings, WithMapping, WithColumnFormatting, ShouldAutoSize
{
    protected array $selections = [];

    public function __construct(array $selections = [])
    {
        $this->selections = $selections;
    }

    public function map($user): array
    {
        return [
            $user->name,
            $user->company_name,
            $user->email,
            $user->phone,
            $user->country,
            $user->timezone,
            $user->ip_address,
            $user->last_login,
            $user->email_verified_at ? $user->email_verified_at : 'Never',
            $user->created_at,
        ];
    }

    public function headings(): array
    {
        return [
            'Name',
            'Company',
            'Email',
            'Phone',
            'Country',
            'Timezone',
            'IP Address',
            'Last Login',
            'Email Verified At',
            'Date Created',
        ];
    }

    public function columnFormats(): array
    {
        return [
            'D' => '+#',
            'H' => NumberFormat::FORMAT_DATE_DDMMYYYY,
            'I' => NumberFormat::FORMAT_DATE_DDMMYYYY,
            'J' => NumberFormat::FORMAT_DATE_DDMMYYYY,
        ];
    }

    /**
     * @return \Illuminate\Support\Collection
     */
    public function collection()
    {
        if (!empty($this->selections)) {
            return User::where('company_uuid', session('company'))->whereIn('uuid', $this->selections)->get();
        }

        return User::where('company_uuid', session('company'))->get();
    }
}
