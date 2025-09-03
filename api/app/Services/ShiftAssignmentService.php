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
     * @param string|null $timezone
     * @param string|null $fleetUuid
     * @return array
     * @throws \InvalidArgumentException If company_uuid is invalid
     */
    public function generateShiftAssignmentData($startDate, $endDate, ?string $companyUuid = null, ?string $timezone = null, ?string $fleetUuid = null): array
    {
        try {
            // Validate company UUID if provided
            if ($companyUuid !== null) {
                if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $companyUuid)) {
                    throw new \InvalidArgumentException('Invalid company UUID format');
                }
            }
            
            // Validate fleet UUID if provided
            if ($fleetUuid !== null) {
                if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $fleetUuid)) {
                    throw new \InvalidArgumentException('Invalid fleet UUID format');
                }
            }
            
            // Set default timezone if not provided
            $timezone = $timezone ?: 'UTC';
            
            // Handle timezone conversions
            if ($timezone && ($timezone !== 'UTC')) {
                if ($timezone === 'Asia/Calcutta') {
                    $timezone = 'Asia/Kolkata'; // Convert old timezone to the correct one
                }
            }
            
            // Validate timezone
            if (!in_array($timezone, timezone_identifiers_list())) {
                throw new \InvalidArgumentException('Invalid timezone: ' . $timezone);
            }
            
            // Convert to Carbon if string, handling DD-MM-YYYY format
            if (is_string($startDate)) {
                // Check if date is in DD-MM-YYYY format and convert to YYYY-MM-DD
                if (preg_match('/^\d{2}-\d{2}-\d{4}$/', $startDate)) {
                    $parts = explode('-', $startDate);
                    $startDate = $parts[2] . '-' . $parts[1] . '-' . $parts[0];
                }
                $startDate = Carbon::parse($startDate);
            }
            
            if (is_string($endDate)) {
                // Check if date is in DD-MM-YYYY format and convert to YYYY-MM-DD
                if (preg_match('/^\d{2}-\d{2}-\d{4}$/', $endDate)) {
                    $parts = explode('-', $endDate);
                    $endDate = $parts[2] . '-' . $parts[1] . '-' . $parts[0];
                }
                $endDate = Carbon::parse($endDate);
            }
            
            $start = $startDate;
            $end = $endDate;
            
            \Log::info('Generating shift assignment data for date range: ' . $start->format('Y-m-d') . ' to ' . $end->format('Y-m-d'));
            \Log::info('Company UUID: ' . ($companyUuid ?? 'null'));
            \Log::info('Fleet UUID: ' . ($fleetUuid ?? 'null'));
            \Log::info('Timezone: ' . $timezone);
            
            // Get all drivers for the company and fleet
            $drivers = $this->getDrivers($companyUuid, $fleetUuid);
            
            // Generate dates array
            $dates = $this->generateDatesArray($start, $end);
            
            // Generate resources (drivers) array
            $resources = $this->generateResourcesArray($drivers, $start, $end);
            
            // Get real orders as dated shifts
            $datedShifts = $this->getOrdersAsShifts($start, $end, $timezone, $companyUuid, $fleetUuid);
            
            // Get pre-assigned shifts (orders that already have a driver assigned within dates)
            $preAssignedShifts = $this->getPreAssignedShifts($start, $end, $timezone, $companyUuid, $fleetUuid);

            // Build previous allocation data matrix by resource and date
            $previousAllocationData = $this->getPreviousAllocationData($start, $end, $companyUuid, $resources, $dates, $timezone);
            
            // Get vehicles data with unavailable dates
            $vehiclesData = $this->getVehiclesData($start, $end, $companyUuid, $fleetUuid, $timezone);
            
            \Log::info('Generated shift assignment data with ' . count($dates) . ' dates, ' . 
                     count($resources) . ' resources, ' . count($datedShifts) . ' dated shifts, ' . 
                     count($preAssignedShifts) . ' pre-assigned shifts, and ' . count($vehiclesData) . ' vehicles');
            
            return [
                'dates' => $dates,
                'resources' => $resources,
                'dated_shifts' => $datedShifts,
                'pre_assigned_shifts' => $preAssignedShifts,
                'problem_type' => 'shift_assignment',
                'recurring_shifts' => null,
                'previous_allocation_data' => $previousAllocationData,
                'vehicles_data' => $vehiclesData
            ];
        } catch (\Exception $e) {
            \Log::error('Error generating shift assignment data: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Apply allocated resources to update orders assignments and schedule times.
     * Also supports unassigning drivers from orders via the uncovered_shifts payload.
     *
     * @param array $allocatedResources
     * @param string|null $timezone Input times' timezone (defaults to app timezone, stored as UTC)
     * @param array $uncoveredShifts Map of date => [order_ids] to unassign drivers from
     * @return array Summary of updates and unassignments
     */
    public function applyAllocatedResources(array $allocatedResources, ?string $timezone = null, array $uncoveredShifts = []): array
    {
        $timezone = $timezone ?: config('app.timezone', 'UTC');
        
        // Validate timezone
        if (!in_array($timezone, timezone_identifiers_list())) {
            throw new \InvalidArgumentException('Invalid timezone: ' . $timezone);
        }
        
        \Log::info('Applying allocations with timezone: ' . $timezone);
        $updatedOrders = [];
        $skippedAssignments = 0;
        $errors = [];
        $unassignedOrders = [];

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
                    // Parse start_time - it may already contain the full date and time
                    $localDateTime = null;
                    if (strpos($startTime, ' ') !== false) {
                        // start_time already contains date and time, parse it directly
                        try {
                            $localDateTime = Carbon::parse($startTime, $timezone);
                            \Log::info("Parsing start_time directly: {$startTime} in timezone {$timezone}");
                        } catch (\Exception $parseError) {
                            throw new \Exception("Invalid start_time format '{$startTime}': " . $parseError->getMessage());
                        }
                    } else {
                        // start_time is just time, combine with date
                        try {
                            $localDateTime = Carbon::parse($date . ' ' . $startTime, $timezone);
                            \Log::info("Combining date and time: {$date} {$startTime} in timezone {$timezone}");
                        } catch (\Exception $parseError) {
                            throw new \Exception("Invalid time format '{$startTime}' for date '{$date}': " . $parseError->getMessage());
                        }
                    }
                    $scheduledAtUtc = $localDateTime->clone()->setTimezone('UTC');

                    // Resolve order by public_id then uuid
                    $order = Order::withoutGlobalScopes()
                        ->where(function($query) use ($orderPublicOrUuid) {
                            $query->where('public_id', $orderPublicOrUuid)
                                  ->orWhere('uuid', $orderPublicOrUuid);
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

                    // Update driver assignment and scheduling
                    $updates = [];
                    if ($driver) {
                        $updates['driver_assigned_uuid'] = $driver->uuid;
                        \Log::info("Updating order {$order->public_id} with driver {$driver->uuid}");
                    } else {
                        \Log::warning("No driver found for resource_id '{$resourceId}' or resource_name '{$resourceName}', skipping driver assignment for order {$order->public_id}");
                    }

                    // Update scheduled time if start_time is provided
                    if ($startTime) {
                        $updates['scheduled_at'] = $scheduledAtUtc;
                        \Log::info("Updating order {$order->public_id} scheduled time to {$scheduledAtUtc->format('Y-m-d H:i:s')} UTC");
                    }

                    // Update estimated end time if end_time is provided
                    $endTime = $assignment['end_time'] ?? null;
                    if ($endTime) {
                        $endDateTime = null;
                        if (strpos($endTime, ' ') !== false) {
                            // end_time already contains date and time, parse it directly
                            try {
                                $endDateTime = Carbon::parse($endTime, $timezone);
                                \Log::info("Parsing end_time directly: {$endTime} in timezone {$timezone}");
                            } catch (\Exception $parseError) {
                                throw new \Exception("Invalid end_time format '{$endTime}': " . $parseError->getMessage());
                            }
                        } else {
                            // end_time is just time, combine with date
                            try {
                                $endDateTime = Carbon::parse($date . ' ' . $endTime, $timezone);
                                \Log::info("Combining date and end_time: {$date} {$endTime} in timezone {$timezone}");
                            } catch (\Exception $parseError) {
                                throw new \Exception("Invalid end_time format '{$endTime}' for date '{$date}': " . $parseError->getMessage());
                            }
                        }
                        $estimatedEndUtc = $endDateTime->clone()->setTimezone('UTC');
                        $updates['estimated_end_date'] = $estimatedEndUtc;
                        \Log::info("Updating order {$order->public_id} estimated end time to {$estimatedEndUtc->format('Y-m-d H:i:s')} UTC");
                    }

                    if (!empty($updates)) {
                        Order::where('uuid', $order->uuid)->update($updates);
                        $updatedOrders[] = $order->public_id ?? $order->uuid;
                    } else {
                        // no-op, nothing to update
                        $skippedAssignments++;
                    }
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

        // Process uncovered shifts: unassign drivers from specified orders
        foreach ($uncoveredShifts as $date => $orderIds) {
            if (!is_array($orderIds)) {
                continue;
            }
            foreach ($orderIds as $orderId) {
                try {
                    $order = Order::withoutGlobalScopes()
                        ->where(function ($q) use ($orderId) {
                            $q->where('public_id', $orderId)
                              ->orWhere('uuid', $orderId);
                        })
                        ->first();

                    if (!$order) {
                        $errors[] = [
                            'resource' => null,
                            'date' => $date,
                            'order' => $orderId,
                            'message' => 'Order not found for unassignment'
                        ];
                        continue;
                    }

                    // Only update if currently assigned
                    if (!is_null($order->driver_assigned_uuid)) {
                        Order::where('uuid', $order->uuid)->update(['driver_assigned_uuid' => null]);
                        $unassignedOrders[] = $order->public_id ?? $order->uuid;
                        \Log::info("Unassigned driver from order {$order->public_id} (date {$date})");
                    }
                } catch (\Exception $e) {
                    $errors[] = [
                        'resource' => null,
                        'date' => $date,
                        'order' => $orderId,
                        'message' => $e->getMessage()
                    ];
                }
            }
        }

        // Deduplicate updated order ids
        $updatedOrders = array_values(array_unique($updatedOrders));
        $unassignedOrders = array_values(array_unique($unassignedOrders));

        return [
            'updated_orders' => count($updatedOrders),
            'updated_order_ids' => $updatedOrders,
            'unassigned_orders' => count($unassignedOrders),
            'unassigned_order_ids' => $unassignedOrders,
            'skipped_assignments' => $skippedAssignments,
            'errors' => $errors,
        ];
    }

    
    
    // Mock data generation methods have been removed to only process real data
    
    /**
     * Get drivers for the company
     *
     * @param string|null $companyUuid
     * @param string|null $fleetUuid
     * @return Collection
     */
    private function getDrivers(?string $companyUuid = null, ?string $fleetUuid = null): Collection
    {
        try {
            \Log::info('Getting drivers with company_uuid: ' . ($companyUuid ?? 'null') . ' and fleet_uuid: ' . ($fleetUuid ?? 'null'));
            
            $query = Driver::with(['user'])
                ->whereNull('deleted_at')
                ->where('status', 'active');
                
            if ($companyUuid) {
                \Log::info('Filtering drivers by company_uuid: ' . $companyUuid);
                $query->where('company_uuid', $companyUuid);
            }

            if ($fleetUuid) {
                \Log::info('Filtering drivers by fleet_uuid: ' . $fleetUuid);
                // Filter drivers by fleet using the fleet_drivers relationship table
                $query->whereHas('fleetDrivers', function ($q) use ($fleetUuid) {
                    $q->where('fleet_uuid', $fleetUuid);
                });
            }
            \Log::info('SQL', [$query->toSql(), $query->getBindings()]);
            // Get unique drivers to avoid duplicates
            $drivers = $query->get()->unique('uuid');
            \Log::info('SQL', [$query->toSql(), $query->getBindings()]);
            \Log::info('Found ' . $drivers->count() . ' unique drivers');
            return $drivers;
        } catch (\Exception $e) {
            \Log::error('Error getting drivers: ' . $e->getMessage());
            // Return empty collection if Driver model fails
            return collect();
        }
    }

    /**
     * Build previous allocation data per resource and date from orders already assigned to drivers
     *
     * @param mixed $start
     * @param mixed $end
     * @param string|null $companyUuid
     * @param array $resources
     * @param array $dates
     * @param string $timezone
     * @return array
     */
    private function getPreviousAllocationData($start, $end, ?string $companyUuid, array $resources, array $dates, string $timezone): array
    {
        try {
            // Calculate previous week window based on LOCAL timezone, but query DB in UTC
            $localStart = Carbon::parse($start)->copy()->setTimezone($timezone)->startOfDay();
            $prevStartUtc = $localStart->copy()->subDays(7)->startOfDay()->setTimezone('UTC');
            $prevEndUtc = $localStart->copy()->subDay()->endOfDay()->setTimezone('UTC');

            \Log::info('Fetching previous allocation data (local tz window -> utc query)', [
                'timezone' => $timezone,
                'local_start' => $localStart->format('Y-m-d H:i:s'),
                'prev_start_utc' => $prevStartUtc->format('Y-m-d H:i:s'),
                'prev_end_utc' => $prevEndUtc->format('Y-m-d H:i:s'),
            ]);

            // Fetch assigned orders within previous range, limit to same statuses used for dated_shifts
            $query = DB::table('orders')
                ->select('public_id', 'driver_assigned_uuid', 'scheduled_at', 'estimated_end_date', 'vehicle_assigned_uuid')
                ->whereNotNull('scheduled_at')
                ->whereNotNull('driver_assigned_uuid')
                ->whereIn('status', ['created', 'planned'])
                ->where('scheduled_at', '>=', $prevStartUtc->toDateTimeString())
                ->where('scheduled_at', '<=', $prevEndUtc->toDateTimeString());
                
            // Log the query for debugging
            \Log::info('Previous week query:', [
                'start_utc' => $prevStartUtc->toDateTimeString(),
                'end_utc' => $prevEndUtc->toDateTimeString(),
                'sql' => $query->toSql(),
                'bindings' => $query->getBindings()
            ]);
                
            if ($companyUuid) {
                $query->where('company_uuid', $companyUuid);
            }
            
            $orders = $query->get();
            \Log::info('Found ' . $orders->count() . ' orders in previous allocation period');

            // Group orders by driver and LOCAL date (keys in requested timezone)
            $byDriverDate = [];
            foreach ($orders as $order) {
                $sourceDate = Carbon::parse($order->scheduled_at)->setTimezone($timezone);
                $dateKey = $sourceDate->format('Y-m-d');
                
                // Compute duration and times
                $duration = $this->calculateOrderDuration($order);
                $startTime = $sourceDate->copy();
                $endTime = $startTime->copy()->addMinutes($duration);
                $driverId = $order->driver_assigned_uuid;
                
                if (!isset($byDriverDate[$driverId][$dateKey])) {
                    $byDriverDate[$driverId][$dateKey] = [
                        'public_id' => $order->public_id,
                        'start_time' => $startTime->copy()->format('Y-m-d H:i:s'),
                        'end_time' => $endTime->copy()->format('Y-m-d H:i:s'),
                        'duration_minutes' => $duration,
                        // Keep original UTC scheduled_at for comparisons
                        'scheduled_at' => Carbon::parse($order->scheduled_at)->toDateTimeString(),
                        'vehicle_id' => $order->vehicle_assigned_uuid ?? null,
                    ];
                } else {
                    // Keep the earliest time (compare on UTC scheduled_at)
                    $existing = $byDriverDate[$driverId][$dateKey];
                    if (Carbon::parse($order->scheduled_at)->lt(Carbon::parse($existing['scheduled_at']))) {
                        $byDriverDate[$driverId][$dateKey] = [
                            'public_id' => $order->public_id,
                            'start_time' => $startTime->copy()->format('Y-m-d H:i:s'),
                            'end_time' => $endTime->copy()->format('Y-m-d H:i:s'),
                            'duration_minutes' => $duration,
                            'scheduled_at' => Carbon::parse($order->scheduled_at)->toDateTimeString(),
                            'vehicle_id' => $order->vehicle_assigned_uuid ?? null,
                        ];
                    }
                }
            }

            // Build payload with previous week's LOCAL dates
            $payload = [];
            $prevWeekDates = [];
            
            // Generate previous week local dates (keys in requested timezone)
            $currentDate = $localStart->copy()->subDays(7);
            $endDate = $localStart->copy()->subDay();
            
            while ($currentDate->lte($endDate)) {
                $dateKey = $currentDate->format('Y-m-d');
                $prevWeekDates[$dateKey] = $dateKey;
                $currentDate->addDay();
            }
            
            foreach ($resources as $resource) {
                $driverId = $resource['id'] ?? null;
                $driverName = $resource['name'] ?? null;
                
                // Initialize all previous week's dates with empty object {}
                $assignments = new \stdClass();
                
                // Add actual assignments for the driver
                if ($driverId && isset($byDriverDate[$driverId])) {
                    foreach ($byDriverDate[$driverId] as $date => $info) {
                        $assignment = new \stdClass();
                        $assignment->id = $info['public_id'];
                        $assignment->start_time = $info['start_time'];
                        $assignment->end_time = $info['end_time'];
                        $assignment->duration_minutes = $info['duration_minutes'];
                        
                        if (isset($info['vehicle_id']) && $info['vehicle_id'] !== null) {
                            $assignment->vehicle_id = $info['vehicle_id'];
                        } else {
                            $assignment->vehicle_id = null;
                        }
                        
                        $assignments->{$date} = $assignment;
                    }
                }
                
                // Ensure all previous week dates are included, even if empty
                foreach ($prevWeekDates as $date) {
                    if (!isset($assignments->{$date})) {
                        $assignments->{$date} = new \stdClass();
                    }
                }

                $payload[] = [
                    'resource_id' => $driverId,
                    'resource_name' => $driverName,
                    'assignments' => $assignments,
                ];
            }

            return $payload;
        } catch (\Exception $e) {
            \Log::error('Error building previous_allocation_data: ' . $e->getMessage());
            return [];
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
                'preferences' => null,
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
     * Apply timezone-aware date filtering to a query with CONVERT_TZ fallback
     *
     * @param \Illuminate\Database\Query\Builder $query
     * @param string $dateColumn
     * @param \Carbon\Carbon $start
     * @param \Carbon\Carbon $end
     * @param string $timezone
     * @return void
     */
    private function applyTimezoneAwareDateFilter($query, string $dateColumn, $start, $end, string $timezone): void
    {
        if ($timezone === 'UTC') {
            // If timezone is UTC, use direct date filtering
            $query->whereDate($dateColumn, '>=', $start->format('Y-m-d'))
                  ->whereDate($dateColumn, '<=', $end->format('Y-m-d'));
            return;
        }

        // Test if CONVERT_TZ works on this MySQL server
        $testConvert = DB::selectOne('SELECT CONVERT_TZ(NOW(), "UTC", ?) as test_time', [$timezone]);
        
        if ($testConvert && $testConvert->test_time !== null) {
            // CONVERT_TZ works, use timezone-aware filtering
            $query->whereRaw("DATE(CONVERT_TZ({$dateColumn}, \"UTC\", ?)) >= ?", [$timezone, $start->format('Y-m-d')])
                  ->whereRaw("DATE(CONVERT_TZ({$dateColumn}, \"UTC\", ?)) <= ?", [$timezone, $end->format('Y-m-d')]);
        } else {
            // CONVERT_TZ failed, use UTC offset calculation as fallback
            \Log::warning('CONVERT_TZ failed, using UTC offset fallback for timezone: ' . $timezone);
            
            // Calculate timezone offset dynamically
            $offsetMinutes = $this->getTimezoneOffsetMinutes($timezone);
            
            // Convert start/end dates to UTC range accounting for timezone offset
            $utcStart = $start->copy()->subMinutes($offsetMinutes);
            $utcEnd = $end->copy()->addDay()->subMinutes($offsetMinutes)->subSecond();
            
            $query->where($dateColumn, '>=', $utcStart->format('Y-m-d H:i:s'))
                  ->where($dateColumn, '<=', $utcEnd->format('Y-m-d H:i:s'));
        }
    }

    /**
     * Get timezone offset in minutes from UTC
     *
     * @param string $timezone
     * @return int
     */
    private function getTimezoneOffsetMinutes(string $timezone): int
    {
        try {
            $utc = new \DateTimeZone('UTC');
            $tz = new \DateTimeZone($timezone);
            $now = new \DateTime('now', $utc);
            
            // Get offset in seconds and convert to minutes
            $offsetSeconds = $tz->getOffset($now);
            return intval($offsetSeconds / 60);
        } catch (\Exception $e) {
            \Log::error('Failed to calculate timezone offset for: ' . $timezone . ', error: ' . $e->getMessage());
            
            // Fallback for common timezones
            $commonOffsets = [
                'Asia/Kolkata' => 330,  // UTC+5:30
                'Asia/Calcutta' => 330, // UTC+5:30 (old name)
                'America/New_York' => -300, // UTC-5 (EST, varies with DST)
                'Europe/London' => 0,   // UTC+0 (GMT, varies with DST)
                'Asia/Tokyo' => 540,    // UTC+9
            ];
            
            return $commonOffsets[$timezone] ?? 0;
        }
    }

    /**
     * Get orders as shifts
     *
     * @param mixed $start
     * @param mixed $end
     * @param string|null $companyUuid
     * @param string $timezone
     * @return array
     */
    private function getOrdersAsShifts($start, $end, string $timezone, ?string $companyUuid = null, ?string $fleetUuid = null): array
    {
        try {
            // Handle timezone conversions (same as in generateShiftAssignmentData)
            if ($timezone && ($timezone !== 'UTC')) {
                if ($timezone === 'Asia/Calcutta') {
                    $timezone = 'Asia/Kolkata'; // Convert old timezone to the correct one
                }
            }
            
            // Get orders for the date range based on scheduled_at (date only)
            // Exclude orders that already have a driver assigned since they're in pre_assigned_shifts
            $query = DB::table('orders')
                ->whereNotNull('scheduled_at')
                ->whereNull('driver_assigned_uuid') // Exclude orders with assigned drivers
                ->whereIn('status', ['created', 'planned']);
                
            // Apply timezone-aware date filtering with fallback
            $this->applyTimezoneAwareDateFilter($query, 'scheduled_at', $start, $end, $timezone);
                
            // Filter by company if provided
            if ($companyUuid) {
                $query->where('company_uuid', $companyUuid);
            }
            if ($fleetUuid) {
                $query->where('fleet_uuid', $fleetUuid);
            }
            
            $orders = $query->get();
            
            $datedShifts = [];
            
            foreach ($orders as $order) {
                // We already filtered by scheduled_at in the query, so we can use it directly
                $shiftDate = Carbon::parse($order->scheduled_at);
                
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
            
            \Log::info('Processed ' . count($datedShifts) . ' dated shifts (unassigned orders only)');
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
     * Get pre-assigned shifts (orders with driver already assigned) within date range
     *
     * @param mixed $start
     * @param mixed $end
     * @param string $timezone
     * @param string|null $companyUuid
     * @param string|null $fleetUuid
     * @return array
     */
    public function getPreAssignedShifts($start, $end, string $timezone, ?string $companyUuid = null, ?string $fleetUuid = null): array
    {
        try {
            // Handle timezone conversions (same as in generateShiftAssignmentData)
            if ($timezone && ($timezone !== 'UTC')) {
                if ($timezone === 'Asia/Calcutta') {
                    $timezone = 'Asia/Kolkata'; // Convert old timezone to the correct one
                }
            }
        
        $query = DB::table('orders')
            ->whereNotNull('scheduled_at')
            ->whereNotNull('driver_assigned_uuid') // Only orders with assigned drivers
            ->whereIn('status', ['created', 'planned']);
        
        // Apply timezone-aware date filtering with fallback
        $this->applyTimezoneAwareDateFilter($query, 'scheduled_at', $start, $end, $timezone);
        
        if ($companyUuid) {
            $query->where('company_uuid', $companyUuid);
            \Log::info('Filtering orders by company_uuid: ' . $companyUuid);
        }
        if ($fleetUuid) {
            $query->where('fleet_uuid', $fleetUuid);
            \Log::info('Filtering orders by fleet_uuid: ' . $fleetUuid);
        }
        
        // Log the SQL query for debugging
        \Log::info('Pre-assigned shifts query:', [
            'start_date' => $start->format('Y-m-d'),
            'end_date' => $end->format('Y-m-d'),
            'timezone' => $timezone,
            'sql' => $query->toSql(),
            'bindings' => $query->getBindings()
        ]);
        
        // Log the final SQL query and bindings
        $sql = $query->toSql();
        $bindings = $query->getBindings();
        \Log::info('Pre-assigned shifts query:', [
            'sql' => $sql,
            'bindings' => $bindings,
            'start_date' => $start->format('Y-m-d'),
            'end_date' => $end->format('Y-m-d'),
            'timezone' => $timezone
        ]);
        
        $orders = $query->get();
        
        if ($orders->isEmpty()) {
            // Log additional diagnostic information
            $totalOrders = DB::table('orders')
                ->when($companyUuid, function($q) use ($companyUuid) {
                    return $q->where('company_uuid', $companyUuid);
                })
                ->when($fleetUuid, function($q) use ($fleetUuid) {
                    return $q->where('fleet_uuid', $fleetUuid);
                })
                ->count();
                
            $totalWithDrivers = DB::table('orders')
                ->whereNotNull('driver_assigned_uuid')
                ->when($companyUuid, function($q) use ($companyUuid) {
                    return $q->where('company_uuid', $companyUuid);
                })
                ->when($fleetUuid, function($q) use ($fleetUuid) {
                    return $q->where('fleet_uuid', $fleetUuid);
                })
                ->count();
                
            \Log::warning('No pre-assigned shifts found', [
                'total_orders' => $totalOrders,
                'total_with_drivers' => $totalWithDrivers,
                'date_range' => $start->format('Y-m-d') . ' to ' . $end->format('Y-m-d'),
            if ($fleetUuid) {
                $query->where('fleet_uuid', $fleetUuid);
                \Log::info('Filtering orders by fleet_uuid: ' . $fleetUuid);
            }
            
            \Log::info('Using timezone-aware date filtering for timezone: ' . $timezone);
            
            // Log the SQL query for debugging
            \Log::info('Pre-assigned shifts query:', [
                'start_date' => $start->format('Y-m-d'),
                'end_date' => $end->format('Y-m-d'),
                'timezone' => $timezone,
                'sql' => $query->toSql(),
                'bindings' => $query->getBindings()
            ]);
            
            // Log the final SQL query and bindings
            $sql = $query->toSql();
            $bindings = $query->getBindings();
            \Log::info('Pre-assigned shifts query:', [
                'sql' => $sql,
                'bindings' => $bindings,
                'start_date' => $start->format('Y-m-d'),
                'end_date' => $end->format('Y-m-d'),
                'timezone' => $timezone
            ]);
            
            $orders = $query->get();
            
            if ($orders->isEmpty()) {
                // Log additional diagnostic information
                $totalOrders = DB::table('orders')
                    ->when($companyUuid, function($q) use ($companyUuid) {
                        return $q->where('company_uuid', $companyUuid);
                    })
                    ->when($fleetUuid, function($q) use ($fleetUuid) {
                        return $q->where('fleet_uuid', $fleetUuid);
                    })
                    ->count();
                    
                $totalWithDrivers = DB::table('orders')
                    ->whereNotNull('driver_assigned_uuid')
                    ->when($companyUuid, function($q) use ($companyUuid) {
                        return $q->where('company_uuid', $companyUuid);
                    })
                    ->when($fleetUuid, function($q) use ($fleetUuid) {
                        return $q->where('fleet_uuid', $fleetUuid);
                    })
                    ->count();
                    
                \Log::warning('No pre-assigned shifts found', [
                    'total_orders' => $totalOrders,
                    'total_with_drivers' => $totalWithDrivers,
                    'date_range' => $start->format('Y-m-d') . ' to ' . $end->format('Y-m-d'),
                    'timezone' => $timezone,
                    'company_uuid' => $companyUuid,
                    'fleet_uuid' => $fleetUuid
                ]);
            } else {
                \Log::info('Found ' . $orders->count() . ' orders with assigned drivers in date range');
            }
            
            $preAssigned = [];
            foreach ($orders as $order) {
                $startTime = Carbon::parse($order->scheduled_at);
                // Compute duration and end time
                $duration = $this->calculateOrderDuration($order);
                $endTime = $startTime->copy()->addMinutes($duration);
                
                // Convert times to the specified timezone
                $startTimeInTimezone = $startTime->copy()->setTimezone($timezone)->format('Y-m-d H:i:s');
                $endTimeInTimezone = $endTime->copy()->setTimezone($timezone)->format('Y-m-d H:i:s');
                
                $entry = [
                    'id' => $order->public_id,
                    'start_time' => $startTimeInTimezone,
                    'end_time' => $endTimeInTimezone,
                    'duration_minutes' => $duration,
                    'resource_id' => $order->driver_assigned_uuid,
                    'vehicle_id' => $order->vehicle_assigned_uuid ?? null,
                ];
                $preAssigned[] = $entry;
            }
            
            \Log::info('Processed ' . count($preAssigned) . ' pre-assigned shifts');
            return $preAssigned;
        } catch (\Exception $e) {
            \Log::error('Error in getPreAssignedShifts: ' . $e->getMessage());
            return [];
        }
    }
    
    // Previous allocation methods have been removed as they are no longer needed
    
    /**
     * Get available drivers for a specific date
     *
     * @param string $date
     * @param string|null $companyUuid
     * @param string|null $fleetUuid
     * @return array
     * @throws \InvalidArgumentException If company_uuid is invalid
     */
    public function getAvailableDrivers(string $date, ?string $companyUuid = null, ?string $fleetUuid = null): array
    {
        try {
            // Validate company UUID if provided
            if ($companyUuid !== null) {
                if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $companyUuid)) {
                    throw new \InvalidArgumentException('Invalid company UUID format');
                }
            }
            
            // Validate fleet UUID if provided
            if ($fleetUuid !== null) {
                if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $fleetUuid)) {
                    throw new \InvalidArgumentException('Invalid fleet UUID format');
                }
            }
            
            \Log::info('Getting available drivers for date: ' . $date . ', company_uuid: ' . ($companyUuid ?? 'null') . ', fleet_uuid: ' . ($fleetUuid ?? 'null'));
            
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
            
            // Add fleet filter if provided
            if ($fleetUuid) {
                \Log::info('Filtering available drivers by fleet_uuid: ' . $fleetUuid);
                $query->whereHas('fleetDrivers', function ($q) use ($fleetUuid) {
                    $q->where('fleet_uuid', $fleetUuid);
                });
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
    
    /**
     * Get vehicles data with unavailable dates
     *
     * @param mixed $start
     * @param mixed $end
     * @param string|null $companyUuid
     * @param string|null $fleetUuid
     * @param string $timezone
     * @return array
     */
    private function getVehiclesData($start, $end, ?string $companyUuid = null, ?string $fleetUuid = null, string $timezone = 'UTC'): array
    {
        try {
            \Log::info('Getting vehicles data with company_uuid: ' . ($companyUuid ?? 'null') . ', fleet_uuid: ' . ($fleetUuid ?? 'null') . ' and timezone: ' . $timezone);
            
            if (!$companyUuid) {
                \Log::info('Company UUID not provided, returning empty vehicles data');
                return [];
            }
            
            // Get vehicles for the company (optionally filtered by fleet)
            if ($fleetUuid) {
                // Get vehicles for specific fleet
                \Log::info('Getting vehicles for specific fleet: ' . $fleetUuid);
                $vehiclesQuery = DB::table('vehicles')
                    ->join('fleet_vehicles', 'vehicles.uuid', '=', 'fleet_vehicles.vehicle_uuid')
                    ->select('vehicles.uuid', 'vehicles.plate_number', 'vehicles.company_uuid')
                    ->where('vehicles.company_uuid', $companyUuid)
                    ->where('fleet_vehicles.fleet_uuid', $fleetUuid)
                    ->whereNull('vehicles.deleted_at')
                    ->whereNull('fleet_vehicles.deleted_at');
            } else {
                // Get all vehicles for the company
                \Log::info('Getting all vehicles for company (no fleet filter)');
                $vehiclesQuery = DB::table('vehicles')
                    ->select('vehicles.uuid', 'vehicles.plate_number', 'vehicles.company_uuid')
                    ->where('vehicles.company_uuid', $companyUuid)
                    ->whereNull('vehicles.deleted_at');
            }
                
            $vehicles = $vehiclesQuery->get();
            \Log::info('Found ' . $vehicles->count() . ' vehicles for fleet and company');
            
            if ($vehicles->isEmpty()) {
                return [];
            }
            
            $vehicleUuids = $vehicles->pluck('uuid')->toArray();
            $vehiclesData = [];
            
            // Get leave requests for vehicles (unavailability_type = "vehicle")
            $leaveRequests = DB::table('leave_requests')
                ->whereIn('vehicle_uuid', $vehicleUuids)
                ->where('unavailability_type', 'vehicle')
                ->where('status', 'Approved')
                ->whereNull('deleted_at')
                ->where('deleted', 0)
                ->where(function ($query) use ($start, $end) {
                    $query->whereBetween('start_date', [$start, $end])
                          ->orWhereBetween('end_date', [$start, $end])
                          ->orWhere(function ($q) use ($start, $end) {
                              $q->where('start_date', '<=', $start)
                                ->where('end_date', '>=', $end);
                          });
                })
                ->get();
                
            \Log::info('Found ' . $leaveRequests->count() . ' approved leave requests for vehicles');
            \Log::info('Leave request query details:', [
                'vehicle_uuids' => $vehicleUuids,
                'start_date' => $start->format('Y-m-d'),
                'end_date' => $end->format('Y-m-d')
            ]);
            
            // Get orders where vehicles are already assigned (within date range)
            $ordersQuery = DB::table('orders')
                ->whereIn('vehicle_assigned_uuid', $vehicleUuids)
                ->whereNotNull('scheduled_at')
                ->whereIn('status', ['created', 'planned']);
                
            // Apply timezone-aware date filtering with fallback for orders
            if ($timezone !== 'UTC') {
                // Test if CONVERT_TZ works on this MySQL server
                $testConvert = DB::selectOne('SELECT CONVERT_TZ(NOW(), "UTC", ?) as test_time', [$timezone]);
                
                if ($testConvert && $testConvert->test_time !== null) {
                    // CONVERT_TZ works, use timezone-aware filtering
                    $ordersQuery->whereRaw('DATE(CONVERT_TZ(scheduled_at, "UTC", ?)) >= ?', [$timezone, $start->format('Y-m-d')])
                               ->whereRaw('DATE(CONVERT_TZ(scheduled_at, "UTC", ?)) <= ?', [$timezone, $end->format('Y-m-d')]);
                } else {
                    // CONVERT_TZ failed, use UTC offset calculation as fallback
                    $offsetHours = ($timezone === 'Asia/Kolkata') ? 5.5 : 0;
                    $offsetMinutes = $offsetHours * 60;
                    $utcStart = $start->copy()->subMinutes($offsetMinutes);
                    $utcEnd = $end->copy()->addDay()->subMinutes($offsetMinutes)->subSecond();
                    
                    $ordersQuery->where('scheduled_at', '>=', $utcStart->format('Y-m-d H:i:s'))
                               ->where('scheduled_at', '<=', $utcEnd->format('Y-m-d H:i:s'));
                }
            } else {
                // If timezone is UTC, use direct date filtering
                $ordersQuery->whereDate('scheduled_at', '>=', $start->format('Y-m-d'))
                           ->whereDate('scheduled_at', '<=', $end->format('Y-m-d'));
            }
            
            if ($companyUuid) {
                $ordersQuery->where('company_uuid', $companyUuid);
            }
            
            $assignedOrders = $ordersQuery->get();
            \Log::info('Found ' . $assignedOrders->count() . ' orders with assigned vehicles in date range');
            \Log::info('Orders query details:', [
                'vehicle_uuids' => $vehicleUuids,
                'start_date' => $start->format('Y-m-d'),
                'end_date' => $end->format('Y-m-d'),
                'timezone' => $timezone,
                'company_uuid' => $companyUuid
            ]);
            
            // Process each vehicle
            foreach ($vehicles as $vehicle) {
                $unavailableDates = [];
                
                // Process leave requests for this vehicle
                foreach ($leaveRequests as $leave) {
                    if ($leave->vehicle_uuid === $vehicle->uuid) {
                        $current = Carbon::parse($leave->start_date);
                        $endDate = Carbon::parse($leave->end_date);
                        
                        while ($current->lte($endDate)) {
                            if ($current->between($start, $end)) {
                                $unavailableDates[] = $current->format('Y-m-d');
                            }
                            $current->addDay();
                        }
                    }
                }
                
                // Process orders where this vehicle is assigned
                foreach ($assignedOrders as $order) {
                    if ($order->vehicle_assigned_uuid === $vehicle->uuid) {
                        // Convert scheduled_at to requested timezone and extract date
                        $orderDate = Carbon::parse($order->scheduled_at);
                        if ($timezone !== 'UTC') {
                            $orderDate->setTimezone($timezone);
                        }
                        $dateKey = $orderDate->format('Y-m-d');
                        
                        if (!in_array($dateKey, $unavailableDates)) {
                            $unavailableDates[] = $dateKey;
                        }
                    }
                }
                
                // Remove duplicates and sort
                $unavailableDates = array_unique($unavailableDates);
                sort($unavailableDates);
                
                $vehiclesData[] = [
                    'id' => $vehicle->uuid,
                    'plate_no' => $vehicle->plate_number,
                    'unavailable_dates' => $unavailableDates
                ];
            }
            
            \Log::info('Processed vehicles data for ' . count($vehiclesData) . ' vehicles');
            return $vehiclesData;
            
        } catch (\Exception $e) {
            \Log::error('Error getting vehicles data: ' . $e->getMessage());
            return [];
        }
    }
}
