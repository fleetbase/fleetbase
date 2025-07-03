<?php

namespace Fleetbase\FleetOps\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class OrderImportErrorsExport implements FromCollection, WithHeadings, ShouldAutoSize, WithStyles
{
    protected $errors;

    public function __construct(array $errors)
    {
        $this->errors = $errors;
    }

    public function headings(): array
    {
        return [
            'Row',
            'Error',
            'Trip ID'
        ];
    }

    public function collection(): Collection
    {
        $rows = collect();
        
        foreach ($this->errors as $error) {
            if (is_array($error) && count($error) >= 3) {
                // If error is already in proper array format [row, message, trip_id]
                $rows->push([
                    $error[0], // Row
                    $error[1], // Error message
                    $error[2]  // Trip ID
                ]);
            } elseif (is_array($error) && count($error) == 2) {
                // If error has only 2 elements [row, message]
                $rows->push([
                    $error[0], // Row
                    $error[1], // Error message
                    'N/A'      // Trip ID
                ]);
            } elseif (is_string($error)) {
                // If error is a string, try to parse it or just add as-is
                $rows->push([
                    'N/A',     // Row
                    $error,    // Error message
                    'N/A'      // Trip ID
                ]);
            } else {
                // Fallback for any other format
                $rows->push([
                    'N/A',
                    is_string($error) ? $error : json_encode($error),
                    'N/A'
                ]);
            }
        }
        
        return $rows;
    }

    public function styles(Worksheet $sheet)
    {
        return [
            // Style the header row
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