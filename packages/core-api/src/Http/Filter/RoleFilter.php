<?php

namespace Fleetbase\Http\Filter;

class RoleFilter extends Filter
{
    public function queryForInternal()
    {
        if ($this->request->filled('type')) {
            return;
        }

        $this->builder->where(
            function ($query) {
                $query->where('company_uuid', $this->session->get('company'))->orWhereNull('company_uuid');
            }
        );

         if ($this->request->boolean('limit_basic')) {
            $this->builder->whereIn('name', ['Driver', 'Driver Coordinator', 'Administrator']);
        }
    }

    public function query(?string $query)
    {
        $this->builder->search($query);
    }

    public function type(?string $type)
    {
        switch ($type) {
            case 'flb-managed':
                $this->builder->whereNull('company_uuid');
                break;
            case 'org-managed':
            default:
                $this->builder->where('company_uuid', $this->session->get('company'));
                break;
        }
    }
}
