<?php

namespace Fleetbase\Http\Controllers\Internal\v1;

use Fleetbase\Http\Controllers\Controller;
use Fleetbase\Models\CompanyUser;
use Fleetbase\Models\Group;
use Fleetbase\Models\Policy;
use Fleetbase\Models\Role;

class MetricController extends Controller
{
    /**
     * Get all relevant IAM metrics.
     *
     * @return \Illuminate\Http\Response
     */
    public function iam()
    {
        $metrics = [];
        // get number of users
        $metrics['users_count'] = CompanyUser::where('company_uuid', session('company'))->whereNull('deleted_at')->whereHas('user', function ($query) {
            $query->whereNull('deleted_at');
        })->count();
        // get number of groups
        $metrics['groups_count'] = Group::where('company_uuid', session('company'))->count();
        // get number of iams
        $metrics['roles_count'] = Role::where('company_uuid', session('company'))->count();
        // get number of roles
        $metrics['policy_count'] = Policy::where('company_uuid', session('company'))->count();

        return response()->json($metrics);
    }
}
