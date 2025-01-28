<?php

namespace Fleetbase\Models;

use Fleetbase\Casts\Json;
use Fleetbase\Support\DirectiveParser;
use Fleetbase\Traits\HasUuid;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Facades\Crypt;

class Directive extends Model
{
    use HasUuid;

    /**
     * The database connection to use.
     *
     * @var string
     */
    protected $connection = 'mysql';

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'directives';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = ['uuid', 'company_uuid', 'permission_uuid', 'subject_type', 'subject_uuid', 'key', 'rules'];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'rules'       => Json::class,
    ];

    /**
     * Get the company that owns the directive.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_uuid', 'uuid');
    }

    /**
     * Get the permission associated with the directive.
     */
    public function permission(): BelongsTo
    {
        return $this->belongsTo(Permission::class, 'permission_id');
    }

    /**
     * Get the subject that this directive belongs to.
     */
    public function subject(): MorphTo
    {
        return $this->morphTo(__FUNCTION__, 'subject_type', 'subject_uuid');
    }

    /**
     * Apply the directive's rules to a given query.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     *
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function apply($query)
    {
        return DirectiveParser::apply($query, $this->rules);
    }

    /**
     * Create a unique key based on the rules.
     */
    public static function createKey(array $rules = []): string
    {
        $ruleString = implode(':', $rules);

        return Crypt::encryptString($ruleString);
    }
}
