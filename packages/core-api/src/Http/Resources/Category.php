<?php

namespace Fleetbase\Http\Resources;

use Fleetbase\Support\Http;
use Fleetbase\Support\Utils;

class Category extends FleetbaseResource
{
    public array $options = [];

    public function __construct($resource, $options = [])
    {
        parent::__construct($resource);
        $this->options = is_array($options) ? $options : [];
    }

    /**
     * Transform the resource into an array.
     *
     * @param \Illuminate\Http\Request $request
     *
     * @return array|\Illuminate\Contracts\Support\Arrayable|\JsonSerializable
     */
    public function toArray($request)
    {
        $withoutSubcategories = isset($this->options['without_subcategories']) && Utils::isTrue($this->options['without_subcategories']);
        $withoutParent        = isset($this->options['without_parent']) && Utils::isTrue($this->options['without_parent']);

        return [
            'id'           => $this->when(Http::isInternalRequest(), $this->id, $this->public_id),
            'uuid'         => $this->when(Http::isInternalRequest(), $this->uuid),
            'public_id'    => $this->when(Http::isInternalRequest(), $this->public_id),
            'company_uuid' => $this->when(Http::isInternalRequest(), $this->company_uuid),
            'owner_uuid'   => $this->when(Http::isInternalRequest(), $this->owner_uuid),
            'owner_type'   => $this->when(Http::isInternalRequest(), $this->owner_type),
            'icon'         => $this->icon,
            'icon_url'     => $this->icon_url,
            'name'         => $this->name,
            'description'  => $this->description,
            'owner'        => $this->whenLoaded('owner', fn () => $this->owner),
            'parent'       => $this->whenLoaded(
                'parentCategory',
                function ($parentCategory) {
                    if (Http::isInternalRequest()) {
                        return new Category($parentCategory);
                    }

                    return $parentCategory->public_id;
                }
            ),
            'parent'        => $this->when($request->boolean('with_parent') && !$withoutParent, new Category($this->parentCategory, ['without_subcategories' => true])),
            'tags'          => $this->tags ?? [],
            'translations'  => $this->translations ?? [],
            'meta'          => $this->meta ?? [],
            'subcategories' => $this->when($request->has('with_subcategories') && !$withoutSubcategories, $this->subCategories->mapInto(Category::class)),
            'for'           => $this->for,
            'order'         => $this->order,
            'slug'          => $this->slug,
            'updated_at'    => $this->updated_at,
            'created_at'    => $this->created_at,
        ];
    }
}
