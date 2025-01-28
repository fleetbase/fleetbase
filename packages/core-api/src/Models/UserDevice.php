<?php

namespace Fleetbase\Models;

use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;

class UserDevice extends Model
{
    use HasUuid;
    use HasPublicId;
    use HasApiModelBehavior;

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'user_device';

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'user_devices';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = ['user_uuid', 'platform', 'token', 'status'];

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
}
