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
        return [
            $order->public_id,
            $order->internal_id,
            $order->driver_name,
            $order->vehicle_name,
            $order->customer_name,
            $order->pickup_name,
            $order->dropoff_name,
            $order->scheduled_at,
            $order->trackingNumber ? $order->trackingNumber->tracking_number : null,
            $order->status,
            $order->created_at,
        ];
    }

    public function headings(): array
    {
        return [
            'ID',
            'Internal ID',
            'Driver',
            'Vehicle',
            'Customer',
            'Pick Up',
            'Drop Off',
            'Date Scheduled',
            'Tracking Number',
            'Status',
            'Date Created',
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
        if (!empty($this->selections)) {
            return Order::where('company_uuid', session('company'))->whereIn('uuid', $this->selections)->with(['trackingNumber', 'customer', 'driverAssigned', 'payload'])->get();
        }

        return Order::where('company_uuid', session('company'))->get();
    }
}
