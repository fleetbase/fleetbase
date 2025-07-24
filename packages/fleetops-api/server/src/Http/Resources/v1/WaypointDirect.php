<?php

namespace Fleetbase\FleetOps\Http\Resources\v1;

use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Http\Resources\FleetbaseResource;
use Fleetbase\LaravelMysqlSpatial\Types\Point;
use Fleetbase\Support\Http;
use Fleetbase\Support\Resolve;
use App\Services\LocationTranslatorService;
use Illuminate\Support\Facades\Log;

class WaypointDirect extends FleetbaseResource
{
    /**
     * The ETA value if set externally
     */
    public $eta = null;

    /**
     * Transform the resource into an array.
     *
     * @param \Illuminate\Http\Request $request
     *
     * @return array
     */
    public function toArray($request)
    {
        $locale = $request->header('X-Locale');
        $locationService = app(LocationTranslatorService::class);

        // $this->resource is the actual Waypoint model
        $waypoint = $this->resource;
        $place = $waypoint->place; // Related place model

        return [
            // Use the actual waypoint data, not place-based lookup
            'id'                     => $this->when(Http::isInternalRequest(), $waypoint->id, $waypoint->public_id),
            'uuid'                   => $this->when(Http::isInternalRequest(), $waypoint->uuid),
            'public_id'              => $this->when(Http::isInternalRequest(), $waypoint->public_id),
            'waypoint_public_id'     => $this->when(Http::isInternalRequest(), $waypoint->public_id),
            'customer_uuid'          => $this->when(Http::isInternalRequest(), $waypoint->customer_uuid),
            'customer_type'          => $this->when(Http::isInternalRequest(), $waypoint->customer_type),
            'order'                  => $waypoint->order,
            'tracking'               => $this->getTrackingNumber($waypoint),
            'status'                 => $this->getWaypointStatus($waypoint),
            'status_code'            => $this->getWaypointStatusCode($waypoint),
            
            // Place-related data (if place exists)
            'name'                   => $place ? ($locale ? $locationService->translateLocation($place->name, $locale) : $place->name) : null,
            'location'               => $place ? ($place->location ?? new Point(0, 0)) : new Point(0, 0),
            'address'                => $place ? $place->address : null,
            'address_html'           => $this->when(Http::isInternalRequest(), $place ? $place->address_html : null),
            'street1'                => $place ? $place->street1 : null,
            'street2'                => $place ? $place->street2 : null,
            'city'                   => $place ? $place->city : null,
            'province'               => $place ? $place->province : null,
            'postal_code'            => $place ? $place->postal_code : null,
            'neighborhood'           => $place ? $place->neighborhood : null,
            'district'               => $place ? $place->district : null,
            'building'               => $place ? $place->building : null,
            'security_access_code'   => $place ? $place->security_access_code : null,
            'country'                => $place ? $place->country : null,
            'country_name'           => $this->when(Http::isInternalRequest(), $place ? $place->country_name : null),
            'phone'                  => $place ? $place->phone : null,
            'owner'                  => $this->when(!Http::isInternalRequest() && $place, Resolve::resourceForMorph($place->owner_type ?? null, $place->owner_uuid ?? null)),
            
            //'tracking_number'        => $this->whenLoaded('trackingNumber', $waypoint->trackingNumber),
            'customer'               => $this->setCustomerType(Resolve::resourceForMorph($waypoint->customer_type, $waypoint->customer_uuid)),
            'type'                   => $waypoint->type,
            'meta'                   => $place ? ($place->meta ?? []) : [],
            'eta'                    => $this->eta,
            'updated_at'             => $waypoint->updated_at,
            'created_at'             => $waypoint->created_at,
        ];
    }

    /**
     * Get tracking number from the waypoint
     */
    private function getTrackingNumber($waypoint)
    {
        if ($waypoint->trackingNumber) {
            return $waypoint->trackingNumber->tracking_number ?? null;
        }
        
        return null;
    }

    /**
     * Get waypoint status
     */
    private function getWaypointStatus($waypoint)
    {
        // You might need to determine status based on waypoint state
        // This is a placeholder - adjust based on your business logic
        return $waypoint->status ?? 'Waypoint Created';
    }

    /**
     * Get waypoint status code
     */
    private function getWaypointStatusCode($waypoint)
    {
        // You might need to determine status code based on waypoint state
        // This is a placeholder - adjust based on your business logic
        return $waypoint->status_code ?? 'CREATED';
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

        $waypoint = $this->resource;
        data_set($resolved, 'type', 'customer');
        data_set($resolved, 'customer_type', 'customer-' . Utils::toEmberResourceType($waypoint->customer_type));

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
        
        $waypoint = $this->resource;
        $place = $waypoint->place;
        
        return [
            'id'              => $waypoint->public_id,
            'internal_id'     => $waypoint->internal_id ?? null,
            'name'            => $place ? ($locale ? $locationService->translateLocation($place->name, $locale) : $place->name) : null,
            'type'            => $waypoint->type,
            'destination'     => null, // You might need to determine this based on your logic
            'customer'        => Resolve::resourceForMorph($waypoint->customer_type, $waypoint->customer_uuid),
            'tracking_number' => new TrackingNumber($waypoint->trackingNumber),
            'description'     => $place ? $place->description : null,
            'photo_url'       => $place ? $place->photo_url : null,
            'length'          => $place ? $place->length : null,
            'width'           => $place ? $place->width : null,
            'height'          => $place ? $place->height : null,
            'dimensions_unit' => $place ? $place->dimensions_unit : null,
            'weight'          => $place ? $place->weight : null,
            'weight_unit'     => $place ? $place->weight_unit : null,
            'declared_value'  => $place ? $place->declared_value : null,
            'price'           => $place ? $place->price : null,
            'sale_price'      => $place ? $place->sale_price : null,
            'sku'             => $place ? $place->sku : null,
            'currency'        => $place ? $place->currency : null,
            'meta'            => $place ? ($place->meta ?? []) : [],
            'updated_at'      => $waypoint->updated_at,
            'created_at'      => $waypoint->created_at,
        ];
    }
}