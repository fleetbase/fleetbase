<?php

namespace Fleetbase\Traits;

use Fleetbase\Support\Utils;

trait HasPublicId
{
    /**
     * Boot the public id trait for the model.
     *
     * @return void
     */
    public static function bootHasPublicId()
    {
        static::creating(
            function ($model) {
                if (Utils::isset($model, 'public_id')) {
                    return;
                }

                $model->public_id = static::generatePublicId($model->publicIdType);
            }
        );
    }

    /**
     * Generate a hashid.
     *
     * @return string
     */
    public static function getPublicId()
    {
        $sqids  = new \Sqids\Sqids();
        $hashid = lcfirst($sqids->encode([time(), rand(), rand()]));
        $hashid = substr($hashid, 0, 7);

        return $hashid;
    }

    public static function generatePublicId(?string $type = null): string
    {
        $model  = new static();
        if (is_null($type)) {
            $type = static::getPublicIdType() ?? strtolower(Utils::classBasename($model));
        }
        $hashid = static::getPublicId();
        $exists = $model->where('public_id', 'like', '%' . $hashid . '%')->withTrashed()->exists();

        if ($exists) {
            return static::generatePublicId($type);
        }

        return $hashid;
    }

    /**
     * The resource table name.
     *
     * @var string|null
     */
    public static function getPublicIdType(): ?string
    {
        return with(new static())->publicIdType;
    }
}
