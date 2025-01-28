<?php

namespace Fleetbase\Models;

use Fleetbase\Casts\Json;
use Fleetbase\Traits\Expirable;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class Invite extends Model
{
    use HasUuid;
    use HasPublicId;
    use Expirable;
    use HasApiModelBehavior;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'invites';

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'invite';

    /**
     * The database connection to use.
     *
     * @var string
     */
    protected $connection = 'mysql';

    /**
     * These attributes that can be queried.
     *
     * @var array
     */
    protected $searchableColumns = [];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        '_key',
        'company_uuid',
        'created_by_uuid',
        'subject_uuid',
        'subject_type',
        'public_id',
        'uri',
        'code',
        'protocol',
        'recipients',
        'reason',
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
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'recipients' => Json::class,
    ];

    /**
     * Generate a unqiue uri on creation.
     *
     * @return void
     */
    public static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            // generate uri
            $sqids = new \Sqids\Sqids();
            $uri   = lcfirst($sqids->encode([time(), rand(), rand()]));
            $uri   = substr($uri, 0, 12);

            $model->uri = $uri;

            // generate code
            $model->code = strtoupper(Str::random(7));
        });
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function createdBy()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\MorphTo
     */
    public function subject()
    {
        return $this->morphTo(__FUNCTION__, 'subject_type', 'subject_uuid');
    }

    /**
     * Set a default expiration of "1 hour".
     *
     * @return void
     */
    public function setExpiresAtAttribute($expiry)
    {
        $this->attributes['expires_at'] = $expiry ? Carbon::parse($expiry) : Carbon::now()->addHour();
    }

    public static function isAlreadySentToJoinCompany(User $user, Company $company): bool
    {
        return static::isAlreadySent($company, $user->email, 'join_company');
    }

    public static function isAlreadySent(Company $company, string $email, string $reason, string $protocol = 'email'): bool
    {
        return static::where([
            'company_uuid' => $company->uuid,
            'subject_uuid' => $company->uuid,
            'protocol'     => $protocol,
            'reason'       => $reason,
        ])->whereJsonContains('recipients', $email)->exists();
    }
}
