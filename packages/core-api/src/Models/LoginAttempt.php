<?php

namespace Fleetbase\Models;

use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\Searchable;

class LoginAttempt extends Model
{
    use HasUuid;
    use Searchable;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'login_attempts';

    /**
     * These attributes that can be searched.
     *
     * @var array
     */
    protected $searchColumns = ['identity'];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $with = [];

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = ['session_uuid', 'identity', 'password'];

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
    protected $hidden = ['password', 'identity', 'session_uuid'];

    /**
     * The session during the login attempt if any.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function session()
    {
        return $this->belongsTo(Session::class);
    }

    /**
     * Semantic alias of create.
     */
    public static function track($attributes = [])
    {
        return static::create($attributes);
    }
}
