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

    /**
     * Filter users based on their company user status and current company context.
     * Applies only if a status is provided.
     */
    public function status(?string $status)
    {
        if (!$status) {
            return;
        }

        // Use whereHas to filter users who have a companyUser record with the given status
        $this->builder->whereHas('companyUsers', function ($query) use ($status) {
            $query->where('status', $status);

            // Ensure we're filtering within the current company context
            if ($companyUuid = $this->session->get('company')) {
                $query->where('company_uuid', $companyUuid);
            }
        });
    }

    public function role(?string $roleId)
    {
        if (!$roleId) {
            return;
        }

        $this->builder->whereExists(function ($query) use ($roleId) {
            $query->selectRaw(1)
                ->from('model_has_roles')
                ->join('company_users', 'model_has_roles.model_uuid', '=', 'company_users.uuid')
                ->whereColumn('company_users.user_uuid', 'users.uuid')
                ->where('model_has_roles.model_type', '=', 'Fleetbase\Models\CompanyUser')
                ->where('model_has_roles.role_id', $roleId);

            if ($companyUuid = $this->session->get('company')) {
                $query->where('company_users.company_uuid', $companyUuid);
            }
        });
    }
}
