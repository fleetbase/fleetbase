<?php

namespace Fleetbase\FleetOps\Exports;

use Fleetbase\FleetOps\Models\Order;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use Carbon\Carbon;

class OrderExportChange implements FromCollection, WithHeadings, ShouldAutoSize, WithEvents
{
    protected array $selections = [];
    protected ?string $filterBy;
    protected ?string $fromDate;
    protected ?string $toDate;
    protected ?string $timezone;
    public function __construct(array $selections = [], ?string $filterBy = null, ?string $fromDate = null, ?string $toDate = null, ?string $timezone = null)
    {
        $this->selections = $selections;
        $this->filterBy = $filterBy;
        $this->fromDate = $fromDate;
        $this->toDate = $toDate;
        $this->timezone = $timezone;
    }

    public function headings(): array
    {
        return [
            // Main headers (row 1)
            ['Block ID', 'Trip ID', 'Load ID', 'Lane', 'Arrival Start Time', 'Driver type', 'Driver(s) use first name and surname', '', 'Tractor', '', '', 'Trailer', '', ''],
            // Sub headers (row 2)
            ['', '', '', '', '', '', 'Driver 1', 'Driver 2 (if team)', 'Vehicle Type', 'License Plate #', 'Country Code', 'Equipment Type', 'Trailer ID', 'Unscheduled Drop (Yes/No)']
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function(AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();

                // Merge cells for main headers
                $sheet->mergeCells('G1:H1'); // Driver(s) use first name and surname
                $sheet->mergeCells('I1:K1'); // Tractor
                $sheet->mergeCells('L1:N1'); // Trailer

                // Style main headers (row 1)
                $sheet->getStyle('A1:N1')->applyFromArray([
                    'font' => ['bold' => true],
                    'fill' => [
                        'fillType' => 'solid',
                        'startColor' => ['rgb' => '70C0E7'] // Light blue/cyan
                    ],
                    'alignment' => ['horizontal' => 'center'],
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                            'color' => ['rgb' => '000000']
                        ]
                    ]
                ]);

                // Style sub headers (row 2)
                $sheet->getStyle('A2:N2')->applyFromArray([
                    'font' => ['bold' => true, 'size' => 9],
                    'fill' => [
                        'fillType' => 'solid',
                        'startColor' => ['rgb' => 'E8F4F8'] // Very light blue
                    ],
                    'alignment' => ['horizontal' => 'center'],
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                            'color' => ['rgb' => '000000']
                        ]
                    ]
                ]);

                // Set row heights
                $sheet->getRowDimension(1)->setRowHeight(20);
                $sheet->getRowDimension(2)->setRowHeight(20);

                // Auto-size columns A to N
                foreach (range('A', 'N') as $column) {
                    $sheet->getColumnDimension($column)->setAutoSize(true);
                }

                // Add border to data rows (starting from A3)
                $lastRow = $sheet->getHighestRow(); // Get last used row
                if ($lastRow >= 3) {
                    $sheet->getStyle("A3:N{$lastRow}")->applyFromArray([
                        'borders' => [
                            'allBorders' => [
                                'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                                'color' => ['rgb' => 'CCCCCC'] // Light gray border
                            ]
                        ]
                    ]);
                }
            }
        ];
    }


    public function collection(): Collection
    {
        $query = Order::where('company_uuid', session('company'))->whereNull('deleted_at');

        if (!empty($this->selections)) {
            $query = $query->whereIn('uuid', $this->selections);
        }
        $filterMap = [
            'start_date'  => 'scheduled_at',
            'created_at'  => 'created_at',
        ];
        $timezone = $this->timezone ?? 'UTC';
        if(isset($timezone) && $this->filterBy)
        {
            $column = $filterMap[$this->filterBy] ?? null;
            if ($timezone === 'Asia/Calcutta') 
            {
                $timezone = 'Asia/Kolkata'; // Convert old timezone
            }
            if ($column && $this->fromDate) {
                // Parse fromDate and convert to local timezone
                $fromDateLocal = Carbon::parse($this->fromDate)->setTimezone($timezone);
                $startOfDayUtc = $fromDateLocal->copy()->startOfDay()->setTimezone('UTC');
                
                if ($this->toDate) {
                    // Both fromDate and toDate provided
                    $toDateLocal = Carbon::parse($this->toDate)->setTimezone($timezone);
                    $endOfDayUtc = $toDateLocal->copy()->endOfDay()->setTimezone('UTC');
                    
                    $query->whereBetween($column, [$startOfDayUtc, $endOfDayUtc]);
                    
                } else {
                    // Only fromDate provided - filter for that specific day
                    $endOfDayUtc = $fromDateLocal->copy()->endOfDay()->setTimezone('UTC');
                    
                    $query->whereBetween($column, [$startOfDayUtc, $endOfDayUtc]);
                    
                }
            }
        }
       
        // Apply limit only if no filters are provided
        $hasFilters = !empty($this->selections) || 
                     (isset($this->timezone) && $this->filterBy && $this->fromDate);
        
        if (!$hasFilters) {
            $limit = config('services.order_export_limit', 1000);
            $query->limit($limit);
        } 
       
        $orders = $query->with([
            'trackingNumber',
            'driverAssigned',
            'vehicleAssigned', // Make sure to include vehicle relationship
            'payload.waypoints',
            'routeSegments',
            'fleets',
            'createdBy',
            'updatedBy',
        ])->OrderBy('created_at', 'desc')->get();

        $rows = collect();
        foreach ($orders as $order) {
            // Prepare the shared fields
            $tripId = $order->public_id;
            $blockId = $order->internal_id;
            $driverName = ucwords(strtolower($order->driver_name ?? ''));
            $vehiclePlateNumber = $order->vehicleAssigned?->plate_number ?? '';
            $vehicleType = $order->vehicleAssigned?->type ?? '';
            $startDate = $order->scheduled_at ? 
                         Carbon::parse($order->scheduled_at)
                        ->when($timezone, fn($c) => $c->setTimezone($timezone))
                        ->format('d/m/Y H:i') : '';
            $waypoints = $order->payload?->waypoints;
            $driver_type = $order->driver_type ?? 'SINGLE_DRIVER';

            // Create lane information from waypoints
            $segmentLane = '';
            if ($waypoints instanceof Collection && $waypoints->isEmpty()) {
                $pickupCode = $order->payload->pickup->code ?? '';
                $dropoffCode = $order->payload->dropoff->code ?? '';
                
                // Only create lane if both codes exist
                if (!empty($pickupCode) && !empty($dropoffCode)) {
                    $segmentLane = $pickupCode . '->' . $dropoffCode;
                } elseif (!empty($pickupCode)) {
                    $segmentLane = $pickupCode;
                } elseif (!empty($dropoffCode)) {
                    $segmentLane = $dropoffCode;
                }
            }


            // For each route segment, create a row
            if ($order->routeSegments && $waypoints && count($waypoints) >= 2) {
                foreach ($order->routeSegments as $index => $segment) {
                    $loadId = $segment->public_id ?? '';
                    $equipment_type = $segment->equipment_type ?? '';
                    $trailer_id = $segment->trailer_id ?? '';
                    
                    // Create segment-specific lane if available
                    $segmentLane = $segment->facility_sequence ?? '';
                    
                    $rows->push([
                        $blockId,                    // Block ID
                        $tripId,                     // Trip ID
                        $loadId,                     // Load ID
                        $segmentLane,                // Lane
                        $startDate,                  // Arrival Start Time
                        $driver_type,                // Driver type
                        $driverName,                 // Driver 1
                        '',                          // Driver 2 (if team)
                        $vehicleType,                // Vehicle Type
                        $vehiclePlateNumber,         // License Plate #
                        '',                        // Country Code
                        $equipment_type,             // Equipment Type
                        $trailer_id,                 // Trailer ID
                        ''                           // Unscheduled Drop (Yes/No)
                    ]);
                }
            } else {
                // Fallback if no segments — show 1 row
                $rows->push([
                    $blockId,                    // Block ID
                    $tripId,                     // Trip ID
                    '',                          // Load ID
                    $segmentLane,                       // Lane
                    $startDate,                  // Arrival Start Time
                    $driver_type,                // Driver type
                    $driverName,                 // Driver 1
                    '',                          // Driver 2 (if team)
                    $vehicleType,                // Vehicle Type
                    $vehiclePlateNumber,         // License Plate #
                    '',                        // Country Code (default)
                    '',                          // Equipment Type
                    '',                          // Trailer ID
                    ''                           // Unscheduled Drop (Yes/No)
                ]);
            }
        }

        return $rows;
    }
}