<?php

namespace Fleetbase\Models;

use Fleetbase\Traits\Filterable;
use Fleetbase\Traits\HasApiModelBehavior;
use Fleetbase\Traits\HasUuid;
use Fleetbase\Traits\Searchable;

class Dashboard extends Model
{
    use HasUuid;
    use HasApiModelBehavior;
    use Searchable;
    use Filterable;

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'dashboards';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'user_uuid',
        'company_uuid',
        'name',
    ];

    /**
     * The relationships that will always be appended.
     *
     * @var array
     */
    protected $with = ['widgets'];

    /**
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function widgets()
    {
        return $this->hasMany(DashboardWidget::class);
    }
}
