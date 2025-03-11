<?php

namespace Fleetbase\FleetOps\Http\Resources\v1;

use Fleetbase\FleetOps\Models\Waypoint as WaypointModel;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Http\Resources\FleetbaseResource;
use Fleetbase\LaravelMysqlSpatial\Types\Point;
use Fleetbase\Support\Http;
use Fleetbase\Support\Resolve;
use App\Services\LocationTranslatorService;

class Waypoint extends FleetbaseResource
{
    /**
     * The actual waypoint resource.
     */
    protected ?WaypointModel $waypoint;

    /**
     * Transform the resource into an array.
     *
     * @param \Illuminate\Http\Request $request
     *
     * @return array
     */
    public function toArray($request)
    {
        $this->waypoint = $waypoint = $this->getWaypoint();
        $locale = $request->header('X-Locale');
        $locationService = app(LocationTranslatorService::class);


        return [
            'id'                     => $this->when(Http::isInternalRequest(), $this->id, $this->public_id),
            'uuid'                   => $this->when(Http::isInternalRequest(), $this->uuid),
            'public_id'              => $this->when(Http::isInternalRequest(), $this->public_id),
            'waypoint_public_id'     => $this->when(Http::isInternalRequest(), $waypoint->public_id),
            'customer_uuid'          => $this->when(Http::isInternalRequest(), $waypoint->customer_uuid),
            'customer_type'          => $this->when(Http::isInternalRequest(), $waypoint->customer_type),
            'order'                  => $waypoint->order,
            'tracking'               => $waypoint->tracking,
            'status'                 => $waypoint->status,
            'status_code'            => $waypoint->status_code,
            'name'                   => $locale ? $locationService->translateLocation($this->name, $locale) : $this->name,
            'location'               => data_get($this, 'location', new Point(0, 0)),
            'address'                => $this->address,
            'address_html'           => $this->when(Http::isInternalRequest(), $this->address_html),
            'street1'                => $this->street1 ?? null,
            'street2'                => $this->street2 ?? null,
            'city'                   => $this->city ?? null,
            'province'               => $this->province ?? null,
            'postal_code'            => $this->postal_code ?? null,
            'neighborhood'           => $this->neighborhood ?? null,
            'district'               => $this->district ?? null,
            'building'               => $this->building ?? null,
            'security_access_code'   => $this->security_access_code ?? null,
            'country'                => $this->country ?? null,
            'country_name'           => $this->when(Http::isInternalRequest(), $this->country_name),
            'phone'                  => $this->phone ?? null,
            'owner'                  => $this->when(!Http::isInternalRequest(), Resolve::resourceForMorph($this->owner_type, $this->owner_uuid)),
            'tracking_number'        => $this->whenLoaded('trackingNumber', $waypoint->trackingNumber),
            'customer'               => $this->setCustomerType(Resolve::resourceForMorph($waypoint->customer_type, $waypoint->customer_uuid)),
            'type'                   => $this->type,
            'meta'                   => data_get($this, 'meta', []),
            'eta'                    => $this->eta,
            'updated_at'             => $this->updated_at,
            'created_at'             => $this->created_at,
        ];
    }

    /**
     * Finds the waypoint got a payload and place.
     */
    private function getWaypoint(): ?WaypointModel
    {
        return WaypointModel::where(['payload_uuid' => $this->payload_uuid, 'place_uuid' => $this->uuid])->without(['place'])->with(['trackingNumber'])->first();
    }

    /**
     * Set the customer type for the given data array.
     *
     * @param array $resolved the input data array
     *
     * @return array the modified data array with the customer type set
     */
    private function setCustomerType($resolved)
    {
        if (empty($resolved)) {
            return $resolved;
        }

        data_set($resolved, 'type', 'customer');
        data_set($resolved, 'customer_type', 'customer-' . Utils::toEmberResourceType($this->waypoint->customer_type));

        return $resolved;
    }

    /**
     * Transform the resource into an webhook payload.
     *
     * @return array
     */
    public function toWebhookPayload($request)
    {
        $locale = $request->header('X-Locale');
        $locationService = app(LocationTranslatorService::class);
        return [
            'id'              => $this->public_id,
            'internal_id'     => $this->internal_id,
            'name'            => $locale ? $locationService->translateLocation($this->name, $locale) : $this->name,
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
