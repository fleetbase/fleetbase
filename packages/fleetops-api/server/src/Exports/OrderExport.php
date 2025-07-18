<?php

namespace Fleetbase\FleetOps\Exports;

use Fleetbase\FleetOps\Models\Order;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithHeadings;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use Carbon\Carbon;

class OrderExport implements FromCollection, WithHeadings, ShouldAutoSize
{
    protected array $selections = [];

    public function __construct(array $selections = [])
    {
        $this->selections = $selections;
    }

    public function headings(): array
    {
        return [
            'Block ID',
            'Trip ID',
            'VR ID',
            'Status',
            'Facility Sequence',
            'Arrival Start Time',//CPT(start date)
            'Is CPT Truck',
            'Carrier',
            'SubCarrier',
            'CR ID',
            'Shipper Accounts',
            'Equipment Type',
            'Operator ID',
            'Trailer ID',
            'Tender Status',
            'Driver',
            'Vehicle',
            'VR Creation Date Time (UTC)',
            'VR Cancellation Date Time (UTC)',
            'Created By',
            'Updated By',
            'Date Created',
            'Date Updated'
        ];
    }

    // public function columnFormats(): array
    // {
    //     return [
    //         'F' =>   NumberFormat::FORMAT_DATE_DATETIME, // scheduled_at
    //         'G' => NumberFormat::FORMAT_DATE_DDMMYYYY,
    //         'N' => NumberFormat::FORMAT_DATE_DDMMYYYY,
    //         'O' => NumberFormat::FORMAT_DATE_DDMMYYYY,
    //     ];
    // }

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
            'fleets',
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
            // $pickup = $order->pickup_name;
            // $dropoff = $order->dropoff_name;
            $startDate = $order->scheduled_at ? Carbon::parse($order->scheduled_at)->format('d/m/Y h:i A') : '';
            $endDate   = $order->estimated_end_date ? Carbon::parse($order->estimated_end_date)->format('d/m/Y') : '';


            //$trackingNumber = $order->trackingNumber?->tracking_number;
            $status = $order->status;
            $createdBy = $order->created_by_name;
            $updatedBy = $order->updated_by_name;
            $createdAt = $order->created_at ? Carbon::parse($order->created_at)->format('d/m/Y') : '';
            $updatedAt = $order->updated_at ? Carbon::parse($order->updated_at)->format('d/m/Y') : '';
            $waypoints = $order->payload?->waypoints;
            $carrier = $order->fleets?->name ?? '';
            $subcarrier = $order->fleets->name ?? '';
            $isCPTTruck = isset($order->is_cpt_truck) ? (filter_var($order->is_cpt_truck, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false') : '';

            // For each segment, create a row
         if ($order->routeSegments && $waypoints && count($waypoints) >= 2) {
                // $sortedWaypoints = $waypoints->sortBy('order')->values(); // reindex
                foreach ($order->routeSegments as $index => $segment) {
                $sequence = $segment->facility_sequence ?? '';
                $tender_status = $segment->tender_status ?? '';
                $operator_id = $segment->operator_id ?? '';
                $trailer_id = $segment->trailer_id ?? '';
                $equipment_type = $segment->equipment_type ?? '';
                $shipper_accounts = $segment->shipper_accounts ?? '';
                $crId = $segment->cr_id ?? '';
                $vrId = $segment->public_id ?? '';
                $vr_creation_date_time = $segment->vr_creation_date_time ?? '';
                $vr_cancellation_date_time = $segment->vr_cancellation_date_time ?? '';
                
                $rows->push([
                    $blockId,
                    $tripId,
                    $vrId, // VR ID
                    $status,
                    $sequence,
                    $startDate,
                    $isCPTTruck,
                    $carrier,
                    $subcarrier,
                    $crId,
                    $shipper_accounts,
                    $equipment_type,
                    $operator_id,
                    $trailer_id,
                    $tender_status,
                    $driver,
                    $vehicle,
                    $vr_creation_date_time,
                    $vr_cancellation_date_time,
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
                    $status,
                    '',
                    $startDate,
                    $isCPTTruck,
                    $carrier,
                    $subcarrier,
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    $driver,
                    $vehicle,
                    '',
                    '',
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
