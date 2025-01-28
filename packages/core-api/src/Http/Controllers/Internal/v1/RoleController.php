<?php

namespace Fleetbase\Http\Controllers\Internal\v1;

use Fleetbase\Exceptions\FleetbaseRequestValidationException;
use Fleetbase\Http\Controllers\FleetbaseController;
use Fleetbase\Models\Permission;
use Fleetbase\Models\Policy;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RoleController extends FleetbaseController
{
    /**
     * The resource to query.
     *
     * @var string
     */
    public $resource = 'role';

    /**
     * The service which this controller belongs to.
     *
     * @var string
     */
    public $service = 'iam';

    /**
     * Creates a record by an identifier with request payload.
     *
     * @return \Illuminate\Http\Response
     */
    public function createRecord(Request $request)
    {
        // Disable ability to create any Administrator role
        $roleName = strtolower($request->input('role.name', ''));
        if ($roleName === 'administrator' || Str::startsWith($roleName, 'admin')) {
            return response()->error('Creating a role with name "Administrator" or a role name that starts with "Admin" is prohibited, as the name is system reserved.');
        }

        try {
            $record = $this->model->createRecordFromRequest($request, null, function ($request, &$role) {
                // Sync Permissions
                if ($request->isArray('role.permissions')) {
                    $permissions = Permission::whereIn('id', $request->array('role.permissions'))->get();
                    $role->syncPermissions($permissions);
                }

                // Sync Policies
                if ($request->isArray('role.policies')) {
                    $policies = Policy::whereIn('id', $request->array('role.policies'))->get();
                    $role->syncPolicies($policies);
                }
            });

            return ['role' => new $this->resource($record)];
        } catch (\Exception $e) {
            return response()->error($e->getMessage());
        } catch (\Illuminate\Database\QueryException $e) {
            return response()->error($e->getMessage());
        } catch (FleetbaseRequestValidationException $e) {
            return response()->error($e->getErrors());
        }
    }

    /**
     * Updates a record by an identifier with request payload.
     *
     * @return \Illuminate\Http\Response
     */
    public function updateRecord(Request $request, string $id)
    {
        try {
            $record = $this->model->updateRecordFromRequest($request, $id, function ($request, &$role) {
                // Sync Permissions
                if ($request->isArray('role.permissions')) {
                    $permissions = Permission::whereIn('id', $request->array('role.permissions'))->get();
                    $role->syncPermissions($permissions);
                }

                // Sync Policies
                if ($request->isArray('role.policies')) {
                    $policies = Policy::whereIn('id', $request->array('role.policies'))->get();
                    $role->syncPolicies($policies);
                }
            });

            return ['role' => new $this->resource($record)];
        } catch (\Exception $e) {
            return response()->error($e->getMessage());
        } catch (\Illuminate\Database\QueryException $e) {
            return response()->error($e->getMessage());
        } catch (FleetbaseRequestValidationException $e) {
            return response()->error($e->getErrors());
        }
    }
}
