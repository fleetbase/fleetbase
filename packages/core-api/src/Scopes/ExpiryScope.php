<?php

namespace Fleetbase\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Carbon;

class ExpiryScope implements Scope
{
    /**
     * All of the extensions to be added to the builder.
     *
     * @var array
     */
    protected $extensions = ['WithHasExpiry', 'WithoutHasExpiry', 'OnlyHasExpiry'];

    /**
     * Apply the scope to a given Eloquent query builder.
     *
     * @return void
     */
    public function apply(Builder $builder, Model $model)
    {
        $builder->where($model->getQualifiedExpiredAtColumn(), '>', Carbon::now())
            ->orWhereNull($model->getQualifiedExpiredAtColumn());
    }

    /**
     * Extend the query builder with the needed functions.
     *
     * @return void
     */
    public function extend(Builder $builder)
    {
        foreach ($this->extensions as $extension) {
            $this->{"add{$extension}"}($builder);
        }
    }

    /**
     * Get the "expired at" column for the builder.
     *
     * @return string
     */
    protected function getExpiredAtColumn(Builder $builder)
    {
        if (count($builder->getQuery()->joins) > 0) {
            return $builder->getModel()->getQualifiedExpiredAtColumn();
        }

        return $builder->getModel()->getExpiredAtColumn();
    }

    /**
     * Add the withHasExpiry extension to the builder.
     *
     * @return void
     */
    protected function addWithHasExpiry(Builder $builder)
    {
        $builder->macro('withHasExpiry', function (Builder $builder) {
            return $builder->withoutGlobalScope($this);
        });
    }

    /**
     * Add the without-HasExpiry extension to the builder.
     *
     * @return void
     */
    protected function addWithoutHasExpiry(Builder $builder)
    {
        $builder->macro('withoutHasExpiry', function (Builder $builder) {
            $model = $builder->getModel();

            $builder->withoutGlobalScope($this)->whereNull(
                $model->getQualifiedExpiredAtColumn()
            );

            return $builder;
        });
    }

    /**
     * Add the only-HasExpiry extension to the builder.
     *
     * @return void
     */
    protected function addOnlyHasExpiry(Builder $builder)
    {
        $builder->macro('onlyHasExpiry', function (Builder $builder) {
            $model = $builder->getModel();

            $builder->withoutGlobalScope($this)->whereNotNull(
                $model->getQualifiedExpiredAtColumn()
            );

            return $builder;
        });
    }
}
