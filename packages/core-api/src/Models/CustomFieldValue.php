<?php

namespace Fleetbase\Models;

use Fleetbase\Casts\CustomValue;
use Fleetbase\Casts\PolymorphicType;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasUuid;

class CustomFieldValue extends Model
{
    use HasUuid;
    use HasApiModelBehavior;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'custom_field_values';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = ['company_uuid', 'custom_field_uuid', 'subject_uuid', 'subject_type', 'value', 'value_type'];

    /**
     * The attributes that are guarded.
     *
     * @var array
     */
    protected $guarded = [];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'value'                      => CustomValue::class,
        'subject_type'               => PolymorphicType::class,
    ];

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function subject()
    {
        return $this->morphTo(__FUNCTION__, 'subject_type', 'subject_uuid');
    }

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
    public function customField()
    {
        return $this->belongsTo(CustomField::class);
    }

    public function getCustomFieldLabelAttribute(): ?string
    {
        if ($this->customField) {
            return $this->customField->label;
        }

        return null;
    }
}
