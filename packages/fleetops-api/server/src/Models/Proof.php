<?php

namespace Fleetbase\FleetOps\Models;

use Fleetbase\Casts\Json;
use Fleetbase\Models\Model;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasPublicId;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\TracksApiCredential;

class Proof extends Model
{
    use HasUuid;
    use HasPublicId;
    use HasApiModelBehavior;
    use TracksApiCredential;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'proofs';

    /**
     * The type of public Id to generate.
     *
     * @var string
     */
    protected $publicIdType = 'proof';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = ['company_uuid', 'file_uuid', 'order_uuid', 'subject_uuid', 'subject_type', 'remarks', 'raw_data', 'data'];

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
    protected $appends = ['file_url'];

    /**
     * The attributes excluded from the model's JSON form.
     *
     * @var array
     */
    protected $hidden = [];

    /**
     * The image file assosciated with the proof.
     */
    public function file()
    {
        return $this->belongsTo(\Fleetbase\Models\File::class);
    }

    /**
     * The order proof was added to.
     */
    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Get avatar URL attribute.
     */
    public function getFileUrlAttribute()
    {
        return $this->fromCache('file.url', null);
    }

    /**
     * Subject proof is for.
     */
    public function subject()
    {
        return $this->morphTo(__FUNCTION__, 'subject_type', 'subject_uuid')->withoutGlobalScopes();
    }
}
