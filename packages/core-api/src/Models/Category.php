<?php

namespace Fleetbase\Models;

use Fleetbase\Casts\Json;
use Fleetbase\Support\Utils;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasMetaAttributes;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\Searchable;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;

class Category extends Model
{
    use HasUuid;
    use HasPublicId;
    use HasApiModelBehavior;
    use HasSlug;
    use HasMetaAttributes;
    use Searchable;

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'category';

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'categories';

    /**
     * These attributes that can be queried.
     *
     * @var array
     */
    protected $searchableColumns = ['name'];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = ['public_id', 'company_uuid', 'owner_uuid', 'parent_uuid', 'icon_file_uuid', 'owner_type', 'internal_id', 'name', 'description', 'translations', 'meta', 'tags', 'icon', 'icon_color', 'slug', 'order', 'for', 'core_category'];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = ['icon_url'];

    /**
     * The attributes excluded from the model's JSON form.
     *
     * @var array
     */
    protected $hidden = ['icon_file'];

    /**
     * Attributes that is filterable on this model.
     *
     * @var array
     */
    protected $filterParams = ['store', 'with_products', 'with_subcategories', 'parents_only', 'parent'];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'core_category' => 'boolean',
        'tags'          => 'array',
        'meta'          => Json::class,
        'translations'  => Json::class,
    ];

    /**
     * @var SlugOptions
     */
    public function getSlugOptions(): SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('name')
            ->saveSlugsTo('slug');
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function parentCategory()
    {
        return $this->belongsTo(Category::class, 'parent_uuid');
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function iconFile()
    {
        return $this->belongsTo(File::class, 'icon_file_uuid');
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function subCategories()
    {
        return $this->hasMany(Category::class, 'parent_uuid');
    }

    /**
     * Sets the owner type.
     */
    public function setOwnerTypeAttribute($type)
    {
        $this->attributes['owner_type'] = Utils::getMutationType($type);
    }

    /**
     * Get avatar URL attribute.
     *
     * @return string
     */
    public function getIconUrlAttribute()
    {
        return data_get($this, 'iconFile.url', 'https://flb-assets.s3.ap-southeast-1.amazonaws.com/images/fallback-placeholder-1.png');
    }
}
