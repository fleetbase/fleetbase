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
     * Generate shift assignment data for a given date range
     *
     * @param string $startDate
     * @param string $endDate
     * @param string|null $companyUuid
     * @return array
     */
    public function generateShiftAssignmentData(string $startDate, string $endDate, ?string $companyUuid = null): array
    {
        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);
        
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
    }
    
    /**
     * Check if FleetOps tables exist
     *
     * @return bool
     */
    private function fleetOpsTablesExist(): bool
    {
        try {
            // Try to check if orders table exists
            $tables = DB::select('SHOW TABLES');
            $tableNames = array_column($tables, 'Tables_in_' . env('DB_DATABASE', 'fleetbase'));
            
            $exists = in_array('orders', $tableNames);
            if (!$exists) {
                \Log::warning('Orders table does not exist in the database');
            }
            return $exists;
        } catch (\Exception $e) {
            \Log::error('Error checking if FleetOps tables exist: ' . $e->getMessage());
            return false;
        }
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
     * @param Carbon $start
     * @param Carbon $end
     * @return array
     */
    private function generateDatesArray(Carbon $start, Carbon $end): array
    {
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
     * @param Carbon $start
     * @param Carbon $end
     * @return array
     */
    private function generateResourcesArray(Collection $drivers, Carbon $start, Carbon $end): array
    {
        $resources = [];
        
        foreach ($drivers as $driver) {
            // Get unavailable dates for this driver
            $unavailableDates = $this->getUnavailableDates($driver, $start, $end);
            
            // Get driver preferences
            $preferences = $this->getDriverPreferences($driver);
            
            // Create resource entry for this driver
            $resources[] = [
                'id' => $driver->uuid,
                'name' => $driver->name,
                'preferences' => $preferences,
                'unavailable_dates' => $unavailableDates,
                'preferred_rest_days' => [] // Could be populated from driver preferences in the future
            ];
        }
        
        \Log::info('Generated resources array with ' . count($resources) . ' drivers');
        return $resources;
    }
    
    /**
     * Get unavailable dates for a driver from leave_requests table
     *
     * @param Driver $driver
     * @param Carbon $start
     * @param Carbon $end
     * @return array
     */
    private function getUnavailableDates(Driver $driver, Carbon $start, Carbon $end): array
    {
        try {
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
            
            // Generate unavailable dates from leave requests
            foreach ($leaveRequests as $leave) {
                $current = Carbon::parse($leave->start_date);
                $endDate = Carbon::parse($leave->end_date);
                
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
            
            \Log::info("Generated " . count($unavailableDates) . " unavailable dates for driver");
            if (!empty($unavailableDates)) {
                \Log::info("Unavailable dates: " . implode(', ', $unavailableDates));
            }
            
            return $unavailableDates;
        } catch (\Exception $e) {
            \Log::error("Error in getUnavailableDates: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Get driver preferences
     *
     * @param Driver $driver
     * @return array|null
     */
    private function getDriverPreferences(Driver $driver): ?array
    {
        // This would typically come from a driver preferences table
        // For now, we'll generate some sample preferences based on driver ID
        $driverId = $driver->public_id;
        
        // Generate different preferences for different drivers
        $preferences = [
            'D001' => null,
            'D002' => ['preferred_start_time' => '00:00', 'preferred_end_time' => '12:00'],
            'D003' => ['preferred_start_time' => '06:00', 'preferred_end_time' => '18:00'],
            'D004' => ['preferred_start_time' => '04:00', 'preferred_end_time' => '12:00'],
            'D005' => ['preferred_start_time' => '00:00', 'preferred_end_time' => '12:00'],
            'D006' => ['preferred_start_time' => '06:00', 'preferred_end_time' => '18:00'],
            'D007' => ['preferred_start_time' => '00:00', 'preferred_end_time' => '12:00'],
            'D008' => ['preferred_start_time' => '12:00', 'preferred_end_time' => '18:00'],
            'D009' => ['preferred_start_time' => '06:00', 'preferred_end_time' => '12:00'],
            'D010' => ['preferred_start_time' => '06:00', 'preferred_end_time' => '18:00'],
            'D012' => null,
            'D013' => ['preferred_start_time' => '12:00', 'preferred_end_time' => '18:00'],
            'D015' => ['preferred_start_time' => '18:00', 'preferred_end_time' => '23:00'],
            'D016' => ['preferred_start_time' => '06:00', 'preferred_end_time' => '12:00'],
            'D017' => ['preferred_start_time' => '10:00', 'preferred_end_time' => '16:00'],
            'D018' => null
        ];
        
        return $preferences[$driverId] ?? null;
    }
    
    /**
     * Get orders as shifts
     *
     * @param Carbon $start
     * @param Carbon $end
     * @param string|null $companyUuid
     * @return array
     */
    private function getOrdersAsShifts(Carbon $start, Carbon $end, ?string $companyUuid = null): array
    {
        try {
            \Log::info('Getting orders as shifts with company_uuid: ' . ($companyUuid ?? 'null'));
            
            // Check if orders table exists
            if (!$this->fleetOpsTablesExist()) {
                \Log::warning('Orders table does not exist. Returning empty array.');
                return [];
            }
            
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
}
