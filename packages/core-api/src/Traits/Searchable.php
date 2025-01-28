<?php

namespace Fleetbase\Traits;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

trait Searchable
{
    public static $searchable = true;

    /**
     * Searches a column where LIKE.
     *
     * @param \Illuminate\Database\Query\Builder $query
     *
     * @return \Illuminate\Database\Query\Builder
     */
    public function scopeSearch($query, $search, ?callable $additionalQuery = null)
    {
        if (method_exists($this, 'search')) {
            return $this->search($search);
        }

        // make sure search is lowercase
        $search = strtolower($search);

        // get all searchable columns
        $columns = $this->getSearchableColumns();

        // convert columns to collection
        $columns = collect($columns);

        // filter out dot annotation paths, this is for relations
        $searchColumns = $columns->filter(function ($column) {
            return !Str::contains($column, ['.']);
        });

        // get relation columns & group by relation path
        $relations = $columns
            ->filter(function ($column) {
                return Str::contains($column, ['.']);
            })
            ->groupBy(function ($column) {
                // convert dot annotation to array
                $relationPathArray = explode('.', $column);
                // get the actual relation
                $trueRelationPath = implode('.', array_slice($relationPathArray, 0, -1));

                // group by true relation path
                return $trueRelationPath;
            })
            ->mapWithKeys(function ($group, $key) {
                // remove key from group path
                $group = $group->map(function ($path) use ($key) {
                    return str_replace($key . '.', '', $path);
                });

                // return new group
                return [$key => $group];
            });

        // query on searchable columns
        return $query->where(function ($q) use ($searchColumns, $relations, $search, $additionalQuery) {
            // search on searchable columns
            foreach ($searchColumns as $column) {
                // handle json columns
                if (Str::contains($column, '->')) {
                    $jsonQueryPath = explode('->', $column);

                    if (count($jsonQueryPath) !== 2) {
                        continue;
                    }

                    $column   = $jsonQueryPath[0];
                    $property = $jsonQueryPath[1];

                    $q->orWhere(DB::raw("lower(json_unquote(json_extract($column, '$.$property')))"), 'LIKE', '%' . str_replace('.', '%', str_replace(',', '%', $search)) . '%');
                    continue;
                }

                $q->orWhere(DB::raw("lower($column)"), 'like', '%' . str_replace('.', '%', str_replace(',', '%', $search)) . '%');
            }

            // do additional query if any
            if (is_callable($additionalQuery)) {
                $additionalQuery($q, $search);
            }

            // now do relations
            foreach ($relations as $relationPath => $searchableRelationColumns) {
                $q->orWhereHas($relationPath, function ($relationQuery) use ($searchableRelationColumns, $search) {
                    $relationQuery->where(function ($relationSubQuery) use ($searchableRelationColumns, $search) {
                        foreach ($searchableRelationColumns as $column) {
                            $relationSubQuery->orWhere(DB::raw("lower($column)"), 'like', '%' . str_replace('.', '%', str_replace(',', '%', $search)) . '%');
                        }
                    });
                });
            }
        });
    }

    /**
     * Get searchable columns defined on the model.
     *
     * @return array
     */
    public function getSearchableColumns()
    {
        return property_exists($this, 'searchableColumns') ? $this->searchableColumns : [];
    }
}
