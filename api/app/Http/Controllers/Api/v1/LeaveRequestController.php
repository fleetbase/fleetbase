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
        $leaveRequests = LeaveRequest::whereNull('deleted_at')
        ->orderBy('id', 'desc')->get();
        return response()->json($leaveRequests);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Validate the incoming request data
        
        $company = $request->has('company') ? Auth::getCompanyFromRequest($request) : Auth::getCompany();
            $company_uuid = null;
            if($company){
                $company_uuid = $company->uuid;
            }
            $input = $request->all();
        $input['public_id'] = Str::random(6);
        $input['company_uuid'] = $company_uuid;
        // Create the leave request record
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
    public function update(Request $request, string $uuid)
    {
        // Find the leave request by UUID
        $leaveRequest = LeaveRequest::where('uuid', $uuid)->firstOrFail();

        // Validate the incoming request data
        $validated = $request->validate([
            'company_uuid' => 'required|uuid',
            'user_uuid' => 'nullable|uuid',
            'driver_uuid' => 'nullable|uuid',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'nullable|string',
            'status' => 'in:Submitted,Pending,Approved,Rejected,Cancelled',
        ]);

        // Update the leave request
        $leaveRequest->update($validated);

        return response()->json($leaveRequest);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $uuid)
    {
        // Find the leave request by UUID
        $leaveRequest = LeaveRequest::where('uuid', $uuid)->firstOrFail();

        // Delete the leave request
        $leaveRequest->delete();

        return response()->json(['message' => 'Leave request deleted successfully']);
    }
}