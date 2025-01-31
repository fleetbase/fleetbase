<?php

namespace Fleetbase\Models;

use Fleetbase\Casts\Json;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\Searchable;
use Fleetbase\Traits\TracksApiCredential;
use Illuminate\Support\Str;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;

class Extension extends Model
{
    use HasUuid;
    use HasPublicId;
    use TracksApiCredential;
    use HasApiModelBehavior;
    use Searchable;
    use HasSlug;

    /**
     * The database connection to use.
     *
     * @var string
     */
    protected $connection = 'mysql';

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'extensions';

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'ext';

    /**
     * The attributes that can be queried.
     *
     * @var array
     */
    protected $searchableColumns = [
        'name',
        'description',
        'tags',
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'id',
        'uuid',
        'extension_id',
        'author_uuid',
        'category_uuid',
        'type_uuid',
        'icon_uuid',
        'name',
        'display_name',
        'key',
        'description',
        'tags',
        'namespace',
        'internal_route',
        'fa_icon',
        'version',
        'website_url',
        'privacy_policy_url',
        'tos_url',
        'contact_email',
        'domains',
        'core_service',
        'meta',
        'meta_type',
        'config',
        'secret',
        'client_token',
        'status',
        'slug',
    ];

    /**
     * Attributes that is filterable on this model.
     *
     * @var array
     */
    protected $filterParams = ['category', 'type'];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'core_service' => 'boolean',
        'tags'         => Json::class,
        'meta'         => Json::class,
        'config'       => Json::class,
    ];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = ['is_installed', 'type_name', 'category_name', 'author_name', 'install_count', 'icon_url'];

    /**
     * The attributes excluded from the model's JSON form.
     *
     * @var array
     */
    protected $hidden = ['category', 'type', 'icon', 'secret'];

    /** on boot generate extension_id */
    public static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            $model->extension_id = strtoupper(Str::random(14));
        });
    }

    /**
     * Get the options for generating the slug.
     */
    public function getSlugOptions(): SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('name')
            ->saveSlugsTo('slug');
    }

    /**
     * @var string
     */
    public function getIsInstalledAttribute()
    {
        $isInstalled   = (bool) $this->installs()->where('company_uuid', session('company'))->count();
        $isCoreService = $this->core_service;

        return $isCoreService || $isInstalled;
    }

    /**
     * @var string
     */
    public function getTypeNameAttribute()
    {
        return static::attributeFromCache($this, 'type.name');
    }

    /**
     * @var string
     */
    public function getCategoryNameAttribute()
    {
        return static::attributeFromCache($this, 'category.name');
    }

    /**
     * @var string
     */
    public function getAuthorNameAttribute()
    {
        return static::attributeFromCache($this, 'author.name');
    }

    /**
     * @var string
     */
    public function getIconUrlAttribute()
    {
        return static::attributeFromCache($this, 'file.url', 'https://s3.ap-southeast-1.amazonaws.com/flb-assets/static/no-avatar.png');
    }

    /**
     * @var int
     */
    public function getInstallCountAttribute()
    {
        return $this->installs()->count();
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function installs()
    {
        return $this->hasMany(ExtensionInstall::class);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function author()
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function type()
    {
        return $this->belongsTo(Type::class);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function icon()
    {
        return $this->belongsTo(File::class);
    }

    /**
     * @method install
     *
     * @return ExtensionInstall
     */
    public function install()
    {
        $install = ExtensionInstall::create([
            'extension_uuid' => $this->uuid,
            'company_uuid'   => session('company'),
            'config'         => $this->config,
            'meta'           => $this->meta,
        ]);

        return $install;
    }

    /**
     * Generates a namespace from parts passed.
     *
     * @return string
     */
    public static function createNamespace()
    {
        return collect(func_get_args())->map(function ($part) {
            if (!is_string($part)) {
                return null;
            }

            return Str::slug($part);
        })->filter()->join(':');
    }
}
