<?php

namespace Fleetbase\FleetOps\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ImportLog extends Model
{
    use HasFactory;

    protected $table = 'import_logs';

    protected $fillable = [
        'uuid',
        'file_uuid',
        'module',
        'status',
        'error_log_file_path',
        'company_uuid',
    ];

    protected $casts = [
        'status' => 'string',
    ];

    // Optional: if you're using UUIDs
    public $incrementing = false;
    protected $keyType = 'string';

    // Scopes for common filters
    public function scopeByCompany($query, $companyUuid)
    {
        return $query->where('company_uuid', $companyUuid);
    }

    public function scopeByModule($query, $module)
    {
        return $query->where('module', $module);
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', strtoupper($status));
    }
}
