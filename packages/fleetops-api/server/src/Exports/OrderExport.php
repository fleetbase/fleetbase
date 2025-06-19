<?php

namespace Fleetbase\FleetOps\Exports;

use Fleetbase\FleetOps\Models\Order;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithHeadings;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class OrderExport implements FromCollection, WithHeadings, WithColumnFormatting, ShouldAutoSize
{
    protected array $selections = [];

    public function __construct(array $selections = [])
    {
        $this->selections = $selections;
    }

    public function headings(): array
    {
        return [
            'Trip ID',
            'Block ID',
            'Route ID',
            'Driver',
            'Vehicle',
            'Pick Up',
            'Drop Off',
            'Start Date',
            'End Date',
            'Sequence',
            'Tracking Number',
            'Status',
            'Created By',
            'Updated By',
            'Date Created',
            'Date Updated'
        ];
    }

    public function columnFormats(): array
    {
        return [
            'G' => NumberFormat::FORMAT_DATE_DDMMYYYY,
            'H' => NumberFormat::FORMAT_DATE_DDMMYYYY,
            'N' => NumberFormat::FORMAT_DATE_DDMMYYYY,
            'O' => NumberFormat::FORMAT_DATE_DDMMYYYY,
        ];
    }

    public function collection(): Collection
    {
        $query = Order::where('company_uuid', session('company'));

        if (!empty($this->selections)) {
            $query = $query->whereIn('uuid', $this->selections);
        }

        $orders = $query->with([
            'trackingNumber',
            'driverAssigned',
            'payload.waypoints',
            'routeSegments',
            'createdBy',
            'updatedBy',
        ])->get();

        $rows = collect();

        foreach ($orders as $order) {
            // Prepare the shared fields
            $tripId = $order->public_id;
            $blockId = $order->internal_id;
            $driver = $order->driver_name;
            $vehicle = $order->vehicle_name;
            $pickup = $order->pickup_name;
            $dropoff = $order->dropoff_name;
            $startDate = $order->scheduled_at;
            $endDate = $order->estimated_end_date;
            $trackingNumber = $order->trackingNumber?->tracking_number;
            $status = $order->status;
            $createdBy = $order->created_by_name;
            $updatedBy = $order->updated_by_name;
            $createdAt = $order->created_at;
            $updatedAt = $order->updated_at;

            // Route A→B→C
            // $routes = '';
            // if ($order->payload && $order->payload->waypoints && count($order->payload->waypoints)) {
            //     $locationNames = collect($order->payload->waypoints)
            //         ->sortBy('order')
            //         ->pluck('name')
            //         ->toArray();
            //     $routes = implode('→', $locationNames);
            // }
            $waypoints = $order->payload?->waypoints;
            // For each segment, create a row
         if ($order->routeSegments && $waypoints && count($waypoints) >= 2) {
                $sortedWaypoints = $waypoints->sortBy('order')->values(); // reindex
                foreach ($order->routeSegments as $index => $segment) {
                // Get waypoint pairs for the sequence A→B, B→C, etc.
                $from = $sortedWaypoints[$index]->name ?? '';
                $to = $sortedWaypoints[$index + 1]->name ?? '';

                // Skip if to/from is missing (safety check)
                if (!$from || !$to) {
                    continue;
                }

                $sequence = "{$from}→{$to}";

                $rows->push([
                    $tripId,
                    $blockId,
                    $segment->public_id, // VR ID
                    $driver,
                    $vehicle,
                    $pickup,
                    $dropoff,
                    $startDate,
                    $endDate,
                    $sequence, // Updated here
                    $trackingNumber,
                    $status,
                    $createdBy,
                    $updatedBy,
                    $createdAt,
                    $updatedAt,
                    ]);
                    }
            } else {
                // Fallback if no segments — show 1 row with empty VR ID
                $rows->push([
                    $tripId,
                    $blockId,
                    '', // No VR
                    $driver,
                    $vehicle,
                    $pickup,
                    $dropoff,
                    $startDate,
                    $endDate,
                    '',
                    $trackingNumber,
                    $status,
                    $createdBy,
                    $updatedBy,
                    $createdAt,
                    $updatedAt,
                   
                ]);
            }
        }

        return $rows;
    }
}
