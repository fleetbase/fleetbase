<?php

namespace App\Http\Controllers\Api\v1;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller; 
use App\Models\LeaveRequest;
use Illuminate\Support\Str;
use Fleetbase\Support\Auth;
use App\Helpers\UserHelper;
use Fleetbase\FleetOps\Models\Driver;
use App\Helpers\LeaveHelper;
// use Fleetbase\FleetOps\Http\Filter\LeaveRequestFilter;
class LeaveRequestController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function list()
    {
        $perPage = request()->input('per_page', 500);
        $page = request()->input('page', 1);

        // Request filters and their actual DB column mappings
        $filterMap = [
            'status'      => 'status',
            'leave_type'  => 'leave_type',
            'driver'      => 'driver_uuid',  // Map 'driver' → 'driver_uuid'
            'start_date'  => 'start_date',
            'end_date'    => 'end_date',
            'created_at'  => 'created_at',
            'user_uuid'   => 'user_uuid',
        ];

        $dateFields = [ 'created_at'];


        $query = LeaveRequest::with(['user', 'processedBy'])
            ->whereNull('deleted_at')
            ->where([
                ['company_uuid', '=', Auth::getCompany()->uuid],
                ['record_status', '=', 1],
                ['deleted', '=', 0],
            ])
            ->orderBy('id', 'desc');

        // 🔍 Apply filters with mapped columns
    foreach ($filterMap as $requestKey => $columnName) {
        $value = request()->input($requestKey);
        if (!is_null($value)) {
            if (in_array($requestKey, $dateFields)) {
                $query->whereDate($columnName, $value);  // compare only the date part
            } else {
                $query->where($columnName, $value);
            }
        }
    }


        // 📄 Paginate or return all
        if ($perPage > 0) {
            $leaveRequests = $query->paginate($perPage, ['*'], 'page', $page);
            return response()->json([
                'success' => true,
                'data' => $leaveRequests->items(),
                'pagination' => [
                    'current_page' => $leaveRequests->currentPage(),
                    'per_page' => $leaveRequests->perPage(),
                    'total' => $leaveRequests->total(),
                    'last_page' => $leaveRequests->lastPage(),
                    'from' => $leaveRequests->firstItem(),
                    'to' => $leaveRequests->lastItem(),
                ]
            ]);
        } else {
            $leaveRequests = $query->get();
            return response()->json([
                'success' => true,
                'data' => $leaveRequests,
                'total' => $leaveRequests->count(),
            ]);
        }
        
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $company = $request->has('company') ? Auth::getCompanyFromRequest($request) : Auth::getCompany();
        $company_uuid = null;
        if($company){
            $company_uuid = $company->uuid;
        }
        $input = $request->all();
        // Set end_date equal to start_date if not provided
        if (empty($input['end_date'])) {
            $input['end_date'] = $input['start_date'];
        }

        // Check if dates are in the past
        $today = date('Y-m-d');
        if ($input['start_date'] < $today || $input['end_date'] < $today) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot submit leave request for past dates',
            ], 400);
        }

        // Check for overlapping leave requests
        $duplicateRequest = LeaveRequest::where([
                    ['user_uuid', '=', $input['user_uuid']],
                    ['company_uuid', '=', Auth::getCompany()->uuid],
                    ['record_status', '=', 1],
                    ['deleted', '=', 0],
            ])
            ->where(function ($query) use ($input) {
                // Check if any existing leave request overlaps with the new request
                $query->where('start_date', '<=', $input['end_date'])
                      ->where('end_date', '>=', $input['start_date']);
            })
            ->whereNull('deleted_at')
            ->first();

        if ($duplicateRequest) {
            return response()->json([
                'success' => false,
                'message' => 'You already have a leave request for these dates',
            ], 400);
        }
        $input['public_id'] = Str::random(6);
        $input['company_uuid'] = $company_uuid;
        $input['uuid'] = Str::uuid();
        $input['created_by_id'] = UserHelper::getIdFromUuid(auth()->id());
        $leaveRequest = LeaveRequest::create($input);

        return response()->json([
            'success' => true,
            'data' => $leaveRequest
        ]);
        
    }

    /**
     * Display the specified resource.
     */
    public function show(string $uuid)
    {
        // Find the leave request by UUID
        $leaveRequest = LeaveRequest::where('uuid', $uuid)->firstOrFail();
        return response()->json([
            'success' => true,
            'data' => $leaveRequest
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        // Find the leave request by ID
        $leaveRequest = LeaveRequest::where('id', $id)->whereNull('deleted_at')->first();
        if (!$leaveRequest) {
            return response()->json([
                'success' => false,
                'message' => __('messages.request_not_found'),
            ], 400);
        }
        $input = $request->all();

        // Handle approve/reject actions
        if (isset($input['action']) && in_array($input['action'], ['approve', 'reject'])) {
            $leaveRequestProcess = $this->processLeaveRequestAction(
                $leaveRequest,
                $input['action'],
                $input['is_confirmed'] ?? 0, // default to 0 if not set
                $leaveRequest['driver_uuid'],
                $leaveRequest['total_days']
            );
            return $leaveRequestProcess;
        }

        // Set end_date equal to start_date if not provided
        if (empty($input['end_date'])) {
            $input['end_date'] = $input['start_date'];
        }

        // Check if dates are in the past
        $today = date('Y-m-d');
        if ($input['start_date'] < $today || $input['end_date'] < $today) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot submit leave request for past dates',
            ], 400);
        }

        // Only check for overlaps if dates are being changed
        if (
            (isset($input['start_date']) && $input['start_date'] !== $leaveRequest->start_date) ||
            (isset($input['end_date']) && $input['end_date'] !== $leaveRequest->end_date)
        ) {
            // Check for overlapping leave requests
            $existingLeaveRequest = LeaveRequest::where([
                    ['user_uuid', '=', $input['user_uuid']],
                    ['company_uuid', '=', Auth::getCompany()->uuid],
                    ['record_status', '=', 1],
                    ['deleted', '=', 0],
            ])
                ->where(function ($query) use ($input) {
                    $query->where('start_date', '<=', $input['end_date'])
                          ->where('end_date', '>=', $input['start_date']);
                })
                ->whereNull('deleted_at')
                ->where('id', '!=', $leaveRequest->id)
                ->first();

            if ($existingLeaveRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'You already have a leave request for these dates',
                ], 400);
            }
        }

        // Update updated_by_id
        $input['updated_by_id'] = UserHelper::getIdFromUuid(auth()->id());
        $leaveRequest->update($input);

        return response()->json([
            'success' => true,
            'message' => __('messages.request_update_success'),
            'data' => $leaveRequest,
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        // Find the leave request by UUID
        $leaveRequest = LeaveRequest::where([
                    ['id', '=', $id],
                    ['company_uuid', '=', Auth::getCompany()->uuid],
                    ['record_status', '=', 1],
                    ['deleted', '=', 0],
            ])->whereNull('deleted_at')->firstOrFail();
        if(isset($leaveRequest) && !empty($leaveRequest)) {
            // Delete the leave request
            $leaveRequest->deleted_at = now();
            $leaveRequest->record_status = config('params.record_status_archived');
            $leaveRequest->deleted       = config('params.deleted');
            $leaveRequest->updated_by_id = UserHelper::getIdFromUuid(auth()->id());
            $leaveRequest->save();
            return response()->json(['success' => true,'message' => __('messages.request_deleted_success')]);
        }
        else{
            return response()->json(['success' => false, 'message' => __('messages.request_not_found')],400);
        }
        
    }

    /**
     * Process the approve/reject action for a leave request.
     */
    protected function processLeaveRequestAction($leaveRequest, $action, $isConfirmed = 0, $driverUuid = null, $totalDays = null)
    {
        if ($leaveRequest->status === 'Approved' && $action === 'approve') {
            return response()->json([
                'success' => false,
                'message' => __('messages.leave_already_approved'),
            ], 400);
        }
        if ($leaveRequest->status === 'Rejected' && $action === 'reject') {
            return response()->json([
                'success' => false,
                'message' => __('messages.leave_already_rejected'),
            ], 400);
        }
        if ($action === 'approve') {
            // Check leave balance only if not confirmed yet
            // if (!$isConfirmed) {
            //     $warning = LeaveHelper::checkLeaveBalanceWarning($driverUuid, $totalDays);
               
            //     if ($warning) {
            //         return $warning;
            //     }
             
            // }

            $leaveRequest->approved_at = now();
            $leaveRequest->status = 'Approved';
        } else {
            $leaveRequest->status = 'Rejected';
        }

        $leaveRequest->updated_by_id = UserHelper::getIdFromUuid(auth()->id());
        $leaveRequest->processed_by = UserHelper::getIdFromUuid(auth()->id());
        $leaveRequest->save();

        // Only update leave balance if approved and confirmed
        // if ($action === 'approve' && $isConfirmed) {
        //     $driver = Driver::where('uuid', $driverUuid)->first();
        //     if ($driver && isset($leaveRequest->total_days)) {
        //         $driver->leave_balance = max(0, $driver->leave_balance - $leaveRequest->total_days);
        //         $driver->save();
        //     }
        // }
        // Return the updated leave request with proper response
        if ($action === 'approve') {
            //include leave_balance in response
            // $leaveRequest['leave_balance'] = $driver ? $driver->leave_balance : null;
            return response()->json([
                'success' => true,
                'message' => __('messages.request_approve_success'),
                'data' => $leaveRequest
            ]);
        } else {
            return response()->json([
                'success' => true,
                'message' => __('messages.request_reject_success'),
                'data' => $leaveRequest
            ]);
        }    
    }
}