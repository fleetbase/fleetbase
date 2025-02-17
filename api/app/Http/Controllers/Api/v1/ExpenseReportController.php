<?php

namespace App\Http\Controllers\Api\v1;

use Illuminate\Http\Request;
use Fleetbase\Http\Controllers\Controller;
use App\Models\FuelReport;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Fleetbase\LaravelMysqlSpatial\Types\Point;
use Fleetbase\Support\Auth;

class ExpenseReportController extends Controller
{
    /**
     * Create a new expense report
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function create(Request $request)
    {
        try {
            DB::beginTransaction();

            $input = $request->all();
            $company = $request->has('company') ? Auth::getCompanyFromRequest($request) : Auth::getCompany();
            $company_uuid = null;
            if($company){
                $company_uuid = $company->uuid;
            }
            $input['company_uuid'] = $company_uuid;
            if($request->has('status')){
                $input['status'] = $request->input('status');
            }
            else{
                $input['status'] = __('expense.status.pending_approval');
            }
            // Handle location field
            if ($request->has('latitude') && $request->has('longitude')) {
                $input['location'] = new Point(
                    floatval($request->input('latitude')),
                    floatval($request->input('longitude'))
                );
            } else {
                // Set a default location or throw an error if location is required
                // Option 1: Set default location
                $input['location'] = new Point(0, 0); // Default coordinates
          
            }

            $fuelReport = FuelReport::create($input);

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Expense report created successfully',
                'data' => $fuelReport
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating fuel report: ' . $e->getMessage());
            
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to create fuel report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * List all expense reports
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function list(Request $request)
    {
        try {
            
            $company = $request->has('company') ? Auth::getCompanyFromRequest($request) : Auth::getCompany();
            $company_uuid = null;
            if($company){
                $company_uuid = $company->uuid;
            }
            $query = FuelReport::with(['files'])
                ->leftJoin('drivers', 'fuel_reports.driver_uuid', '=', 'drivers.uuid')
                ->select('fuel_reports.*')
                ->where('fuel_reports.company_uuid', $company_uuid)
                ->whereNull('fuel_reports.deleted_at')
                ->orderBy('fuel_reports.id', 'desc');

            // Add filters if provided
            if ($request->has('status')) {
                $query->where('fuel_reports.status', $request->status);
            }

            if ($request->has('date_from')) {
                $query->whereDate('fuel_reports.created_at', '>=', $request->date_from);
            }

            if ($request->has('date_to')) {
                $query->whereDate('fuel_reports.created_at', '<=', $request->date_to);
            }
            if ($request->has('report_type')) {
                $query->where('fuel_reports.report_type', '=', $request->report_type);
            }
            if ($request->has('user_uuid')) {
            //    $query->where('reported_by_uuid', '=', $request->user_uuid);
                $query->where(function($q) use ($request) {
                    $q->where('fuel_reports.reported_by_uuid', $request->user_uuid)
                    ->orWhere('drivers.user_uuid', $request->user_uuid);  // Changed from user_uuid to created_by_uuid
                });
            }
            $FuelReports = $query->paginate($request->input('per_page', 10));

            return response()->json([
                'status' => 'success',
                'data' => $FuelReports
            ]);

        } catch (\Exception $e) {
            Log::error('Error listing expense reports: ' . $e->getMessage());
            
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to list expense reports',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update an expense report
     * 
     * @param string $id
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function update($id, Request $request)
    {
        try {
            DB::beginTransaction();
            $company = $request->has('company') ? Auth::getCompanyFromRequest($request) : Auth::getCompany();
            $company_uuid = null;
            if($company){
                $company_uuid = $company->uuid;
            }
            $FuelReport = FuelReport::where('uuid', $id)
                ->where('company_uuid', $company_uuid)
                ->whereNull('deleted_at')
                ->firstOrFail();

            $FuelReport->update($request->all());

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Expense report updated successfully',
                'data' => $FuelReport
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating expense report: ' . $e->getMessage());
            
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update expense report',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete an expense report
     * 
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function delete($id)
    {
        try {
            DB::beginTransaction();
            $company = Auth::getCompany();
            $company_uuid = null;
            if($company){
                $company_uuid = $company->uuid;
            }
            $FuelReport = FuelReport::where('uuid', $id)
            ->where('company_uuid', $company_uuid)
            ->whereNull('deleted_at')
            ->firstOrFail();

            $FuelReport->delete();

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Expense report deleted successfully'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting expense report: ' . $e->getMessage());
            
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to delete expense report',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
