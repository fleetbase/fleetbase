<?php

namespace Fleetbase\Models;

use Fleetbase\Casts\Json;
use Fleetbase\Traits\Filterable;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\Searchable;

class ApiEvent extends Model
{
    use HasUuid;
    use HasPublicId;
    use HasApiModelBehavior;
    use Searchable;
    use Filterable;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'api_events';

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'event';

    /**
     * These attributes that can be queried.
     *
     * @var array
     */
    protected $searchableColumns = ['event', 'description', 'method'];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = ['_key', 'company_uuid', 'api_credential_uuid', 'access_token_id', 'event', 'source', 'data', 'description', 'method'];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'data' => Json::class,
    ];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = [];

    /**
     * The attributes excluded from the model's JSON form.
     *
     * @var array
     */
    protected $hidden = [];

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function apiCredential()
    {
        return $this->belongsTo(ApiCredential::class);
    }
}
