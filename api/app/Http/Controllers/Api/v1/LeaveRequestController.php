<?php

namespace App\Http\Controllers\Api\v1;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller; 
use App\Models\LeaveRequest;
use Illuminate\Support\Str;
use Fleetbase\Support\Auth;
use App\Helpers\UserHelper;
class LeaveRequestController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function list()
    {
        // Get all leave requests
        $userUuid = request()->input('user_uuid');
        $query = LeaveRequest::with('user')
                ->whereNull('deleted_at')
                ->where([
                    ['company_uuid', '=', Auth::getCompany()->uuid],
                    ['record_status', '=', 1],
                    ['deleted', '=', 0],
                    ])
                ->orderBy('id', 'desc');
        if ($userUuid) {
            $query->where('user_uuid', $userUuid);
        }
        $leaveRequests = $query->get();
        return response()->json([
            'success' => true,
            'data' => $leaveRequests,
            "total" => $leaveRequests->count(),
        ]);
        
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
        // Find the leave request by UUID
        $leaveRequest = LeaveRequest::where('id', $id)->firstOrFail();
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

        // Only check for overlaps if dates are being changed
        if ($input['start_date'] !== $leaveRequest->start_date || 
            $input['end_date'] !== $leaveRequest->end_date) {
            
            // Check for overlapping leave requests
            $existingLeaveRequest = LeaveRequest::where([
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
                ->where('id', '!=', $leaveRequest->id) // Exclude the current record
                ->first();

            if ($existingLeaveRequest) {
                return response()->json([
                    'success' => false,
                    'message' => 'You already have a leave request for these dates',
                ], 400);
            }
        }
        //update updated_by_id
        $input['updated_by_id'] = UserHelper::getIdFromUuid(auth()->id());
        // Update the leave request only if data is dirty
        $leaveRequest->update($input);
    
        return response()->json([
            'success' => true,
            'message' => __('messages.request_update_success'), // Add a proper translation key
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
}