<?php

namespace Fleetbase\Traits;

use Illuminate\Support\Carbon;

trait Insertable
{
    /**
     * Bulk insert for model as well as generate uuid and setting created_at.
     */
    public static function bulkInsert(array $rows = []): bool
    {
        $model = new static();

        for ($i = 0; $i < count($rows); $i++) {
            $rows[$i]['uuid']       = static::generateUuid();
            $rows[$i]['created_at'] = Carbon::now()->toDateTimeString();

            if ($model->isFillable('public_id')) {
                $rows[$i]['public_id'] = static::generatePublicId();
            }

            if ($model->isFillable('internal_id')) {
                $rows[$i]['internal_id'] = static::generateInternalId();
            }

            if (method_exists($model, 'fillSessionAttributes')) {
                $rows[$i] = $model->fillSessionAttributes($rows[$i]);
            }

            if (method_exists($model, 'onRowInsert')) {
                $rows[$i] = static::onRowInsert($rows[$i]);
            }

            // remove invalid keys
            $keys = array_keys($rows[$i]);
            foreach ($keys as $key) {
                if (!$model->isFillable($key) && !in_array($key, ['uuid', 'public_id'])) {
                    unset($rows[$i][$key]);
                }
            }
        }

        $result = static::insert($rows);

        // flush cache
        if (method_exists($model, 'flushCache')) {
            $model->flushCache();
        }

        return $result;
    }
}
