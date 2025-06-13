<?php

namespace Fleetbase\FleetOps\Exports;

use Fleetbase\FleetOps\Models\Order;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use Maatwebsite\Excel\Concerns\FromArray;

class OrderExport implements FromArray, WithHeadings, WithColumnFormatting, ShouldAutoSize, WithMapping
{
    protected array $selections = [];

    public function __construct(array $selections = [])
    {
        $this->selections = $selections;
    }

     public function array(): array
    {
        $rows = [];

        $orders = Order::with([
            'trackingNumber',
            'driverAssigned',
            'payload.waypoints',
            'routeSegments',
            'createdBy',
            'updatedBy'
        ])
        ->where('company_uuid', session('company'));

        if (!empty($this->selections)) {
            $orders = $orders->whereIn('uuid', $this->selections);
        }

        $orders = $orders->get();

        foreach ($orders as $order) {
            foreach ($order->routeSegments as $segment) {
                $rows[] = [
                    $order->public_id,                       // Trip ID
                    $order->internal_id,                     // Block ID
                    $order->driver_name,
                    $order->vehicle_name,
                    $order->pickup_name,
                    $order->dropoff_name,
                    $order->scheduled_at,
                    $order->estimated_end_date,
                    $segment->from_waypoint_id . '→' . $segment->to_waypoint_id,  // Routes
                    optional($order->trackingNumber)->tracking_number,
                    $order->status,
                    $order->created_by_name,
                    $order->updated_by_name,
                    $order->created_at,
                    $order->updated_at,
                    $segment->route_id                       // VR ID
                ];
            }
        }

        return $rows;
    }
    public function map($order): array
    {
        $routes = '';
        if ($order->payload && $order->payload->waypoints && count($order->payload->waypoints)) {
            $locationNames = collect($order->payload->waypoints)
                ->sortBy('order')
                ->pluck('name')
                ->toArray();
                
            // Join the location names with arrow symbols
            $routes = implode('→', $locationNames);
        }
        return [
            $order->public_id,
            $order->internal_id,
            $order->driver_name,
            $order->vehicle_name,
            $order->pickup_name,
            $order->dropoff_name,
            $order->scheduled_at,
            $order->estimated_end_date,
            $routes,
            $order->trackingNumber ? $order->trackingNumber->tracking_number : null,
            $order->status,
            $order->created_by_name,
            $order->updated_by_name,
            $order->created_at,
            $order->updated_at,
            
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
            'Routes', // New column for waypoints
            'Tracking Number',
            'Status',
            'Created By',
            'Updated By',
            'Date Created',
            'Date Updated',

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

    /**
     * @return \Illuminate\Support\Collection
     */
    public function collection()
    {
        $query = Order::where('company_uuid', session('company'));
        
        if (!empty($this->selections)) {
            $query = $query->whereIn('uuid', $this->selections);
        }

        // return Order::where('company_uuid', session('company'))->get();
        return $query->with([
            'trackingNumber', 
            'driverAssigned', 
            'payload.waypoints', // Include waypoints relationship
            'createdBy',
            'updatedBy'
        ])->get();
    }
}
