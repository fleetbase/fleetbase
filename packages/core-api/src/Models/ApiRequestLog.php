<?php

namespace Fleetbase\Models;

use Fleetbase\Casts\Json;
use Fleetbase\Traits\Filterable;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\Searchable;

class ApiRequestLog extends Model
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
    protected $table = 'api_request_logs';

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'req';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        '_key',
        'company_uuid',
        'api_credential_uuid',
        'access_token_id',
        'public_id',
        'method',
        'path',
        'full_url',
        'status_code',
        'reason_phrase',
        'duration',
        'ip_address',
        'version',
        'source',
        'content_type',
        'related',
        'query_params',
        'request_headers',
        'request_body',
        'request_raw_body',
        'response_headers',
        'response_body',
        'response_raw_body',
    ];

    /**
     * These attributes that can be queried.
     *
     * @var array
     */
    protected $searchableColumns = ['path', 'method', 'full_url', 'content_type', 'ip_address'];

    /**
     * Attributes that is filterable on this model.
     *
     * @var array
     */
    protected $filterParams = ['key', 'method'];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'query_params'     => Json::class,
        'request_headers'  => Json::class,
        'request_body'     => Json::class,
        'response_headers' => Json::class,
        'response_body'    => Json::class,
        'related'          => Json::class,
    ];

    /**
     * Dynamic attributes that are appended to object.
     *
     * @var array
     */
    protected $appends = ['related_resources', 'api_credential_name'];

    /**
     * The attributes excluded from the model's JSON form.
     *
     * @var array
     */
    protected $hidden = ['apiCredential'];

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

    /**
     * Get the api credential name or key.
     *
     * @var string
     */
    public function getApiCredentialNameAttribute()
    {
        if (isset($this->apiCredential->name)) {
            return $this->fromCache(
                'apiCredential.name',
                function () {
                    return $this->apiCredential->name . ' (' . $this->apiCredential->key . ')';
                }
            );
        }

        return $this->fromCache('apiCredential.key');
    }

    /**
     * The request relation map.
     */
    public function getRelatedResourcesAttribute()
    {
        // return Utils::mapResourceRelations($this->related ?? []);
    }
}
