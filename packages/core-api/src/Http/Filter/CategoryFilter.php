<?php

namespace Fleetbase\Http\Filter;

use Fleetbase\Support\Utils;
use Illuminate\Support\Str;

class CategoryFilter extends Filter
{
    public function queryForInternal()
    {
        if ($this->request->boolean('core_category')) {
            return;
        }
        $this->builder->where('company_uuid', $this->session->get('company'));
    }

    public function parentsOnly()
    {
        if ($this->request->boolean('parents_only')) {
            $this->builder->whereNull('parent_uuid');
        }
    }

    public function coreCategory($is)
    {
        $is = Utils::isTrue($is);
        if ($is) {
            $this->builder->where('core_category', 1);
        }
    }

    public function parentCategory(?string $id)
    {
        if (Str::isUuid($id)) {
            $this->builder->where('parent_uuid', $id);
        } else {
            $this->builder->whereHas(
                'parent',
                function ($query) use ($id) {
                    $query->where('public_id', $id);
                }
            );
        }
    }
}
