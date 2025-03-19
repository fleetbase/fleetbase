<?php

namespace Fleetbase\FleetOps\Http\Resources\v1;

use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Http\Resources\Comment;
use Fleetbase\Http\Resources\File;
use Fleetbase\Http\Resources\FleetbaseResource;
use Fleetbase\Support\Http;
use Fleetbase\Support\Resolve;
use Fleetbase\FleetOps\Http\Resources\v1\TrackingStatus;

class Order extends FleetbaseResource
{
    /**
     * Transform the resource into an array.
     *
     * @param \Illuminate\Http\Request $request
     *
     * @return array
     */
    public function toArray($request)
    {
        $commonData = [
        'id'                       => $this->when(Http::isInternalRequest(), $this->id, $this->public_id),
        'uuid'                     => $this->when(Http::isInternalRequest(), $this->uuid),
        'public_id'                => $this->when(Http::isInternalRequest(), $this->public_id),
        'internal_id'              => $this->internal_id,
        'company_uuid'             => $this->when(Http::isInternalRequest(), $this->company_uuid),
        'transaction_uuid'         => $this->when(Http::isInternalRequest(), $this->transaction_uuid),
        'facilitator_type'         => $this->when(Http::isInternalRequest(), $this->facilitator_type),
        'payload_uuid'             => $this->when(Http::isInternalRequest(), $this->payload_uuid),
        'route_uuid'               => $this->when(Http::isInternalRequest(), $this->route_uuid),
        'tracking_number_uuid'     => $this->when(Http::isInternalRequest(), $this->tracking_number_uuid),
        'driver_assigned_uuid'     => $this->when(Http::isInternalRequest(), $this->driver_assigned_uuid),
        'vehicle_assigned_uuid'    => $this->when(Http::isInternalRequest(), $this->vehicle_assigned_uuid),
        'has_driver_assigned'      => $this->when(Http::isInternalRequest(), $this->has_driver_assigned),
        'is_scheduled'             => $this->when(Http::isInternalRequest(), $this->is_scheduled),
        'custom_field_values'      => $this->when(Http::isInternalRequest(), $this->customFieldValues),
        'payload'                  => new Payload($this->payload),
        'driver_assigned' => $this->whenLoaded('driverAssigned', fn () => new Driver($this->driverAssigned->makeHidden('user'))),
        'vehicle_assigned'         => $this->whenLoaded('vehicleAssigned', fn () => new Vehicle($this->vehicleAssigned)),
        'comments'                 => $this->when(Http::isInternalRequest(), Comment::collection($this->comments)),
        'notes'                    => $this->notes,
        ...$this->getCustomFieldValues(),
        'type'                     => $this->type,
        'status'                   => $this->status,
        'pod_method'               => $this->pod_method,
        'pod_required'             => (bool) data_get($this, 'pod_required', false),
        'dispatched'               => (bool) data_get($this, 'dispatched', false),
        'adhoc'                    => (bool) data_get($this, 'adhoc', false),
        'adhoc_distance'           => (int) $this->getAdhocDistance(),
        'distance'                 => (int) $this->distance,
        'time'                     => (int) $this->time,
        'tracker_data'             => $this->when($request->has('with_tracker_data') || !empty($this->resource->tracker_data), fn () => $this->resource->tracker_data ?? $this->resource->tracker()->toArray()),
        'eta'                      => $this->when($request->has('with_eta') || !empty($this->resource->eta), fn () => $this->resource->eta ?? $this->resource->tracker()->eta()),
        'meta'                     => data_get($this, 'meta', []),
        'dispatched_at'            => $this->dispatched_at,
        'started_at'               => $this->started_at,
        'scheduled_at'             => $this->scheduled_at,
        'updated_at'               => $this->updated_at,
        'created_at'               => $this->created_at,
        'created_by_name'          => $this->created_by_name,
        'updated_by_name'          => $this->updated_by_name,
        'created_by_uuid'          => $this->created_by_uuid,
        ];

        if ($request->filled('is_calendar')) {
            return $commonData;
        }

        return array_merge($commonData, [
            'customer_uuid'        => $this->when(Http::isInternalRequest(), $this->customer_uuid),
            'customer_type'        => $this->when(Http::isInternalRequest(), $this->customer_type),
            'facilitator_uuid'     => $this->when(Http::isInternalRequest(), $this->facilitator_uuid),
            'purchase_rate_uuid'   => $this->when(Http::isInternalRequest(), $this->purchase_rate_uuid),
            'service_quote_uuid'   => $this->when(Http::isInternalRequest(), $this->service_quote_uuid),
            'order_config_uuid'    => $this->when(Http::isInternalRequest(), $this->order_config_uuid),
            'order_config'         => $this->when(Http::isInternalRequest(), $this->whenLoaded('orderConfig', fn () => $this->orderConfig), data_get($this->orderConfig, 'public_id')),
            'customer'             => $this->setCustomerType(Resolve::resourceForMorph($this->customer_type, $this->customer_uuid)),
            'facilitator'          => $this->setFacilitatorType(Resolve::resourceForMorph($this->facilitator_type, $this->facilitator_uuid)),
            'tracking_number'      => new TrackingNumber($this->trackingNumber),
            'tracking'             => $this->when(Http::isInternalRequest(), optional($this->trackingNumber)->tracking_number),
            'barcode'              => $this->when(Http::isInternalRequest(), optional($this->trackingNumber)->barcode),
            'qr_code'              => $this->when(Http::isInternalRequest(), optional($this->trackingNumber)->qr_code),
            'files'                => $this->when(Http::isInternalRequest(), $this->files, File::collection($this->files)),
            'purchase_rate'        => new PurchaseRate($this->purchaseRate),
            'estimated_end_date'   => $this->estimated_end_date,
        ]);
    }

