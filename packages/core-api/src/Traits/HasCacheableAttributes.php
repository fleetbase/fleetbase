<?php

namespace Fleetbase\Traits;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

trait HasCacheableAttributes
{
    public static function bootHasCacheableAttributes(): void
    {
        static::saving(function (Model $model): void {
            /* @var Model|HasCacheableAttributes $model */
            $model->flushAttributesCache();
        });
    }

    /**
     * Retrieve items from cache for model attributes or get from model if not in cache.
     */
    public static function attributeFromCache(Model $target, string $key, $default = null, ?int $ttl = null)
    {
        $cacheKey = $target->getCacheKey($key);
        $cacheTag = $target->getCacheTag();
        $ttl      = $ttl === null ? 60 * 60 * 24 : $ttl;

        $callback = $default instanceof \Closure ? $default : function () use ($target, $key, $default) {
            return data_get($target, $key, $default);
        };

        if ($ttl < 0) {
            return Cache::tags([$cacheTag])->rememberForever($cacheKey, $callback);
        }

        $result = Cache::tags([$cacheTag])->get($cacheKey);

        if ($result === null) {
            $result = $callback();
            Cache::tags([$cacheTag])->put($cacheKey, $result, $ttl);
        }

        return $result;
    }

    /**
     * Retrieve items from cache for model attributes.
     *
     * @param string $key
     * @param int    $ttl
     */
    public function fromCache($key, $default = null, $ttl = null)
    {
        return static::attributeFromCache($this, $key, $default, $ttl);
    }

    /**
     * Public alias method for `attributeFromCache`.
     *
     * @param string $key
     * @param [type] $default
     * @param [type] $ttl
     *
     * @return void
     */
    public function rememberAttribute($key, $default = null, $ttl = null)
    {
        return static::attributeFromCache($this, $key, $default, $ttl);
    }

    /**
     * Public alias method for `attributeFromCache` but defaults ttl -1.
     *
     * @param [type] $key
     * @param [type] $default
     * @param [type] $ttl
     *
     * @return void
     */
    public function rememberAttributeForever($key, $default = null)
    {
        return $this->rememberAttribute($this, $key, $default, -1);
    }

    /**
     * Forgets a cached attribute for this model.
     */
    public function forgetAttribute(string $attribute): bool
    {
        $key = $this->getCacheKey($attribute);

        return Cache::forget($key);
    }

    /**
     * Flushes all attribute cache for this model.
     */
    public function flushAttributesCache(): bool
    {
        $tag = $this->getCacheTag();

        return Cache::tags([$tag])->flush();
    }

    /**
     * Returns a unique cache tag for this model.
     */
    protected function getCacheTag(): string
    {
        return implode(':', [
            $this->attributeCachePrefix ?? 'model_attribute_cache',
            $this->getConnectionName() ?? 'connection',
            $this->getTable(),
            $this->getTempKey(),
        ]);
    }

    /**
     * Returns a unique cache key for this model attribute.
     */
    protected function getCacheKey(string $attribute): string
    {
        return implode(':', [
            $this->attributeCachePrefix ?? 'model_attribute_cache',
            $this->getConnectionName() ?? 'connection',
            $this->getTable(),
            $this->getTempKey(),
            $attribute,
        ]);
    }

    /**
     * Get the temporary key for the instance if the actual key doesn't exists.
     *
     * @return string the temporary key
     */
    protected function getTempKey(): string
    {
        $key = $this->getKey();

        if (!$key) {
            // generate a unique uuid for temp purposes
            return \Illuminate\Support\Str::uuid();
        }

        return $key;
    }
}
