<?php

namespace Fleetbase\Traits;

use Fleetbase\Scopes\ExpiryScope;
use Illuminate\Support\Carbon;

trait Expirable
{
    /**
     * Set the revival time.
     *
     * @var int
     */
    public $revivalTime = 24 * 60 * 60;

    /**
     * Conver the expiry datetime to timestamp.
     *
     * @return int
     */
    public function expiresAtTimestamp()
    {
        $column = $this->getExpiredAtColumn();

        return strtotime($this->{$column});
    }

    /**
     * Boot the soft deleting trait for a model.
     *
     * @return void
     */
    public static function bootExpirable()
    {
        static::addGlobalScope(new ExpiryScope());
    }

    /**
     * Revive an expired model instance.
     *
     * @param null $revivalTime
     *
     * @return bool|null
     */
    public function reviveExpired($revivalTime = null)
    {
        $column = $this->getExpiredAtColumn();

        if ($this->{$column} < Carbon::now()) {
            $revivalTime = $revivalTime ? $revivalTime : $this->revivalTime;

            if (!empty($revivalTime)) {
                $this->{$this->getExpiredAtColumn()} = Carbon::now()->addSeconds($revivalTime);

                $result = $this->save();

                return $result;
            }
        }

        return false;
    }

    /**
     * return number of seconds left in model's life.
     *
     * @return int/bool
     */
    public function timeToLive()
    {
        $column = $this->getExpiredAtColumn();

        if (is_object($this->{$column})) {
            return -1 * $this->{$column}->diffInSeconds(Carbon::now(), false);
        }

        return false;
    }

    /**
     * check if model is expired.
     *
     * @return bool
     */
    public function hasExpired()
    {
        $column = $this->getExpiredAtColumn();

        if (is_object($this->{$column})) {
            return $this->{$column} < Carbon::now();
        }

        return false;
    }

    /**
     * Get the name of the "expires at" column.
     *
     * @return string
     */
    public function getExpiredAtColumn()
    {
        return isset(static::$expires_at) ? static::$expires_at : 'expires_at';
    }

    /**
     * Get the fully qualified "expires at" column.
     *
     * @return string
     */
    public function getQualifiedExpiredAtColumn()
    {
        return $this->getTable() . '.' . $this->getExpiredAtColumn();
    }

    /**
     * Get Model settings configuration for the current model,.
     *
     * @return array
     */
    private function getConfiguration()
    {
        static $defaultConfig = null;

        if ($defaultConfig === null) {
            $defaultConfig = app('config')->get('expirable');
        }

        return $defaultConfig[class_basename($this)];
    }
}
