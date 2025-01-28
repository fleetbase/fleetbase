<?php

namespace Fleetbase\Http\Controllers\Internal\v1;

use Fleetbase\Exceptions\FleetbaseRequestValidationException;
use Fleetbase\Exports\GroupExport;
use Fleetbase\Http\Controllers\FleetbaseController;
use Fleetbase\Http\Requests\ExportRequest;
use Fleetbase\Models\GroupUser;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;

class GroupController extends FleetbaseController
{
    /**
     * The resource to query.
     *
     * @var string
     */
    public $resource = 'group';

    /**
     * The service which this controller belongs to.
     *
     * @var string
     */
    public $service = 'iam';

    /**
     * Creates a record with request payload.
     *
     * @return \Illuminate\Http\Response
     */
    public function createRecord(Request $request)
    {
        try {
            $record = $this->model->createRecordFromRequest($request, null, function (&$request, &$group) {
                $users = $request->input('group.users');

                foreach ($users as $id) {
                    GroupUser::firstOrCreate([
                        'group_uuid' => $group->uuid,
                        'user_uuid'  => $id,
                    ]);
                }

                $group->load(['users']);
            });

            return ['group' => new $this->resource($record)];
        } catch (\Exception $e) {
            return response()->error($e->getMessage());
        } catch (\Illuminate\Database\QueryException $e) {
            return response()->error($e->getMessage());
        } catch (FleetbaseRequestValidationException $e) {
            return response()->error($e->getErrors());
        }
    }

    /**
     * Updated a record with request payload.
     *
     * @return \Illuminate\Http\Response
     */
    public function updateRecord(Request $request, string $id)
    {
        try {
            $record = $this->model->updateRecordFromRequest($request, $id, function (&$request, &$group) {
                $users = $request->input('group.users');

                // users should always be an array of user ids
                // we will first delete all group users where id is not in this array
                GroupUser::whereNotIn('user_uuid', $users)->delete();

                foreach ($users as $id) {
                    GroupUser::firstOrCreate([
                        'group_uuid' => $group->uuid,
                        'user_uuid'  => $id,
                    ]);
                }

                $group->load(['users']);
            });

            return ['group' => new $this->resource($record)];
        } catch (\Exception $e) {
            return response()->error($e->getMessage());
        } catch (\Illuminate\Database\QueryException $e) {
            return response()->error($e->getMessage());
        } catch (FleetbaseRequestValidationException $e) {
            return response()->error($e->getErrors());
        }
    }

    /**
     * Export the groups to excel or csv.
     *
     * @return \Illuminate\Http\Response
     */
    public static function export(ExportRequest $request)
    {
        $format   = $request->input('format', 'xlsx');
        $fileName = trim(Str::slug('groups-' . date('Y-m-d-H:i')) . '.' . $format);

        return Excel::download(new GroupExport(), $fileName);
    }
}
