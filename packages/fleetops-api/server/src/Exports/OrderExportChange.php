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
use Illuminate\Support\Facades\Log;

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
            ['UPCOMING TAB – BULK ASSIGNMENT'],  // Row 1
            ['Instructions: Fill in the Driver, Tractor Vehicle Type, Registration Plate No., Country Code, Trailer Equipment Type, Trailer ID (separated by comma for two trailers) and Unscheduled Drop fields for the trips that you wish to assign. Trips with existing assignments will be overridden.'], // Row 2
            [''], // Row 3 (blank row)
            ['Block ID', '', '', '', '', '', 'Driver(s) use first name and surname', '', 'Tractor', '', '', 'Trailer', '', ''],
            // Sub headers (row 2)
            ['','Trip ID', 'Load ID', 'Lane', 'Arrival Start Time', 'Driver type', 'Driver 1', 'Driver 2 (if team)', 'Vehicle Type', 'License Plate #', 'Country Code', 'Equipment Type', 'Trailer ID', 'Unscheduled Drop (Yes/No)']
        ];
    }

    public function registerEvents(): array
{
    return [
        AfterSheet::class => function(AfterSheet $event) {
            $sheet = $event->sheet->getDelegate();

            // Merge cells for title and instructions
            $sheet->mergeCells('A1:N1'); // Title
            $sheet->mergeCells('A2:N2'); // Instructions
            $sheet->mergeCells('G4:H4'); // Driver(s)
            $sheet->mergeCells('I4:K4'); // Tractor
            $sheet->mergeCells('L4:N4'); // Trailer

            // Style Title (Row 1) - Left aligned
            $sheet->getStyle('A1')->applyFromArray([
                'font' => ['bold' => true, 'size' => 14],
                'alignment' => [
                    'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_LEFT,
                    'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER
                ],
                'fill' => [
                   'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                   'startColor' => ['rgb' => 'FFFFCC'] // Light yellow (same as Excel)
                ]
            ]);

            // Style Instructions (Row 2) - Left aligned
             $sheet->getStyle('A2')->applyFromArray([
                'font' => ['italic' => true, 'size' => 10],
                'alignment' => [
                    'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_LEFT,
                    'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER
                ],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'FFFFCC'] // Light yellow (same as Excel)
                ]
            ]);
            $sheet->getRowDimension(2)->setRowHeight(20);
            $sheet->getStyle('A2')->getAlignment()->setWrapText(true);

            // Style Main Header Row (Row 4)
            $sheet->getStyle('A4:N4')->applyFromArray([
                'font' => ['bold' => true],
                'alignment' => ['horizontal' => 'center', 'vertical' => 'center'],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'CCFFFF'] // Light blue from Excel (RGB: 204,255,255)
                ],
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                        'color' => ['rgb' => '000000']
                    ]
                ]
            ]);

            // Style Sub-Header Row (Row 5)
            $sheet->getStyle('A5:N5')->applyFromArray([
                'font' => ['bold' => true],
                'alignment' => ['horizontal' => 'center', 'vertical' => 'center'],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'CCFFFF'] // Light blue from Excel (RGB: 204,255,255)
                ],
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                        'color' => ['rgb' => '000000']
                    ]
                ]
            ]);

            // Freeze first 5 rows so headers remain visible
            $sheet->freezePane('A6');

            // Auto-size columns A to N
            foreach (range('A', 'N') as $column) {
                $sheet->getColumnDimension($column)->setAutoSize(true);
            }

            // Apply borders to all data rows starting from row 6
            $lastRow = $sheet->getHighestRow(); // Get last used row
            if ($lastRow >= 6) {
            for ($row = 6; $row <= $lastRow; $row++) {
                $fillColor = ($row % 2 == 0) ? 'FFFFFF' : 'C0C0C0'; // White & Gray
                $sheet->getStyle("A{$row}:N{$row}")->applyFromArray([
                    'fill' => [
                        'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                        'startColor' => ['rgb' => $fillColor]
                    ],
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                            'color' => ['rgb' => 'CCCCCC'] // Light gray border
                        ]
                    ]
                ]);
            }
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
        if(isset($timezone))
        {
            if ($timezone === 'Asia/Calcutta') 
            {
                $timezone = 'Asia/Kolkata'; // Convert old timezone
            }
            if(isset($this->filterBy)){
                $column = $filterMap[$this->filterBy] ?? null;
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
        }
       
        // Apply limit only if no filters are provided
        $hasFilters = !empty($this->selections) || 
                     ($this->filterBy && $this->fromDate);
        
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
            // 'fleets',
            'createdBy',
            'updatedBy',
        ])->OrderBy('created_at', 'desc')->get();
        
        $rows = collect();
        foreach ($orders as $order) {
            // Prepare the shared fields
            $tripId = $order->trip_id;
            $blockId = $order->public_id;
            $driverName = ucwords(strtolower($order->driver_name ?? ''));
            $vehiclePlateNumber = $order->vehicleAssigned?->plate_number ?? '';
            $vehicleType = $order->vehicleAssigned?->type ?? '';
            if ($timezone === 'Asia/Calcutta') 
            {
                $timezone = 'Asia/Kolkata'; // Convert old timezone
            }
            $startDate = $order->scheduled_at ? 
                         Carbon::parse($order->scheduled_at)
                        ->when($timezone, fn($c) => $c->setTimezone($timezone))
                        ->format('d/m/Y H:i') : '';
            $waypoints = $order->payload?->waypoints;
            $driver_type = $order->driver_type ?? 'SINGLE_DRIVER';

            // Create lane information from waypoints
            $segmentLane = '';
            /*if ($waypoints instanceof Collection && $waypoints->count() == 2) {
                  $placeNames = collect();
                    foreach ($waypoints as $waypoint) {
                        $placeName = $waypoint->name ?? $waypoint->city ?? $waypoint->code ?? '';
                        if (!empty($placeName)) {
                            $placeNames->push($placeName);
                        }
                    }
                 
            } else {
                // No waypoints, fallback to pickup/dropoff codes
                $pickupCode = $order->payload->pickup->code ?? '';
                $dropoffCode = $order->payload->dropoff->code ?? '';
                
                if (!empty($pickupCode) && !empty($dropoffCode)) {
                    $segmentLane = $pickupCode . '->' . $dropoffCode;
                } elseif (!empty($pickupCode)) {
                    $segmentLane = $pickupCode;
                } elseif (!empty($dropoffCode)) {
                    $segmentLane = $dropoffCode;
                }
            }*/


            // For each route segment, create a row
            if ($order->routeSegments && $order->routeSegments->count() > 0 && $waypoints && count($waypoints) >= 2) {
                foreach ($order->routeSegments as $index => $segment) {
                    $loadId = $segment->public_id ?? '';
                    $equipment_type = $segment->equipment_type ?? '';
                    $trailer_id = $segment->trailer_id ?? '';
                    $startDate = $segment->stop_1_yard_arrival ?? $startDate ?? '';
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
            } 
            else{
                if($waypoints instanceof Collection && $waypoints->count() == 2){
                    $placeNames = collect();
                    foreach ($waypoints as $waypoint) {
                        $placeName = $waypoint->name ?? $waypoint->city ?? $waypoint->code ?? '';
                        if (!empty($placeName)) {
                            $placeNames->push($placeName);
                        }
                    }
                    $uniquePlaceNames = $placeNames->unique()->values();

                    if ($uniquePlaceNames->count() === 1) {
                        // All waypoints have the same place name
                        $segmentLane = $uniquePlaceNames->first();
                    } 
                }
                else{
                    $pickupCode = $order->payload->pickup->code ?? '';
                    $dropoffCode = $order->payload->dropoff->code ?? '';
                    
                    if (!empty($pickupCode) && !empty($dropoffCode)) {
                        if($pickupCode === $dropoffCode)
                        {
                            $segmentLane = $pickupCode;
                        }
                        else{
                            $segmentLane = $pickupCode . '->' . $dropoffCode;
                        }
                    } elseif (!empty($pickupCode)) {
                        $segmentLane = $pickupCode;
                    } elseif (!empty($dropoffCode)) {
                        $segmentLane = $dropoffCode;
                    }
                }
                
                //   foreach ($waypoints as $waypoint) {
                //         $placeName = $waypoint->name ?? $waypoint->city ?? $waypoint->code ?? '';
                //         if (!empty($placeName)) {
                //             $placeNames->push($placeName);
                //         }
                //     }
                //     $uniquePlaceNames = $placeNames->unique()->values();

                //     if ($uniquePlaceNames->count() === 1) {
                //         // All waypoints have the same place name
                //         $segmentLane = $uniquePlaceNames->first();
                //     } 
                 $rows->push([
                    $blockId,                    // Block ID
                    $tripId,                     // Trip ID
                    '',                          // Load ID
                    $segmentLane,                 // Lane
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
            // else {
            //     // Fallback if no segments or waypoints — show 1 row for ALL orders
            //     $rows->push([
            //         $blockId,                    // Block ID
            //         $tripId,                     // Trip ID
            //         '',                          // Load ID
            //         $segmentLane,                 // Lane
            //         $startDate,                  // Arrival Start Time
            //         $driver_type,                // Driver type
            //         $driverName,                 // Driver 1
            //         '',                          // Driver 2 (if team)
            //         $vehicleType,                // Vehicle Type
            //         $vehiclePlateNumber,         // License Plate #
            //         '',                        // Country Code (default)
            //         '',                          // Equipment Type
            //         '',                          // Trailer ID
            //         ''                           // Unscheduled Drop (Yes/No)
            //     ]);
            // }
        }

        return $rows;
    }
}