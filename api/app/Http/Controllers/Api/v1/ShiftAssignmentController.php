<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Services\ShiftAssignmentService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class ShiftAssignmentController extends Controller
{
    protected ShiftAssignmentService $shiftAssignmentService;

    public function __construct(ShiftAssignmentService $shiftAssignmentService)
    {
        $this->shiftAssignmentService = $shiftAssignmentService;
    }

    /**
     * Get shift assignment data for a date range or specific orders
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getShiftAssignmentData(Request $request): JsonResponse
    {
        // Check if we're using selected_orders or date range
        if ($request->has('selected_orders')) {
            try {
                \Log::info('Processing request with selected orders', [
                    'input' => $request->all()
                ]);

                // Clean and parse the selected_orders parameter
                $selectedOrders = $request->input('selected_orders');
                if (is_string($selectedOrders)) {
                    // Remove brackets and split by comma
                    $selectedOrders = str_replace(['[', ']', ' '], '', $selectedOrders);
                    $orderIds = array_filter(array_map('trim', explode(',', $selectedOrders)));
                } else {
                    $orderIds = (array) $selectedOrders;
                }

                \Log::info('Parsed order IDs:', ['orders' => $orderIds]);

                $validator = Validator::make([
                    'selected_orders' => $orderIds,
                    'company_uuid' => $request->input('company_uuid'),
                    'time_zone' => $request->input('time_zone')
                ], [
                    'selected_orders' => 'required|array|min:1',
                    'selected_orders.*' => 'required|string',
                    'company_uuid' => 'nullable|string|uuid',
                    'time_zone' => 'nullable|string'
                ]);

                if ($validator->fails()) {
                    \Log::warning('Validation failed:', ['errors' => $validator->errors()->toArray()]);
                    return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
                }

                $companyUuid = $request->input('company_uuid');
                $timezone = $request->input('time_zone', 'UTC');
                $fleetUuid = $request->input('fleet_uuid');

                // Get date range from selected orders
                $dateRange = $this->getDateRangeFromOrders($orderIds, $companyUuid);
                if (!$dateRange) {
                    \Log::warning('No valid date range found for orders');
                    return response()->json([
                        'success' => false,
                        'message' => 'No valid orders found for selected IDs'
                    ], 404);
                }

                \Log::info('Date range found:', [
                    'start' => $dateRange['start_date']->format('Y-m-d H:i:s'),
                    'end' => $dateRange['end_date']->format('Y-m-d H:i:s')
                ]);

                // Generate dates array
                $dates = $this->generateDatesArrayInTimezone(
                    $dateRange['start_date'],
                    $dateRange['end_date'],
                    $timezone
                );

                // Get orders as shifts
                $datedShifts = $this->getSelectedOrdersAsShifts($orderIds, $timezone, $companyUuid);

                // Get shifts with pre-assigned drivers
                $preAssignedShifts = $this->shiftAssignmentService->getPreAssignedShifts(
                    $dateRange['start_date'],
                    $dateRange['end_date'],
                    $timezone,
                    $companyUuid,
                    $fleetUuid
                );

                // Filter pre-assigned shifts to only include selected orders
                $preAssignedShifts = array_filter($preAssignedShifts, function($shift) use ($orderIds) {
                    return in_array($shift['id'], $orderIds);
                });

                // Generate resources (drivers) for the selected orders date range
                $fullData = $this->shiftAssignmentService->generateShiftAssignmentData(
                    $dateRange['start_date'],
                    $dateRange['end_date'],
                    $companyUuid,
                    $timezone,
                    $fleetUuid
                );

                \Log::info('Response data:', [
                    'dates_count' => count($dates),
                    'resources_count' => count($fullData['resources']),
                    'dated_shifts_count' => count($datedShifts),
                    'pre_assigned_shifts_count' => count($preAssignedShifts)
                ]);

                return response()->json([
                    'success' => true,
                    'data' => [
                        'dates' => $dates,
                        'resources' => $fullData['resources'],
                        'dated_shifts' => array_values($datedShifts),
                        'pre_assigned_shifts' => array_values($preAssignedShifts),
                        'problem_type' => 'shift_assignment',
                        'recurring_shifts' => null,
                        'previous_allocation_data' => $fullData['previous_allocation_data'],
                        'vehicles_data' => $fullData['vehicles_data']
                    ],
                    'message' => 'Shift assignment data retrieved successfully for selected orders'
                ]);

            } catch (\Exception $e) {
                \Log::error('Error in getShiftAssignmentData: ' . $e->getMessage(), [
                    'exception' => $e,
                    'trace' => $e->getTraceAsString()
                ]);
                return response()->json([
                    'success' => false, 
                    'message' => 'Error processing request',
                    'debug' => config('app.debug') ? $e->getMessage() : null
                ], 500);
            }
        } else {
            // Original date range logic (completely unchanged)
            $validator = Validator::make($request->all(), [
                'start_date' => 'required|date|before_or_equal:end_date',
                'end_date' => 'required|date|after_or_equal:start_date',
                'company_uuid' => 'nullable|string|uuid',   
                'fleet_uuid' => 'nullable|string|uuid',
                'time_zone' => 'nullable|string'
            ]);
            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                    'message' => 'Validation failed'
                ], 422);
            }
            try {
                // Handle multiple date formats (DD-MM-YYYY and YYYY-MM-DD)
                $startDateStr = $request->start_date;
                $endDateStr = $request->end_date;
                
                // If date is in DD-MM-YYYY format, convert to YYYY-MM-DD
                if (preg_match('/^\d{2}-\d{2}-\d{4}$/', $startDateStr)) {
                    $startDateStr = \Carbon\Carbon::createFromFormat('d-m-Y', $startDateStr)->format('Y-m-d');
                }
                if (preg_match('/^\d{2}-\d{2}-\d{4}$/', $endDateStr)) {
                    $endDateStr = \Carbon\Carbon::createFromFormat('d-m-Y', $endDateStr)->format('Y-m-d');
                }
                
                $startDate = Carbon::parse($startDateStr);
                $endDate = Carbon::parse($endDateStr);
                $companyUuid = $request->input('company_uuid');
                $fleetUuid = $request->input('fleet_uuid');
                $timezone = $request->input('time_zone', 'UTC');
                $data = $this->shiftAssignmentService->generateShiftAssignmentData($startDate, $endDate, $companyUuid, $timezone, $fleetUuid);

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
    }

    /**
     * Get date range from selected orders (includes ALL selected orders regardless of driver assignment)
     * This ensures the dates array covers the full range of selected orders
     *
     * @param array $orderIds
     * @param string|null $companyUuid
     * @return array|null
     */
    private function getDateRangeFromOrders(array $orderIds, ?string $companyUuid = null): ?array
    {
        try {
            \Log::info('Getting date range from orders', [
                'order_ids' => $orderIds,
                'company_uuid' => $companyUuid
            ]);

            $query = DB::table('orders')
                ->select('scheduled_at', 'public_id', 'company_uuid')
                ->whereIn('public_id', $orderIds)
                ->whereNotNull('scheduled_at');

            if ($companyUuid) {
                $query->where('company_uuid', $companyUuid);
            }

            \Log::info('SQL Query:', [
                'sql' => $query->toSql(),
                'bindings' => $query->getBindings()
            ]);

            $orders = $query->get();

            \Log::info('Query results:', [
                'found_orders' => $orders->count(),
                'orders' => $orders->toArray()
            ]);

            if ($orders->isEmpty()) {
                    return null;
            }

            $minDate = null;
            $maxDate = null;

            foreach ($orders as $order) {
                $scheduledAt = Carbon::parse($order->scheduled_at);
                
                if (!$minDate || $scheduledAt < $minDate) {
                    $minDate = $scheduledAt;
                }
                if (!$maxDate || $scheduledAt > $maxDate) {
                    $maxDate = $scheduledAt;
                }
            }

            return [
                'start_date' => $minDate,
                'end_date' => $maxDate
            ];

        } catch (\Exception $e) {
            \Log::error('Error in getDateRangeFromOrders: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Get selected orders as shifts (only the specific orders requested)
     *
     * @param array $orderIds
     * @param string $timezone
     * @param string|null $companyUuid
     * @return array
     */
    private function getSelectedOrdersAsShifts(array $orderIds, string $timezone, ?string $companyUuid = null): array
    {
        try {
            \Log::info('Getting selected orders as shifts with company_uuid: ' . ($companyUuid ?? 'null') . ' and timezone: ' . $timezone);
            
            // Get orders for the specific IDs
            $query = \DB::table('orders')
                ->whereIn('public_id', $orderIds)
                ->whereNotNull('scheduled_at')
                ->whereNull('driver_assigned_uuid') // Exclude orders with assigned drivers
                ->whereIn('status', ['created', 'planned']);
                
            \Log::info('Filtering orders by status: created, planned');
            \Log::info('Excluding orders with assigned drivers (driver_assigned_uuid is not null)');
                
            // Filter by company if provided
            if ($companyUuid) {
                \Log::info('Filtering orders by company_uuid: ' . $companyUuid);
                $query->where('company_uuid', $companyUuid);
            }
            
            $orders = $query->get();
            \Log::info('Found ' . count($orders) . ' selected orders (excluding assigned orders)');
            
            $datedShifts = [];
            
            foreach ($orders as $order) {
                // We already filtered by scheduled_at in the query, so we can use it directly
                $shiftDate = \Carbon\Carbon::parse($order->scheduled_at);
                
                // Calculate duration based on order type or use default
                $duration = $this->calculateOrderDuration($order);
                // Compute end time based on duration
                $endTime = $shiftDate->copy()->addMinutes($duration);
                
                // Convert times to the specified timezone
                $startTimeInTimezone = $shiftDate->copy()->setTimezone($timezone)->format('Y-m-d H:i:s');
                $endTimeInTimezone = $endTime->copy()->setTimezone($timezone)->format('Y-m-d H:i:s');
                
                $datedShifts[] = [
                    'id' => $order->public_id,
                    'start_time' => $startTimeInTimezone,
                    'end_time' => $endTimeInTimezone,
                    'duration_minutes' => $duration,
                ];
            }
            
            \Log::info('Processed ' . count($datedShifts) . ' selected orders as dated shifts (unassigned orders only)');
            return $datedShifts;
        } catch (\Exception $e) {
            \Log::error("Error in getSelectedOrdersAsShifts: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Calculate order duration in minutes (copied from service for consistency)
     *
     * @param object $order
     * @return int
     */
    private function calculateOrderDuration($order): int
    {
        // If we have estimated start and end times, calculate duration
        if (isset($order->scheduled_at) && isset($order->estimated_end_date) && 
            $order->scheduled_at && $order->estimated_end_date) {
            $start = \Carbon\Carbon::parse($order->scheduled_at);
            $end = \Carbon\Carbon::parse($order->estimated_end_date);
            $minutes = $start->diffInMinutes($end, false);
            // If duration is 0 or negative, default to 720
            if ($minutes <= 0) {
                return 720;
            }
            return $minutes;
        }
        
        // If end time is not present, use default of 720 minutes (12 hours)
        return 720; // Default 12 hours for all orders without end time
    }

    /**
     * Generate dates array in the specified timezone
     * This ensures all dates from selected orders are included in the timezone-aware format
     *
     * @param Carbon $startDate
     * @param Carbon $endDate
     * @param string $timezone
     * @return array
     */
    private function generateDatesArrayInTimezone($startDate, $endDate, string $timezone): array
    {
        $start = Carbon::parse($startDate)->setTimezone($timezone)->startOfDay();
        $end = Carbon::parse($endDate)->setTimezone($timezone)->startOfDay();
        
        $dates = [];
        $current = $start->copy();
        
        while ($current->lte($end)) {
            $dates[] = $current->format('Y-m-d');
            $current->addDay();
        }
        
        \Log::info('Generated dates array:', [
            'timezone' => $timezone,
            'start' => $start->format('Y-m-d'),
            'end' => $end->format('Y-m-d'),
            'dates' => $dates
        ]);
        
        return $dates;
    }

    /**
     * Generate dates array based on the actual scheduled dates of the selected orders
     *
     * @param array $orderIds
     * @param string $timezone
     * @param string|null $companyUuid
     * @return array
     */
    private function generateDatesFromSelectedOrders(array $orderIds, string $timezone, ?string $companyUuid = null): array
    {
        try {
            \Log::info('Generating dates array from selected orders with company_uuid: ' . ($companyUuid ?? 'null') . ' and timezone: ' . $timezone);
            
            $query = \DB::table('orders')
                ->whereIn('public_id', $orderIds)
                ->whereNotNull('scheduled_at')
                ->whereIn('status', ['created', 'planned']);
                
            if ($companyUuid) {
                $query->where('company_uuid', $companyUuid);
            }
            
            $orders = $query->get(['scheduled_at']);
            
            if ($orders->isEmpty()) {
                \Log::warning('No orders found with valid scheduled_at dates for IDs: ' . implode(', ', $orderIds));
                return [];
            }
            
            $scheduledDates = $orders->pluck('scheduled_at')
                ->filter()
                ->map(function($date) use ($timezone) {
                    return \Carbon\Carbon::parse($date)->setTimezone($timezone);
                });
            
            if ($scheduledDates->isEmpty()) {
                \Log::warning('No valid scheduled_at dates found in orders for IDs: ' . implode(', ', $orderIds));
                return [];
            }
            
            $startDate = $scheduledDates->min();
            $endDate = $scheduledDates->max();
            
            return $this->generateDatesArrayInTimezone($startDate, $endDate, $timezone);
            
        } catch (\Exception $e) {
            \Log::error('Error generating dates array from selected orders: ' . $e->getMessage(), [
                'order_ids' => $orderIds,
                'timezone' => $timezone,
                'company_uuid' => $companyUuid
            ]);
            return [];
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
            'company_uuid' => 'nullable|string|uuid',
            'fleet_uuid' => 'nullable|string|uuid',
            'time_zone' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
                'message' => 'Validation failed'
            ], 422);
        }
        
        try {
            // Get company UUID and fleet UUID from request or use default
            $companyUuid = $request->input('company_uuid');
            $fleetUuid = $request->input('fleet_uuid');
            $timezone = $request->input('time_zone', 'UTC');

            // Calculate current week dates
            $startDate = now()->startOfWeek()->format('Y-m-d');
            $endDate = now()->endOfWeek()->format('Y-m-d');

            // Generate shift assignment data
            $data = $this->shiftAssignmentService->generateShiftAssignmentData(
                $startDate,
                $endDate,
                $companyUuid,
                $timezone,
                $fleetUuid
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
            'company_uuid' => 'nullable|string|uuid',
            'fleet_uuid' => 'nullable|string|uuid',
            'time_zone' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
                'message' => 'Validation failed'
            ], 422);
        }
        
        try {
            // Get company UUID and fleet UUID from request or use default
            $companyUuid = $request->input('company_uuid');
            $fleetUuid = $request->input('fleet_uuid');
            $timezone = $request->input('time_zone', 'UTC');

            // Calculate next week dates
            $startDate = now()->addWeek()->startOfWeek()->format('Y-m-d');
            $endDate = now()->addWeek()->endOfWeek()->format('Y-m-d');

            // Generate shift assignment data
            $data = $this->shiftAssignmentService->generateShiftAssignmentData(
                $startDate,
                $endDate,
                $companyUuid,
                $timezone,
                $fleetUuid
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
     * Get available drivers for a specific date.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getAvailableDrivers(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'date' => 'required|date',
            'company_uuid' => 'nullable|string|uuid',
            'fleet_uuid' => 'nullable|string|uuid'
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
            $fleetUuid = $request->input('fleet_uuid');
            $date = $request->input('date');
            
            // Use the service method to get available drivers
            $data = $this->shiftAssignmentService->getAvailableDrivers($date, $companyUuid, $fleetUuid);

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

    /**
     * Update orders from allocated resources payload.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function applyAllocations(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'allocated_resources' => 'required|array|min:1',
            'allocated_resources.*.resource_id' => 'nullable|string',
            'allocated_resources.*.resource_name' => 'nullable|string',
            'allocated_resources.*.assignments' => 'required|array',
            // Optional: list of orders to unassign by date
            'uncovered_shifts' => 'sometimes|array',
            'uncovered_shifts.*' => 'array',
            'uncovered_shifts.*.*' => 'string',
            'timezone' => 'sometimes|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
                'message' => 'Validation failed'
            ], 422);
        }

        try {
            $allocatedResources = $request->input('allocated_resources', []);
            $timezone = $request->input('timezone');
            $uncoveredShifts = $request->input('uncovered_shifts', []);

            $result = $this->shiftAssignmentService->applyAllocatedResources($allocatedResources, $timezone, $uncoveredShifts);

            return response()->json([
                'success' => true,
                'data' => $result,
                'message' => 'Allocations applied successfully'
            ]);
        } catch (\Exception $e) {
            \Log::error('Error applying allocations: ' . $e->getMessage(), [
                'exception' => $e,
                'request' => $request->all()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error applying allocations',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }
}
