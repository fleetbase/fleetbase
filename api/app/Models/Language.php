<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Language extends Model
{
    use SoftDeletes;

    protected $table = 'languages';

    protected $fillable = [
        'company_uuid',
        'name',
        'code',
        'sort_order',
        'record_status',
        'deleted',
        'created_by_id',
        'updated_by_id',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'record_status' => 'integer',
        'deleted' => 'integer',
        'created_by_id' => 'integer',
        'updated_by_id' => 'integer',
    ];
}
