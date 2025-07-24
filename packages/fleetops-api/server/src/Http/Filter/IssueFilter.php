<?php

namespace Fleetbase\FleetOps\Http\Filter;

use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Http\Filter\Filter;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Schema;

class IssueFilter extends Filter
{
    public function queryForInternal()
    {
        $this->builder->where('company_uuid', $this->session->get('company'));
    }

    public function queryForPublic()
    {
        $this->builder->where('company_uuid', $this->session->get('company'));
    }

    // public function query(?string $searchQuery)
    // {
    //     $this->builder->search($searchQuery);
    // }
    public function query(?string $searchQuery)
    {
        if (!empty($searchQuery)) {
            $this->builder->where(function ($query) use ($searchQuery) {
                // Get the table name
                $table = $this->builder->getModel()->getTable();
                
                // Define columns that might exist in issues table
                $searchableColumns = [
                    'subject',           // Often used instead of 'title'
                    'description',
                    'public_id',
                    'internal_id',
                    'status',
                    'priority',
                    'type',
                    'category',
                    'reporter_name',     // Common in issue tracking
                    'assignee_name',
                    'tags',
                    'resolution',
                    'comments'
                ];

                $firstColumn = true;
                foreach ($searchableColumns as $column) {
                    // Only add to query if column exists
                    if (Schema::hasColumn($table, $column)) {
                        if ($firstColumn) {
                            $query->where($column, 'like', '%' . $searchQuery . '%');
                            $firstColumn = false;
                        } else {
                            $query->orWhere($column, 'like', '%' . $searchQuery . '%');
                        }
                    }
                }
                
                // Fallback: if no columns found, search in public_id at least
                if ($firstColumn) {
                    $query->where('public_id', 'like', '%' . $searchQuery . '%');
                }
            });
        }
    }
    public function publicId(?string $publicId)
    {
        $this->builder->searchWhere('public_id', $publicId);
    }

    public function priority($priority)
    {
        if (Str::contains($priority, ',')) {
            $priority = explode(',', $priority);
        }

        if (is_array($priority)) {
            $this->builder->whereIn('priority', $priority);
        } else {
            $this->builder->where('priority', $priority);
        }
    }

    public function status($status)
    {
        if (Str::contains($status, ',')) {
            $status = explode(',', $status);
        }

        if (is_array($status)) {
            $this->builder->whereIn('status', $status);
        } else {
            $this->builder->where('status', $status);
        }
    }

    public function assignee(?string $assignee)
    {
        $this->builder->whereHas('assignedTo', function ($q) use ($assignee) {
            if (Str::isUuid($assignee)) {
                $q->where('uuid', $assignee);
            } elseif (Utils::isPublicId($assignee)) {
                $q->where('public_id', $assignee);
            } else {
                // $q->search($assignee);
                $q->where(function ($subQuery) use ($assignee) {
                    $subQuery->where('name', 'like', '%' . $assignee . '%')
                             ->orWhere('email', 'like', '%' . $assignee . '%');
                });
            }
        });
    }

    public function reporter(?string $reporter)
    {
        $this->builder->whereHas('reportedBy', function ($q) use ($reporter) {
            if (Str::isUuid($reporter)) {
                $q->where('uuid', $reporter);
            } elseif (Utils::isPublicId($reporter)) {
                $q->where('public_id', $reporter);
            } else {
                // $q->search($reporter);
                $q->where(function ($subQuery) use ($reporter) {
                    $subQuery->where('name', 'like', '%' . $reporter . '%')
                             ->orWhere('email', 'like', '%' . $reporter . '%');
                });
            }
        });
    }

    public function driver(?string $driver)
    {
        $this->builder->whereHas('driver', function ($q) use ($driver) {
            if (Str::isUuid($driver)) {
                $q->where('uuid', $driver);
            } elseif (Utils::isPublicId($driver)) {
                $q->where('public_id', $driver);
            } else {
                // $q->search($driver);
                $q->where('name', 'like', '%' . $driver . '%');
            }
        });
    }

    public function vehicle(?string $vehicle)
    {
        $this->builder->whereHas('vehicle', function ($q) use ($vehicle) {
            if (Str::isUuid($vehicle)) {
                $q->where('uuid', $vehicle);
            } elseif (Utils::isPublicId($vehicle)) {
                $q->where('public_id', $vehicle);
            } else {
                // $q->search($vehicle);
                $q->where(function ($subQuery) use ($vehicle) {
                    $subQuery->where('plate_number', 'like', '%' . $vehicle . '%')
                             ->orWhere('make', 'like', '%' . $vehicle . '%')
                             ->orWhere('model', 'like', '%' . $vehicle . '%');
                });
            }
        });
    }

    public function createdAt($createdAt)
    {
        $createdAt = Utils::dateRange($createdAt);

        if (is_array($createdAt)) {
            $this->builder->whereBetween('created_at', $createdAt);
        } else {
            $this->builder->whereDate('created_at', $createdAt);
        }
    }

    public function updatedAt($updatedAt)
    {
        $updatedAt = Utils::dateRange($updatedAt);

        if (is_array($updatedAt)) {
            $this->builder->whereBetween('updated_at', $updatedAt);
        } else {
            $this->builder->whereDate('updated_at', $updatedAt);
        }
    }
}
