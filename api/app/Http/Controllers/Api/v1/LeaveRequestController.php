<?php

namespace App\Http\Controllers\Api\v1;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller; 
use App\Models\LeaveRequest;
use Illuminate\Support\Str;
use Fleetbase\Support\Auth;
class LeaveRequestController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function list()
    {
        // Get all leave requests
        $leaveRequests = LeaveRequest::with('user')->whereNull('deleted_at')
        ->orderBy('id', 'desc')
        ->get();
        return response()->json($leaveRequests);
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
        // Create the leave request record
        // Check for duplicate leave requests (same user, same date range)
        $duplicateRequest = LeaveRequest::where('user_uuid', $input['user_uuid'])
        ->where('start_date', $input['start_date'])
        ->where('end_date', $input['end_date'])
        ->whereNull('deleted_at') // Ensure it's not soft deleted
        ->first();
        if ($duplicateRequest) {
            return response()->json([
                'success' => false,
                'message' => __('messages.duplicate_leave_requests'),
            ], 400);
        }
        $input['public_id'] = Str::random(6);
        $input['company_uuid'] = $company_uuid;
        $input['uuid'] = Str::uuid();
        $leaveRequest = LeaveRequest::create($input);

        return response()->json($leaveRequest, 200);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $uuid)
    {
        // Find the leave request by UUID
        $leaveRequest = LeaveRequest::where('uuid', $uuid)->firstOrFail();
        return response()->json($leaveRequest);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        // Find the leave request by UUID
        $leaveRequest = LeaveRequest::where('id', $id)->firstOrFail();
        $input = $request->all();
        $existingLeaveRequest = LeaveRequest::where('driver_uuid', $input['driver_uuid'])
        ->where('start_date', $input['start_date'])
        ->where('end_date', $input['end_date'])
        ->whereNull('deleted_at')
        ->where('id', '!=', $leaveRequest->id) // Exclude the current record from the check
        ->first();
        if ($existingLeaveRequest) {
            return response()->json([
                'success' => false,
                'message' => __('messages.duplicate_leave_requests'),
            ], 400);
        }
        
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
        $leaveRequest = LeaveRequest::where('id', $id)->whereNull('deleted_at')->firstOrFail();
        if(isset($leaveRequest) && !empty($leaveRequest)) {
        // Delete the leave request
        $leaveRequest->deleted_at = time();
        $leaveRequest->save();
        return response()->json(['success' => true,'message' => __('messages.request_deleted_success')]);
        }
        else{
            return response()->json(['success' => false, 'message' => __('messages.request_not_found')]);
        }
        
    }
}