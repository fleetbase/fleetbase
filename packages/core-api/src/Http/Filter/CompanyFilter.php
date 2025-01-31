<?php

namespace Fleetbase\Http\Filter;

class CompanyFilter extends Filter
{
    public function queryForInternal()
    {
        // If admin query then do not filter
        $isAdminQuery = $this->request->input('view') === 'admin' && $this->request->user()->isAdmin();
        if ($isAdminQuery) {
            return;
        }

        // Otherwise filter so that user only see's their own companies
        $this->builder->where(
            function ($query) {
                $query
                    ->where('owner_uuid', $this->session->get('user'))
                    ->orWhereHas(
                        'users',
                        function ($query) {
                            $query->where('users.uuid', $this->session->get('user'));
                        }
                    );
            }
        );
    }

    public function query(?string $searchQuery)
    {
        $this->builder->searchWhere('name', $searchQuery);
    }

    public function name(?string $name)
    {
        $this->builder->searchWhere('name', $name);
    }

    public function country(?string $country)
    {
        $this->builder->searchWhere('country', $country);
    }
}
