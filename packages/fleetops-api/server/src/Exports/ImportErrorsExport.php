<?php

namespace Fleetbase\FleetOps\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ImportErrorsExport implements FromCollection, WithHeadings, ShouldAutoSize, WithStyles
{
    protected $errors;
    protected $headings;

    public function __construct(array $errors, array $headings = ['Row', 'Error', 'ID'])
    {
        $this->errors = $errors;
        $this->headings = $headings;
    }

    public function headings(): array
    {
        return $this->headings;
    }

    public function collection(): Collection
    {
        $rows = collect();

        foreach ($this->errors as $error) {
            // Pad or trim error array to match headings count
            $row = array_pad($error, count($this->headings), 'N/A');
            $row = array_slice($row, 0, count($this->headings));
            $rows->push($row);
        }

        return $rows;
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => [
                'font' => [
                    'bold' => true,
                    'color' => ['rgb' => 'FFFFFF'],
                ],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '4472C4'],
                ],
            ],
        ];
    }
} 