    /**
     * Set the customer type for the given data array.
     *
     * @param array $resolved the input data array
     *
     * @return array the modified data array with the customer type set
     */
    public function setCustomerType($resolved)
    {
        if (empty($resolved)) {
            return $resolved;
        }

        data_set($resolved, 'type', 'customer');
        data_set($resolved, 'customer_type', 'customer-' . Utils::toEmberResourceType($this->customer_type));

        return $resolved;
    }

    /**
     * Set the facilitator type for the given data array.
     *
     * @param array $resolved the input data array
     *
     * @return array the modified data array with the facilitator type set
     */
    public function setFacilitatorType($resolved)
    {
        if (empty($resolved)) {
            return $resolved;
        }

        data_set($resolved, 'type', 'facilitator');
        data_set($resolved, 'facilitator_type', 'facilitator-' . Utils::toEmberResourceType($this->facilitator_type));

        return $resolved;
    }

    /**
     * Transform the resource into an webhook payload.
     *
     * @return array
     */
    public function toWebhookPayload()
    {
        return [
            'id'              => $this->public_id,
            'internal_id'     => $this->internal_id,
            'customer'        => Resolve::resourceForMorph($this->customer_type, $this->customer_uuid),
            'payload'         => new Payload($this->payload),
            'facilitator'     => Resolve::resourceForMorph($this->facilitator_type, $this->facilitator_uuid),
            'driver_assigned' => new Driver($this->driverAssigned),
            'tracking_number' => new TrackingNumber($this->trackingNumber),
            'purchase_rate'   => new PurchaseRate($this->purchaseRate),
            'notes'           => $this->notes ?? '',
            'type'            => $this->type ?? null,
            'status'          => $this->status,
            'adhoc'           => $this->adhoc,
            'meta'            => $this->meta ?? [],
            'dispatched_at'   => $this->dispatched_at,
            'started_at'      => $this->started_at,
            'scheduled_at'    => $this->scheduled_at,
            'estimated_end_date' => $this->estimated_end_date,
            'updated_at'      => $this->updated_at,
            'created_at'      => $this->created_at,
            'created_by_name' => $this->created_by_name,
            'updated_by_name' => $this->updated_by_name,
            'created_by_uuid' => $this->created_by_uuid,
        ];
    }
}

