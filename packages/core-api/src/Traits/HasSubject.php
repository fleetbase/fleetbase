<?php

namespace Fleetbase\Traits;

trait HasSubject
{
    /**
     * Set subject on trait owner.
     *
     * @param \Fleetbase\Models\Model $model
     * @param bool                    $save
     *
     * @return $this
     */
    public function setSubject($model, $save = false)
    {
        $this->subject_uuid = $model->uuid;
        $this->subject_type =  get_class($model);

        if ($save) {
            $this->save();
        }

        return $this;
    }

    /**
     * The resource related to this type if any.
     *
     * @return \Illuminate\Database\Eloquent\Relations\MorphTo
     */
    public function subject()
    {
        return $this->morphTo();
    }
}
