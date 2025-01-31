<?php

namespace Fleetbase\Traits;

use Fleetbase\Support\Utils;
use Illuminate\Support\Str;

trait HasAliases
{
    /**
     * Set aliases data.
     */
    public function setAliasesAttribute($value)
    {
        $this->attributes['aliases'] = is_array($value) ? json_encode($value) : $value;
    }

    /**
     * Get alias data.
     */
    public function getAliasesAttribute($aliases)
    {
        return json_decode($aliases) ?? [];
    }

    /**
     * Adds a new alias, returns false if alias could not be added.
     *
     * @return void|bool
     */
    public function addAlias(string $entry)
    {
        $entry   = strtolower($entry);
        $aliases = Utils::get($this, 'aliases', []);

        // push new entry into aliases if doesnt exist already
        if ($this && !in_array($entry, $aliases) && !Str::contains($entry, ['-', '+', '/', '\\'])) {
            $aliases[] = $entry;

            return $this->update(['aliases' => $aliases]);
        }

        return false;
    }

    /**
     * Cleans aliases by ensuring aliases array is unique and has no falsy values.
     *
     * @return void
     */
    public function cleanAliases()
    {
        $aliases = data_get($this, 'aliases') ?? [];

        // clean them via map
        $this->aliases = collect($aliases)
            ->map(function ($alias) {
                return trim(strtolower($alias));
            })
            ->filter()
            ->unique()
            ->values()
            ->toArray();

        // save cleanup
        return $this->save();
    }

    /**
     * A helper function to see if alias is found within model.
     *
     * @param string $search
     *
     * @return bool
     */
    public function hasAlias($search)
    {
        return in_array($search, array_map('strtolower', $this->aliases ?? []));
    }

    /**
     * A static alias for hasAlias().
     *
     * @param string $search
     *
     * @return bool
     */
    public static function includesAlias($search)
    {
        return in_array($search, array_map('strtolower', static::$aliases ?? []));
    }
}
