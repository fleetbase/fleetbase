<?php

namespace Fleetbase\FleetOps\Http\Resources\v1;

use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Http\Resources\FleetbaseResource;
use Fleetbase\Support\Http;
use Fleetbase\Support\Resolve;

class Entity extends FleetbaseResource
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
        return [
            'id'                => $this->when(Http::isInternalRequest(), $this->id, $this->public_id),
            'uuid'              => $this->when(Http::isInternalRequest(), $this->uuid),
            'photo_uuid'        => $this->when(Http::isInternalRequest(), $this->photo_uuid),
            'public_id'         => $this->when(Http::isInternalRequest(), $this->public_id),
            'customer_uuid'     => $this->when(Http::isInternalRequest(), $this->customer_uuid),
            'customer_type'     => $this->when(Http::isInternalRequest(), $this->customer_type),
            'supplier_uuid'     => $this->when(Http::isInternalRequest(), $this->supplier_uuid),
            'destination_uuid'  => $this->when(Http::isInternalRequest(), $this->destination_uuid),
            'payload_uuid'      => $this->when(Http::isInternalRequest(), $this->payload_uuid),
            'internal_id'       => $this->internal_id,
            'name'              => $this->name,
            'type'              => $this->type,
            'payload'           => $this->when(Http::isPublicRequest(), data_get($this, 'payload.public_id')),
            'destination'       => $this->when(Http::isPublicRequest(), data_get($this, 'destination.public_id')),
            'customer'          => $this->setCustomerType(Resolve::resourceForMorph($this->customer_type, $this->customer_uuid)),
            'supplier'          => $this->whenLoaded('supplier', fn () => $this->supplier),
            'tracking_number'   => new TrackingNumber($this->trackingNumber),
            'description'       => data_get($this, 'description'),
            'tracking'          => $this->when(Http::isInternalRequest(), $this->trackingNumber ? $this->trackingNumber->tracking_number : null),
            'barcode'           => $this->when(Http::isInternalRequest(), $this->trackingNumber ? $this->trackingNumber->barcode : null),
            'qr_code'           => $this->when(Http::isInternalRequest(), $this->trackingNumber ? $this->trackingNumber->qr_code : null),
            'photo_url'         => data_get($this, 'photo_url'),
            'length'            => data_get($this, 'length'),
            'width'             => data_get($this, 'width'),
            'height'            => data_get($this, 'height'),
            'dimensions_unit'   => data_get($this, 'dimensions_unit'),
            'weight'            => data_get($this, 'weight'),
            'weight_unit'       => data_get($this, 'weight_unit'),
            'declared_value'    => data_get($this, 'declared_value'),
            'price'             => data_get($this, 'price'),
            'sale_price'        => data_get($this, 'sale_price'),
            'sku'               => data_get($this, 'sku'),
            'currency'          => data_get($this, 'currency'),
            'meta'              => data_get($this, 'meta', []),
            'updated_at'        => $this->updated_at,
            'created_at'        => $this->created_at,
        ];
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
        data_set($resolved, 'customer_type', Utils::toEmberResourceType($this->customer_type));

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
            'name'            => $this->name,
            'type'            => data_get($this, 'type'),
            'destination'     => $this->destination ? $this->destination->public_id : null,
            'customer'        => Resolve::resourceForMorph($this->customer_type, $this->customer_uuid),
            'tracking_number' => new TrackingNumber($this->trackingNumber),
            'description'     => data_get($this, 'description'),
            'photo_url'       => data_get($this, 'photo_url'),
            'length'          => data_get($this, 'length'),
            'width'           => data_get($this, 'width'),
            'height'          => data_get($this, 'height'),
            'dimensions_unit' => data_get($this, 'dimensions_unit'),
            'weight'          => data_get($this, 'weight'),
            'weight_unit'     => data_get($this, 'weight_unit'),
            'declared_value'  => data_get($this, 'declared_value'),
            'price'           => data_get($this, 'price'),
            'sale_price'      => data_get($this, 'sale_price'),
            'sku'             => data_get($this, 'sku'),
            'currency'        => data_get($this, 'currency'),
            'meta'            => $this->meta ?? [],
            'updated_at'      => $this->updated_at,
            'created_at'      => $this->created_at,
        ];
    }
}
