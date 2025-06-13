<?php

namespace Fleetbase\FleetOps\Exports;

use Fleetbase\FleetOps\Models\Order;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class OrderExport implements FromCollection, WithHeadings, WithMapping, WithColumnFormatting, ShouldAutoSize
{
    protected array $selections = [];

    public function __construct(array $selections = [])
    {
        $this->selections = $selections;
    }

    public function map($order): array
    {
        // Get waypoint route
        $routes = '';
        if ($order->payload && $order->payload->waypoints && count($order->payload->waypoints)) {
            $locationNames = collect($order->payload->waypoints)
                ->sortBy('order')
                ->pluck('name')
                ->toArray();
            $routes = implode('→', $locationNames);
        }

        // Get all route segment (VR) IDs
        $vrIds = '';
        if ($order->routeSegments && count($order->routeSegments)) {
            $vrIds = $order->routeSegments->pluck('route_id')->implode(', ');
        }

        return [
            $order->public_id,                  // Trip ID
            $order->internal_id,                // Block ID
            $order->driver_name,
            $order->vehicle_name,
            $order->pickup_name,
            $order->dropoff_name,
            $order->scheduled_at,
            $order->estimated_end_date,
            $routes,                            // Route A→B→C
            $order->trackingNumber?->tracking_number,
            $order->status,
            $order->created_by_name,
            $order->updated_by_name,
            $order->created_at,
            $order->updated_at,
            $vrIds                               // NEW: VR ID(s)
        ];
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
            'VR ID(s)', // New column
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

    public function collection()
    {
        $query = Order::where('company_uuid', session('company'));

        if (!empty($this->selections)) {
            $query = $query->whereIn('uuid', $this->selections);
        }

        return $query->with([
            'trackingNumber',
            'driverAssigned',
            'payload.waypoints',
            'routeSegments', // Ensure route segments are loaded
            'createdBy',
            'updatedBy'
        ])->get();
    }
}
