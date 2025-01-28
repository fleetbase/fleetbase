<?php

namespace Fleetbase\Http\Controllers\Internal\v1;

use Carbon\Carbon;
use Fleetbase\Http\Controllers\Controller;
use Fleetbase\Http\Requests\AdminRequest;
use Spatie\ScheduleMonitor\Models\MonitoredScheduledTask;
use Spatie\ScheduleMonitor\Models\MonitoredScheduledTaskLogItem;

class ScheduleMonitorController extends Controller
{
    /**
     * Retrieve all scheduled tasks.
     *
     * This method returns a list of all monitored scheduled tasks.
     *
     * @param AdminRequest $request the incoming admin request
     *
     * @return \Illuminate\Http\JsonResponse returns the list of tasks as a JSON response
     */
    public function tasks(AdminRequest $request)
    {
        $tasks = MonitoredScheduledTask::all();
        $tasks = $tasks->map(function ($task) {
            $task->last_started_at_fmt  = $task->last_started_at instanceof Carbon ? $task->last_started_at->format('H:i j, M Y') : '-';
            $task->last_finished_at_fmt = $task->last_finished_at instanceof Carbon ? $task->last_finished_at->format('H:i j, M Y') : '-';
            $task->last_failed_at_fmt   = $task->last_failed_at instanceof Carbon ? $task->last_failed_at->format('H:i j, M Y') : '-';

            return $task;
        });

        return response()->json($tasks);
    }

    /**
     * Retrieve log entries for a specific task.
     *
     * This method returns all log entries associated with a given scheduled task.
     *
     * @param int          $taskId  the ID of the monitored scheduled task
     * @param AdminRequest $request the incoming admin request
     *
     * @return \Illuminate\Http\JsonResponse returns the task logs as a JSON response
     */
    public function logs($taskId, AdminRequest $request)
    {
        $logs = MonitoredScheduledTaskLogItem::where('monitored_scheduled_task_id', $taskId)->latest('created_at')->take(20)->where('type', 'finished')->get();
        $logs = $logs->map(function ($log) {
            $log->created_at_fmt = $log->created_at instanceof Carbon ? $log->created_at->format('H:i Y-m-d') : '-';

            return $log;
        });

        return response()->json($logs);
    }

    /**
     * Finds a monitored scheduled task by its ID and returns it with formatted dates.
     *
     * This method retrieves a monitored scheduled task based on the provided task ID.
     * If the task is found, it formats the date-related fields (`last_started_at`,
     * `last_finished_at`, `last_failed_at`) into a more readable format.
     * If the task is not found, it returns a 404 error response.
     *
     * @param int|string   $taskId  the ID of the monitored scheduled task to find
     * @param AdminRequest $request the incoming request, containing any additional parameters
     *
     * @return \Illuminate\Http\JsonResponse returns a JSON response with the task data or an error message
     */
    public function findRecord($taskId, AdminRequest $request)
    {
        $task = MonitoredScheduledTask::where('id', $taskId)->first();
        if ($task) {
            $task->last_started_at_fmt  = $task->last_started_at instanceof Carbon ? $task->last_started_at->format('H:i j, M Y') : '-';
            $task->last_finished_at_fmt = $task->last_finished_at instanceof Carbon ? $task->last_finished_at->format('H:i j, M Y') : '-';
            $task->last_failed_at_fmt   = $task->last_failed_at instanceof Carbon ? $task->last_failed_at->format('H:i j, M Y') : '-';

            return response()->json($task);
        }

        return response()->error('No monitored task found.', 404);
    }
}
