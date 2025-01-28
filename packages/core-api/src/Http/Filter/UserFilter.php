<?php

namespace Fleetbase\Http\Filter;

class UserFilter extends Filter
{
    public function queryForInternal()
    {
        $this->builder->where(
            function ($query) {
                $query
                    ->whereHas(
                        'companyUsers',
                        function ($query) {
                            $query->where('company_uuid', $this->session->get('company'));
                        }
                    );
            }
        );
    }

    public function queryForPublic()
    {
        $this->queryForInternal();
    }

    public function isNotAdmin()
    {
        $this->builder->where('type', '!=', 'admin');
    }

    public function query(?string $query)
    {
        $this->builder->search($query);
    }

    public function name(?string $name)
    {
        $this->builder->searchWhere('name', $name);
    }

    public function phone(?string $phone)
    {
        $this->builder->searchWhere('phone', $phone);
    }

    public function email(?string $email)
    {
        $this->builder->searchWhere('email', $email);
    }

    public function role(?string $roleId)
    {
        $this->builder->whereHas('roles', function ($query) use ($roleId) {
            $query->where('id', $roleId);
        });
    }
}
