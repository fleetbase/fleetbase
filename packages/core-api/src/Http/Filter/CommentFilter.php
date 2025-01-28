<?php

namespace Fleetbase\Http\Filter;

use Fleetbase\Support\Utils;
use Illuminate\Support\Str;

class CommentFilter extends Filter
{
    public function queryForInternal()
    {
        $this->builder->where('company_uuid', $this->session->get('company'));
    }

    public function queryForPublic()
    {
        $this->queryForInternal();
    }

    public function parent(string $id)
    {
        if (Str::isUuid($id)) {
            $this->builder->where('parent_comment_uuid', $id);
        }

        if (Utils::isPublicId($id)) {
            $this->builder->whereHas('parent', function ($query) use ($id) {
                $this->builder->where('public_id', $id);
            });
        }
    }

    public function withoutParent()
    {
        $this->builder->whereNull('parent_comment_uuid');
    }
}
