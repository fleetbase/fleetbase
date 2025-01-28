<?php

namespace Fleetbase\Models;

use Fleetbase\Casts\Json;
use Fleetbase\Traits\Filterable;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\Searchable;

class WebhookRequestLog extends Model
{
    use HasUuid;
    use HasApiModelBehavior;
    use HasPublicId;
    use Searchable;
    use Filterable;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'webhook_request_logs';

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'webhook_req';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        '_key',
        'public_id',
        'company_uuid',
        'webhook_uuid',
        'api_credential_uuid',
        'access_token_id',
        'api_event_uuid',
        'method',
        'status_code',
        'reason_phrase',
        'duration',
        'url',
        'attempt',
        'response',
        'status',
        'headers',
        'meta',
        'sent_at',
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'response' => Json::class,
        'headers'  => Json::class,
        'meta'     => Json::class,
    ];

    /**
     * Relationships to always append to model.
     *
     * @var array
     */
    protected $with = ['apiEvent'];

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
    public function webhook()
    {
        return $this->belongsTo(WebhookEndpoint::class);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function apiCredential()
    {
        return $this->belongsTo(ApiCredential::class);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function apiEvent()
    {
        return $this->belongsTo(ApiEvent::class);
    }

    /**
     * Always uppercase the `method` when saving.
     *
     * @param string $value
     *
     * @return void
     */
    public function setMethodAttribute($value)
    {
        $this->attributes['method'] = strtoupper($value);
    }
}
