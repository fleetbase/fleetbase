<?php

namespace Fleetbase\Support;

use Fleetbase\LaravelMysqlSpatial\Eloquent\Builder as SpatialQueryBuilder;
use Illuminate\Database\Query\Builder;
use Illuminate\Database\Query\Expression;

/**
 * @TODO complete optimizer to remove duplicate where and joins from query builder.
 */
class QueryOptimizer
{
    /**
     * Removes duplicate where clauses from the query builder while correctly handling bindings.
     *
     * This method ensures that duplicate where clauses are removed from the query builder.
     * It also correctly manages the bindings, particularly for nested queries and special clauses
     * like 'Exists' and 'NotExists', by tracking the index of each binding and associating it
     * with its respective where clause. Special attention is given to clauses that involve
     * multiple values, such as 'In', 'NotIn', and 'Between', ensuring that each value is
     * correctly processed.
     *
     * @param Builder $query the query builder instance to optimize
     *
     * @return Builder the optimized query builder with unique where clauses
     */
    public static function removeDuplicateWheres(SpatialQueryBuilder|Builder $query): SpatialQueryBuilder|Builder
    {
        $wheres = $query->getQuery()->wheres;

        // Track bindings separately to ensure they are not lost or mismatched
        $bindings          = $query->getQuery()->bindings['where'];
        $uniqueBindings    = [];
        $processedBindings = [];
        $index             = 0;

        // dump($wheres, $bindings);

        // Filter out duplicate where clauses
        $uniqueWheres = collect($wheres)->unique(function ($where, $key) use (&$bindings, &$uniqueBindings, &$processedBindings, &$index) {
            $normalized = static::normalizeWhereClause($where);
            $decoded    = static::decodeNormalized($normalized);

            // Handle 'Exists' and 'NotExists' clauses by returning them as unique without duplication
            if ($decoded['type'] === 'Exists' || $decoded['type'] === 'NotExists') {
                // Check if has no wheres with values
                $containsWhereWithValue = collect($decoded['wheres'])->contains(function ($decodedWhere) {
                    return isset($decodedWhere['value']) || isset($decodedWhere['values']);
                });

                if (!$containsWhereWithValue) {
                    $index++;

                    return $normalized;
                }
            }

            // Has nested where values
            $isNested = in_array($decoded['type'], ['Exists', 'NotExists', 'Nested']);

            // Check if this normalized clause already exists
            if (!isset($uniqueBindings[$normalized])) {
                // If nested, ensure bindings remain for each nested clause
                if ($isNested && is_array($decoded['wheres'])) {
                    foreach ($decoded['wheres'] as $i => $decodedWhere) {
                        $doesntHaveValue = !isset($decodedWhere['value']) && !isset($decodedWhere['values']);
                        if ($doesntHaveValue) {
                            continue;
                        }

                        // If values store the $decodedWhere for each value
                        if (isset($decodedWhere['values'])) {
                            $decodedWhereValues = json_decode($decodedWhere['values']);
                            foreach ($decodedWhereValues as $decodedWhereValue) {
                                $decodedWhereKey                               = [...$decodedWhere, '_value' => $bindings[$index]];
                                $uniqueBindings[json_encode($decodedWhereKey)] = $bindings[$index] ?? null;
                                $processedBindings[]                           = $bindings[$index] ?? null;
                                $index++;
                            }
                            continue;
                        }

                        $uniqueBindings[json_encode($decodedWhere)] = $bindings[$index] ?? null;
                        $processedBindings[]                        = $bindings[$index] ?? null;
                        $index++;
                    }
                } else {
                    // If it's unique, save the binding and mark it as processed
                    $uniqueBindings[$normalized] = $bindings[$index] ?? null;
                    $processedBindings[]         = $bindings[$index] ?? null;
                    $index++;
                }
            }

            return $normalized;
        })->values()->all();

        // Get unique bindings
        $uniqueBindings = array_filter(array_values($uniqueBindings));

        // dd($uniqueWheres, $uniqueBindings);

        // Reset the original wheres and replace them with the unique ones
        $query->getQuery()->wheres = $uniqueWheres;

        // Replace the bindings with the unique ones
        $query->getQuery()->bindings['where'] = $uniqueBindings;

        return $query;
    }

    /**
     * Normalizes a where clause to create a unique key for comparison.
     *
     * This method converts a where clause into a JSON string that serves as a unique identifier.
     * It handles various types of where clauses, including nested queries, 'Exists', 'NotExists',
     * and others, ensuring that each clause can be uniquely identified and compared.
     *
     * @param array $where the where clause to normalize
     *
     * @return string a JSON-encoded string that uniquely represents the where clause
     */
    protected static function normalizeWhereClause(array $where): string
    {
        switch ($where['type']) {
            case 'Nested':
                // Recursively normalize the nested query
                $nestedWheres = collect($where['query']->wheres)->map(function ($nestedWhere) {
                    return static::normalizeWhereClause($nestedWhere);
                })->all();

                return json_encode([
                    'type'    => $where['type'],
                    'wheres'  => $nestedWheres,
                    'boolean' => $where['boolean'],
                ]);

            case 'Basic':
                return json_encode([
                    'type'    => $where['type'],
                    'column'  => $where['column'] ?? '',
                    'operator'=> $where['operator'] ?? '=',
                    'value'   => $where['value'] instanceof Expression ? (string) $where['value'] : json_encode($where['value']),
                    'boolean' => $where['boolean'] ?? 'and',
                ]);

            case 'In':
            case 'NotIn':
                return json_encode([
                    'type'    => $where['type'],
                    'column'  => $where['column'] ?? '',
                    'values'  => json_encode($where['values'] ?? []),
                    'boolean' => $where['boolean'] ?? 'and',
                ]);

            case 'Null':
            case 'NotNull':
                return json_encode([
                    'type'    => $where['type'],
                    'column'  => $where['column'] ?? '',
                    'boolean' => $where['boolean'] ?? 'and',
                ]);

            case 'Between':
                return json_encode([
                    'type'    => $where['type'],
                    'column'  => $where['column'] ?? '',
                    'values'  => json_encode($where['values'] ?? []),
                    'boolean' => $where['boolean'] ?? 'and',
                ]);

            case 'Exists':
            case 'NotExists':
                // Recursively normalize the nested subquery within Exists/NotExists clauses
                $subqueryWheres = collect($where['query']->wheres)->map(function ($subWhere) {
                    return static::normalizeWhereClause($subWhere);
                })->all();

                return json_encode([
                    'type'    => $where['type'],
                    'wheres'  => $subqueryWheres,
                    'boolean' => $where['boolean'] ?? 'and',
                ]);

            case 'Raw':
                return json_encode([
                    'type'    => $where['type'],
                    'sql'     => $where['sql'] ?? '',
                    'boolean' => $where['boolean'] ?? 'and',
                ]);

            default:
                // Handle any other types of where clauses if necessary
                return json_encode($where);
        }
    }

    /**
     * Decodes a normalized where clause back into an array.
     *
     * This method takes a JSON-encoded where clause string and decodes it back into
     * an associative array. It also handles decoding nested where clauses, ensuring
     * that the structure is preserved for further processing.
     *
     * @param string $normalized the JSON-encoded where clause
     *
     * @return array the decoded where clause as an associative array
     */
    protected static function decodeNormalized(string $normalized): array
    {
        $decoded = json_decode($normalized, true);
        if (isset($decoded['wheres']) && is_array($decoded['wheres'])) {
            $decoded['wheres'] = array_map(function ($whereJson) {
                return json_decode($whereJson, true);
            }, $decoded['wheres']);
        }

        return $decoded;
    }
}
