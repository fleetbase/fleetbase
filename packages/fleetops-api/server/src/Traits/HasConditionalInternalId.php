<?php

namespace Fleetbase\FleetOps\Traits;

use Fleetbase\Traits\HasInternalId as BaseHasInternalId;

trait HasConditionalInternalId
{
    use BaseHasInternalId;

    /**
     * Boot the conditional internal id trait for the model.
     *
     * @return void
     */
    public static function bootHasConditionalInternalId()
    {
        static::creating(function ($model) {
            // Only generate internal_id if it's explicitly null AND not from import
            if ($model->internal_id === null && !$model->isFromImport()) {
                $model->internal_id = static::generateInternalId($model->internal_id);
            }
        });
    }

    /**
     * Check if the model is being created from import process.
     *
     * @return bool
     */
    protected function isFromImport()
    {
        // Check if this is from import by looking for import-specific attributes
        return $this->getAttribute('_from_import') === true || 
               $this->getAttribute('_import_source') !== null;
    }

    /**
     * Mark the model as being created from import.
     *
     * @return $this
     */
    public function markAsFromImport()
    {
        $this->setAttribute('_from_import', true);
        return $this;
    }

    /**
     * Set import source for conditional internal_id generation.
     *
     * @param string $source
     * @return $this
     */
    public function setImportSource($source)
    {
        $this->setAttribute('_import_source', $source);
        return $this;
    }
}
