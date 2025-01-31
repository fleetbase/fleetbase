<?php

namespace Fleetbase\Rules;

use Illuminate\Contracts\Validation\Rule;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class ExistsInAny implements Rule
{
    /**
     * The tables to check exists on.
     */
    public array $tables;

    /**
     * The column to check the value for.
     *
     * @var string|array
     */
    public $column;

    /**
     * Create a new rule instance.
     *
     * @return void
     */
    public function __construct($tables = [], $column = 'NULL')
    {
        // if comma delimited
        if (is_string($tables) && Str::contains($tables, ',')) {
            $tables = explode(',', $tables);
        }

        // if string as single table
        if (is_string($tables)) {
            $tables = [$tables];
        }

        $this->tables = $tables;
        $this->column = $column;
    }

    /**
     * Determine if the validation rule passes.
     *
     * @param string $attribute
     *
     * @return bool
     */
    public function passes($attribute, $value)
    {
        foreach ($this->tables as $table) {
            // hanlde multiple connection check with : -> connection:table
            if (Str::contains($table, ':')) {
                [$connection, $table] = explode(':', $table);
            }

            if (is_array($this->column)) {
                foreach ($this->column as $column) {
                    if (Schema::hasColumn($table, $column)) {
                        $exists = DB::connection($connection ?? config('database.default'))->table($table)->where($column, $value)->exists();
                    }

                    if ($exists) {
                        return true;
                    }
                }
            } else {
                if (Schema::hasColumn($table, $this->column)) {
                    $exists = DB::connection($connection ?? config('database.default'))->table($table)->where($this->column, $value)->exists();
                }
            }

            if ($exists) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get the validation error message.
     *
     * @return string
     */
    public function message()
    {
        return 'The :attribute does not exist.';
    }
}
