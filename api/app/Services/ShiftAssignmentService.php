<?php

namespace App\Services;

use Fleetbase\FleetOps\Models\Driver;
use Fleetbase\FleetOps\Models\Order;
use Fleetbase\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ShiftAssignmentService
{
    /**
     * Generate shift assignment data for a date range
     *
     * @param string|Carbon $startDate
     * @param string|Carbon $endDate
     * @param string|null $companyUuid
     * @return array
     * @throws \InvalidArgumentException If company_uuid is invalid
     */
    public function generateShiftAssignmentData($startDate, $endDate, ?string $companyUuid = null): array
    {
        try {
            // Validate company UUID if provided
            if ($companyUuid !== null) {
                if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $companyUuid)) {
                    throw new \InvalidArgumentException('Invalid company UUID format');
                }
            }
            
            // Convert to Carbon if string
            if (is_string($startDate)) {
                $startDate = Carbon::parse($startDate);
            }
            
            if (is_string($endDate)) {
                $endDate = Carbon::parse($endDate);
            }
            
            $start = $startDate;
            $end = $endDate;
            
            \Log::info('Generating shift assignment data for date range: ' . $start->format('Y-m-d') . ' to ' . $end->format('Y-m-d'));
            \Log::info('Company UUID: ' . ($companyUuid ?? 'null'));
            
            // Get all drivers for the company
            $drivers = $this->getDrivers($companyUuid);
            
            // Generate dates array
            $dates = $this->generateDatesArray($start, $end);
            
            // Generate resources (drivers) array
            $resources = $this->generateResourcesArray($drivers, $start, $end);
            
            // Get real orders as dated shifts
            $datedShifts = $this->getOrdersAsShifts($start, $end, $companyUuid);
            
            \Log::info('Generated shift assignment data with ' . count($dates) . ' dates, ' . 
                     count($resources) . ' resources, and ' . count($datedShifts) . ' dated shifts');
            
            return [
                'dates' => $dates,
                'resources' => $resources,
                'dated_shifts' => $datedShifts,
                'problem_type' => 'shift_assignment',
                'recurring_shifts' => null,
                'previous_allocation_data' => [] // Empty array for previous allocation data
            ];
        } catch (\Exception $e) {
            \Log::error('Error generating shift assignment data: ' . $e->getMessage());
            throw $e;
        }
        // Generate dates array
        $dates = $this->generateDatesArray($start, $end);
        
        // Generate resources (drivers) array
        $resources = $this->generateResourcesArray($drivers, $start, $end);
        
        // Get real orders as dated shifts
        $datedShifts = $this->getOrdersAsShifts($start, $end, $companyUuid);
        
        \Log::info('Generated shift assignment data with ' . count($dates) . ' dates, ' . 
                 count($resources) . ' resources, and ' . count($datedShifts) . ' dated shifts');
        
        return [
            'dates' => $dates,
            'resources' => $resources,
            'dated_shifts' => $datedShifts,
            'problem_type' => 'shift_assignment',
            'recurring_shifts' => null,
            'previous_allocation_data' => [] // Empty array for previous allocation data
        ];
    }
    
    /**
     * Apply allocated resources to update orders assignments and schedule times.
     *
     * @param array $allocatedResources
     * @param string|null $timezone Input times' timezone (defaults to app timezone, stored as UTC)
     * @return array Summary of updates
     */
    public function applyAllocatedResources(array $allocatedResources, ?string $timezone = null): array
    {
        $timezone = $timezone ?: config('app.timezone', 'UTC');
        $updatedOrders = [];
        $skippedAssignments = 0;
        $errors = [];

        foreach ($allocatedResources as $resourceIndex => $resource) {
            $resourceId = $resource['resource_id'] ?? null;
            $resourceName = $resource['resource_name'] ?? null;
            $assignments = $resource['assignments'] ?? [];

            // Resolve driver by uuid only
            $driver = null;
            if ($resourceId) {
                $driver = Driver::with(['user'])
                    ->where('uuid', $resourceId)
                    ->first();
                
                \Log::info("Driver lookup for resource_id '{$resourceId}': " . ($driver ? "Found driver {$driver->uuid}" : "Not found"));
            }
            if (!$driver && $resourceName) {
                $driver = Driver::with(['user'])
                    ->whereHas('user', function ($q) use ($resourceName) {
                        $q->where('name', $resourceName);
                    })
                    ->first();
                
                \Log::info("Driver lookup for resource_name '{$resourceName}': " . ($driver ? "Found driver {$driver->uuid}" : "Not found"));
            }

            foreach ($assignments as $date => $assignment) {
                // Skip null or empty assignment objects
                if ($assignment === null || (is_array($assignment) && empty($assignment))) {
                    $skippedAssignments++;
                    continue;
                }

                $orderPublicOrUuid = $assignment['id'] ?? null;
                $startTime = $assignment['start_time'] ?? null;

                if (!$orderPublicOrUuid || !$startTime) {
                    $skippedAssignments++;
                    continue;
                }

                try {
                    // Combine date and time, interpret in provided timezone then convert to UTC for storage
                    $localDateTime = Carbon::parse($date . ' ' . $startTime, $timezone);
                    $scheduledAtUtc = $localDateTime->clone()->setTimezone('UTC');

                    // Resolve order by public_id then uuid
                    $order = Order::withoutGlobalScopes()
                        ->where(function($query) use ($orderPublicOrUuid) {
                            $query->where('public_id', $orderPublicOrUuid);
                        })
                        ->first();

                    if (!$order) {
                        $errors[] = [
                            'resource' => $resourceId ?? $resourceName,
                            'date' => $date,
                            'order' => $orderPublicOrUuid,
                            'message' => 'Order not found'
                        ];
                        continue;
                    }

                    // Update only driver assignment
                    $updates = [];
                    if ($driver) {
                        $updates['driver_assigned_uuid'] = $driver->uuid;
                        \Log::info("Updating order {$order->public_id} with driver {$driver->uuid}");
                    } else {
                        \Log::warning("No driver found for resource_id '{$resourceId}' or resource_name '{$resourceName}', skipping driver assignment for order {$order->public_id}");
                    }

                    Order::where('uuid', $order->uuid)->update($updates);

                    $updatedOrders[] = $order->public_id ?? $order->uuid;
                } catch (\Exception $e) {
                    $errors[] = [
                        'resource' => $resourceId ?? $resourceName,
                        'date' => $date,
                        'order' => $orderPublicOrUuid,
                        'message' => $e->getMessage()
                    ];
                }
            }
        }

        // Deduplicate updated order ids
        $updatedOrders = array_values(array_unique($updatedOrders));

        return [
            'updated_orders' => count($updatedOrders),
            'updated_order_ids' => $updatedOrders,
            'skipped_assignments' => $skippedAssignments,
            'errors' => $errors,
        ];
    }

    
    
    // Mock data generation methods have been removed to only process real data
    
    /**
     * Get drivers for the company
     *
     * @param string|null $companyUuid
     * @return Collection
     */
    private function getDrivers(?string $companyUuid = null): Collection
    {
        try {
            \Log::info('Getting drivers with company_uuid: ' . ($companyUuid ?? 'null'));
            
            $query = Driver::with(['user'])
                ->whereNull('deleted_at')
                ->where('status', 'active');
                
            if ($companyUuid) {
                \Log::info('Filtering drivers by company_uuid: ' . $companyUuid);
                $query->where('company_uuid', $companyUuid);
            }
            
            // Get unique drivers to avoid duplicates
            $drivers = $query->get()->unique('uuid');
            
            \Log::info('Found ' . $drivers->count() . ' unique drivers');
            return $drivers;
        } catch (\Exception $e) {
            \Log::error('Error getting drivers: ' . $e->getMessage());
            // Return empty collection if Driver model fails
            return collect();
        }
    }
    
    /**
     * Generate dates array
     *
     * @param \Carbon\Carbon $start
     * @param \Carbon\Carbon $end
     * @return array
     */
    private function generateDatesArray($start, $end): array
    {
        $start = \Carbon\Carbon::parse($start);
        $end = \Carbon\Carbon::parse($end);
        
        $dates = [];
        $current = $start->copy();
        
        while ($current->lte($end)) {
            $dates[] = $current->format('Y-m-d');
            $current->addDay();
        }
        
        return $dates;
    }
    
    /**
     * Generate resources array from drivers
     *
     * @param Collection $drivers
     * @param mixed $start
     * @param mixed $end
     * @return array
     */
    private function generateResourcesArray(Collection $drivers, $start, $end): array
    {
        $resources = [];
        
        // Get all driver UUIDs
        $driverUuids = $drivers->pluck('uuid')->toArray();
        
        // Fetch all leave requests for all drivers in a single query
        $leaveRequests = DB::table('leave_requests')
            ->whereIn('driver_uuid', $driverUuids)
            ->where('status', 'Approved')
            ->whereNull('deleted_at')
            ->where(function ($query) use ($start, $end) {
                $query->whereBetween('start_date', [$start, $end])
                      ->orWhereBetween('end_date', [$start, $end])
                      ->orWhere(function ($q) use ($start, $end) {
                          $q->where('start_date', '<=', $start)
                            ->where('end_date', '>=', $end);
                      });
            })
            ->get();
            
        \Log::info('Fetched ' . $leaveRequests->count() . ' leave requests for all drivers');
        
        // Group leave requests by driver_uuid for quick lookup
        $leaveRequestsByDriver = $leaveRequests->groupBy('driver_uuid');
        
        foreach ($drivers as $driver) {
            // Get unavailable dates for this driver from the pre-fetched data
            $unavailableDates = $this->processUnavailableDates(
                $leaveRequestsByDriver->get($driver->uuid, collect()), 
                $start, 
                $end
            );
            
            // Create resource entry for this driver
            $resources[] = [
                'id' => $driver->uuid,
                'name' => $driver->name,
                'preferences' => [],
                'unavailable_dates' => $unavailableDates,
                'preferred_rest_days' => [] // Could be populated from driver preferences in the future
            ];
        }
        
        \Log::info('Generated resources array with ' . count($resources) . ' drivers');
        return $resources;
    }
    
    /**
     * Process unavailable dates for drivers
     *
     * @param Collection $leaveRequests
     * @param mixed $start
     * @param mixed $end
     * @return array
     */
    private function processUnavailableDates($leaveRequests, $start, $end): array
    {
        try {
            $start = \Carbon\Carbon::parse($start);
            $end = \Carbon\Carbon::parse($end);
            $unavailableDates = [];
            
            // Generate unavailable dates from leave requests
            foreach ($leaveRequests as $leave) {
                $current = \Carbon\Carbon::parse($leave->start_date);
                $endDate = \Carbon\Carbon::parse($leave->end_date);
                
                while ($current->lte($endDate)) {
                    if ($current->between($start, $end)) {
                        $unavailableDates[] = $current->format('Y-m-d');
                    }
                    $current->addDay();
                }
            }
            
            // Remove duplicates and sort
            $unavailableDates = array_unique($unavailableDates);
            sort($unavailableDates);
            
            return $unavailableDates;
        } catch (\Exception $e) {
            \Log::error("Error in processUnavailableDates: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Get unavailable dates for a driver from leave_requests table
     * @deprecated Use processUnavailableDates with pre-fetched leave requests instead
     * 
     * @param Driver $driver
     * @param mixed $start
     * @param mixed $end
     * @return array
     */
    private function getUnavailableDates(Driver $driver, $start, $end): array
    {
        try {
            $start = \Carbon\Carbon::parse($start);
            $end = \Carbon\Carbon::parse($end);
            $unavailableDates = [];
            
            \Log::info("Getting unavailable dates for driver: " . $driver->public_id . " (uuid: " . $driver->uuid . ")");
            \Log::info("Date range: " . $start->format('Y-m-d') . " to " . $end->format('Y-m-d'));
            
            // Query leave_requests table for approved leave requests
            $leaveRequests = DB::table('leave_requests')
                ->where('driver_uuid', $driver->uuid)
                ->where('status', 'Approved')
                ->whereNull('deleted_at')
                ->where(function ($query) use ($start, $end) {
                    $query->whereBetween('start_date', [$start, $end])
                          ->orWhereBetween('end_date', [$start, $end])
                          ->orWhere(function ($q) use ($start, $end) {
                              $q->where('start_date', '<=', $start)
                                ->where('end_date', '>=', $end);
                          });
                })
                ->get();
                
            \Log::info("Found " . count($leaveRequests) . " approved leave requests for driver");
            
            return $this->processUnavailableDates($leaveRequests, $start, $end);
        } catch (\Exception $e) {
            \Log::error("Error in getUnavailableDates: " . $e->getMessage());
            return [];
        }
    }
    
    
    
    /**
     * Get orders as shifts
     *
     * @param mixed $start
     * @param mixed $end
     * @param string|null $companyUuid
     * @return array
     */
    private function getOrdersAsShifts($start, $end, ?string $companyUuid = null): array
    {
        try {
            \Log::info('Getting orders as shifts with company_uuid: ' . ($companyUuid ?? 'null'));
            
            
            
            // Get orders for the date range based on scheduled_at
            $query = DB::table('orders')
                ->whereNotNull('scheduled_at')
                ->whereBetween('scheduled_at', [$start, $end])
                ->whereIn('status', ['created', 'planned']);
                
            \Log::info('Filtering orders by status: created, planned');
                
            // Filter by company if provided
            if ($companyUuid) {
                \Log::info('Filtering orders by company_uuid: ' . $companyUuid);
                $query->where('company_uuid', $companyUuid);
            }
            
            \Log::info('Querying orders with scheduled_at between ' . $start->format('Y-m-d H:i:s') . ' and ' . $end->format('Y-m-d H:i:s'));
            
            $orders = $query->get();
            \Log::info('Found ' . count($orders) . ' orders in date range');
            
            $datedShifts = [];
            
            foreach ($orders as $order) {
                // We already filtered by scheduled_at in the query, so we can use it directly
                $shiftDate = Carbon::parse($order->scheduled_at);
                
                // Calculate duration based on order type or use default
                $duration = $this->calculateOrderDuration($order);
                
                $datedShifts[] = [
                    'id' => $order->public_id,
                    'start_time' => $shiftDate->format('Y-m-d H:i:s'),
                    'duration_minutes' => $duration,
                ];
            }
            
            \Log::info('Processed ' . count($datedShifts) . ' dated shifts');
            return $datedShifts;
        } catch (\Exception $e) {
            \Log::error("Error in getOrdersAsShifts: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Calculate order duration in minutes
     *
     * @param object $order
     * @return int
     */
    private function calculateOrderDuration($order): int
    {
        // If we have estimated start and end times, calculate duration
        if (isset($order->scheduled_at) && isset($order->estimated_end_date) && 
            $order->scheduled_at && $order->estimated_end_date) {
            $start = Carbon::parse($order->scheduled_at);
            $end = Carbon::parse($order->estimated_end_date);
            return $start->diffInMinutes($end);
        }
        
        // If end time is not present, use default of 720 minutes (12 hours)
        return 720; // Default 12 hours for all orders without end time
    }
    
    // Previous allocation methods have been removed as they are no longer needed
    
    /**
     * Get available drivers for a specific date
     *
     * @param string $date
     * @param string|null $companyUuid
     * @return array
     * @throws \InvalidArgumentException If company_uuid is invalid
     */
    public function getAvailableDrivers(string $date, ?string $companyUuid = null): array
    {
        try {
            // Validate company UUID if provided
            if ($companyUuid !== null) {
                if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $companyUuid)) {
                    throw new \InvalidArgumentException('Invalid company UUID format');
                }
            }
            
            \Log::info('Getting available drivers for date: ' . $date . ' and company_uuid: ' . ($companyUuid ?? 'null'));
            
            // First, get all driver UUIDs who are on approved leave for the given date
            $driversOnLeave = DB::table('leave_requests')
                ->select('driver_uuid')
                ->where('status', 'Approved')
                ->whereNull('deleted_at')
                ->whereDate('start_date', '<=', $date)
                ->whereDate('end_date', '>=', $date)
                ->pluck('driver_uuid')
                ->toArray();
            
            \Log::info('Found ' . count($driversOnLeave) . ' drivers on leave for date: ' . $date);
            
            // Then, get all active drivers who are NOT in the leave list
            $query = Driver::with(['user'])
                ->whereNull('deleted_at')
                ->where('status', 'active');
                
            // Add company filter if provided
            if ($companyUuid) {
                $query->where('company_uuid', $companyUuid);
            }
            
            // Exclude drivers who are on leave
            if (!empty($driversOnLeave)) {
                $query->whereNotIn('uuid', $driversOnLeave);
            }
            
            $availableDrivers = $query->get()
                ->map(function ($driver) {
                    return [
                        'id' => $driver->public_id,
                        'name' => $driver->user->name ?? 'Unknown Driver',
                        'status' => $driver->status,
                        'online' => $driver->online
                    ];
                })
                ->values()
                ->toArray();
            
            \Log::info('Found ' . count($availableDrivers) . ' available drivers for date: ' . $date);
            
            return [
                'date' => $date,
                'available_drivers' => $availableDrivers,
                'total_available' => count($availableDrivers)
            ];
            
        } catch (\Exception $e) {
            \Log::error('Error in getAvailableDrivers: ' . $e->getMessage());
            throw $e;
        }
    }
}
