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
            'Driver',
            'Vehicle',
            'Pick Up',
            'Drop Off',
            'Start Date',
            'End Date',
            'Routes',
            'Tracking Number',
            'Status',
            'Created By',
            'Updated By',
            'Date Created',
            'Date Updated',
            'VR ID',
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
            $routes = '';
            if ($order->payload && $order->payload->waypoints && count($order->payload->waypoints)) {
                $locationNames = collect($order->payload->waypoints)
                    ->sortBy('order')
                    ->pluck('name')
                    ->toArray();
                $routes = implode('→', $locationNames);
            }

            // For each segment, create a row
            if ($order->routeSegments && count($order->routeSegments)) {
                foreach ($order->routeSegments as $segment) {
                    $rows->push([
                        $tripId,
                        $blockId,
                        $driver,
                        $vehicle,
                        $pickup,
                        $dropoff,
                        $startDate,
                        $endDate,
                        $routes,
                        $trackingNumber,
                        $status,
                        $createdBy,
                        $updatedBy,
                        $createdAt,
                        $updatedAt,
                        $segment->route_id, // One row per VR ID
                    ]);
                }
            } else {
                // Fallback if no segments — show 1 row with empty VR ID
                $rows->push([
                    $tripId,
                    $blockId,
                    $driver,
                    $vehicle,
                    $pickup,
                    $dropoff,
                    $startDate,
                    $endDate,
                    $routes,
                    $trackingNumber,
                    $status,
                    $createdBy,
                    $updatedBy,
                    $createdAt,
                    $updatedAt,
                    '', // No VR
                ]);
            }
        }

        return $rows;
    }
}
