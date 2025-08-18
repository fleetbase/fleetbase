<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Services\ShiftAssignmentService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class ShiftAssignmentController extends Controller
{
    protected ShiftAssignmentService $shiftAssignmentService;

    public function __construct(ShiftAssignmentService $shiftAssignmentService)
    {
        $this->shiftAssignmentService = $shiftAssignmentService;
    }

    /**
     * Get shift assignment data for a date range
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getShiftAssignmentData(Request $request): JsonResponse
    {
        // Validate request
        $validator = Validator::make($request->all(), [
            'start_date' => 'required|date|before_or_equal:end_date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'company_uuid' => 'nullable|string|uuid'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
                'message' => 'Validation failed'
            ], 422);
        }

        try {
            $startDate = Carbon::parse($request->start_date);
            $endDate = Carbon::parse($request->end_date);
            $companyUuid = $request->input('company_uuid');

            $data = $this->shiftAssignmentService->generateShiftAssignmentData($startDate, $endDate, $companyUuid);

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => 'Shift assignment data retrieved successfully'
            ]);

        } catch (\Exception $e) {
            \Log::error('Error generating shift assignment data: ' . $e->getMessage(), [
                'exception' => $e,
                'request' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error generating shift assignment data',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get shift assignment data for the current week
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getCurrentWeekData(Request $request): JsonResponse
    {
        // Validate request
        $validator = Validator::make($request->all(), [
            'company_uuid' => 'nullable|string|uuid'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
                'message' => 'Validation failed'
            ], 422);
        }
        
        try {
            // Get company UUID from request or use default
            $companyUuid = $request->input('company_uuid');

            // Calculate current week dates
            $startDate = now()->startOfWeek()->format('Y-m-d');
            $endDate = now()->endOfWeek()->format('Y-m-d');

            // Generate shift assignment data
            $data = $this->shiftAssignmentService->generateShiftAssignmentData(
                $startDate,
                $endDate,
                $companyUuid
            );

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => 'Current week shift assignment data retrieved successfully'
            ]);

        } catch (\Exception $e) {
            \Log::error('Error generating current week shift assignment data: ' . $e->getMessage(), [
                'exception' => $e,
                'request' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error generating current week shift assignment data',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get shift assignment data for the next week
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getNextWeekData(Request $request): JsonResponse
    {
        // Validate request
        $validator = Validator::make($request->all(), [
            'company_uuid' => 'nullable|string|uuid'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
                'message' => 'Validation failed'
            ], 422);
        }
        
        try {
            // Get company UUID from request or use default
            $companyUuid = $request->input('company_uuid');

            // Calculate next week dates
            $startDate = now()->addWeek()->startOfWeek()->format('Y-m-d');
            $endDate = now()->addWeek()->endOfWeek()->format('Y-m-d');

            // Generate shift assignment data
            $data = $this->shiftAssignmentService->generateShiftAssignmentData(
                $startDate,
                $endDate,
                $companyUuid
            );

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => 'Next week shift assignment data retrieved successfully'
            ]);

        } catch (\Exception $e) {
            \Log::error('Error generating next week shift assignment data: ' . $e->getMessage(), [
                'exception' => $e,
                'request' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error generating next week shift assignment data',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get available drivers for a specific date
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getAvailableDrivers(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'date' => 'required|date',
            'company_uuid' => 'nullable|string|uuid'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
                'message' => 'Validation failed'
            ], 422);
        }

        try {
            $companyUuid = $request->input('company_uuid');
            $date = $request->input('date');
            
            // Use the service method to get available drivers
            $data = $this->shiftAssignmentService->getAvailableDrivers($date, $companyUuid);

            return response()->json([
                'success' => true,
                'data' => $data,
                'message' => 'Available drivers retrieved successfully'
            ]);

        } catch (\Exception $e) {
            \Log::error('Error getting available drivers: ' . $e->getMessage(), [
                'exception' => $e,
                'request' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error getting available drivers',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }
}
