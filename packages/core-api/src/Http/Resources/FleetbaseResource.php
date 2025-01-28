<?php

namespace Fleetbase\Http\Resources;

use Fleetbase\Support\Http;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

class FleetbaseResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param \Illuminate\Http\Request $request
     *
     * @return array|\Illuminate\Contracts\Support\Arrayable|\JsonSerializable
     */
    public function toArray($request)
    {
        $resource = parent::toArray($request);

        return $resource;
    }

    /**
     * Create a new anonymous resource collection.
     *
     * @return \Illuminate\Http\Resources\Json\AnonymousResourceCollection
     */
    public static function collection($resource)
    {
        return tap(
            new FleetbaseResourceCollection($resource, static::class),
            function ($collection) {
                if (property_exists(static::class, 'preserveKeys')) {
                    $collection->preserveKeys = (new static([]))->preserveKeys === true;
                }
            }
        );
    }

    /**
     * Checks if resource is null.
     *
     * @return bool
     */
    public function isEmpty()
    {
        return is_null($this->resource) || is_null($this->resource->resource);
    }

    /**
     * Get all internal id properties, only when internal request.
     */
    public function getInternalIds(): array
    {
        $attributes  = $this->getAttributes();
        $internalIds = [];

        foreach ($attributes as $key => $value) {
            if (Str::endsWith($key, '_uuid')) {
                $internalIds[$key] = $this->when(Http::isInternalRequest(), $value);
            }
        }

        return $internalIds;
    }
}
