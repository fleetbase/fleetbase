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

    // public function headings(): array
    // {
    //     return [
    //         'ID',
    //         'Internal ID',
    //         'Driver',
    //         'Vehicle',
    //         'Customer',
    //         'Pick Up',
    //         'Drop Off',
    //         'Date Scheduled',
    //         'Tracking Number',
    //         'Status',
    //         'Date Created',
    //     ];
    // }
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
            'H' => NumberFormat::FORMAT_DATE_DDMMYYYY,
            'K' => NumberFormat::FORMAT_DATE_DDMMYYYY,
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
