<?php

namespace Fleetbase\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Fleetbase\Models\Subscription;

class SubscriptionUpdateService
{
    /**
     * Cache for subscription data
     *
     * @var array
     */
    private $subscriptionCache = [];
    
    /**
     * Cache for addon quantities
     *
     * @var array
     */
    private $addonQuantitiesCache = [];

    protected $siteName;

    protected $apiKey;

    public function __construct()
    {
        $this->siteName = config('services.chargebee.site_name');
        $this->apiKey = config('services.chargebee.api_key');
    }

    /**
     * Update a subscription in Chargebee
     *
     * @param string $subscriptionId
     * @param array $updateData
     * @return array
     */
    public function updateSubscription(string $subscriptionId, array $updateData): array
    {
        try {
            // Use the correct endpoint for subscription updates

            $url = "https://{$this->siteName}.chargebee.com/api/v2/subscriptions/{$subscriptionId}/update_for_items";

            
            // Format the payload correctly for Chargebee API v2
            $formattedPayload = [];
            
            // Handle subscription_items if present
            if (isset($updateData['subscription_items']) && is_array($updateData['subscription_items'])) {
                foreach ($updateData['subscription_items'] as $index => $item) {
                    if (isset($item['id'])) {
                        $formattedPayload["subscription_items[id][$index]"] = $item['id'];
                    }
                    if (isset($item['item_price_id'])) {
                        $formattedPayload["subscription_items[item_price_id][$index]"] = $item['item_price_id'];
                    }
                    if (isset($item['quantity'])) {
                        $formattedPayload["subscription_items[quantity][$index]"] = $item['quantity'];
                    }
                    if (isset($item['unit_price'])) {
                        $formattedPayload["subscription_items[unit_price][$index]"] = $item['unit_price'];
                    }
                }
                
                // Remove the original subscription_items array
                unset($updateData['subscription_items']);
            }
            
            // Add any remaining parameters
            $formattedPayload = array_merge($formattedPayload, $updateData);
            
            // Log the formatted payload for debugging
            Log::debug('Formatted Chargebee update payload', [
                'subscription_id' => $subscriptionId,
                'payload' => $formattedPayload
            ]);
            
            // Make the API request with the correct content type and robust error handling
            try {
                $response = Http::asForm()
                    ->withBasicAuth($this->apiKey, '')
                    ->withOptions([
                        'timeout' => 30,
                        'connect_timeout' => 10
                    ])
                    ->post($url, $formattedPayload);
            } catch (\Exception $e) {
                Log::error('Exception during Chargebee API request in updateSubscription', [
                    'subscription_id' => $subscriptionId,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                
                return [
                    'success' => false,
                    'message' => 'Failed to update subscription',
                    'error' => 'API request failed: ' . $e->getMessage()
                ];
            }

            if ($response->successful()) {
                Log::info('Subscription updated successfully', [
                    'subscription_id' => $subscriptionId,
                    'status' => $response->status()
                ]);

                return [
                    'success' => true,
                    'subscription' => $response->json()
                ];
            } else {
                Log::error('Failed to update subscription', [
                    'subscription_id' => $subscriptionId,
                    'status' => $response->status(),
                    'error' => $response->json()
                ]);

                return [
                    'success' => false,
                    'message' => 'Failed to update subscription',
                    'error' => $response->json()
                ];
            }
        } catch (\Exception $e) {
            Log::error('Exception when updating subscription', [
                'subscription_id' => $subscriptionId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Get subscription details from Chargebee
     *
     * @param string $subscriptionId
     * @return array
     */
    public function getSubscription(string $subscriptionId): array
    {
        // Return cached result if available
        if (isset($this->subscriptionCache[$subscriptionId])) {
            return $this->subscriptionCache[$subscriptionId];
        }
        
        try {
            $url = "https://{$this->siteName}.chargebee.com/api/v2/subscriptions/{$subscriptionId}";
            
            // Optimize HTTP request with shorter timeouts and better error handling
            $response = Http::withBasicAuth($this->apiKey, '')
                ->withOptions([
                    'timeout' => 15,
                    'connect_timeout' => 5,
                    'http_errors' => false,
                    'verify' => true
                ])
                ->get($url);

            if ($response->successful()) {
                $data = $response->json();
                Log::info('Subscription retrieved', [
                    'subscription_id' => $subscriptionId
                ]);

                $result = [
                    'success' => true,
                    'message' => 'Subscription retrieved successfully',
                    'subscription' => $data
                ];
                
                // Cache the successful result
                $this->subscriptionCache[$subscriptionId] = $result;
                return $result;
            } else {
                Log::error('Failed to get subscription', [
                    'subscription_id' => $subscriptionId,
                    'status' => $response->status()
                ]);

                $result = [
                    'success' => false,
                    'message' => 'Failed to get subscription',
                    'error' => $response->json()
                ];
                
                // Cache the error result to prevent repeated failed calls
                $subscriptionCache[$subscriptionId] = $result;
                return $result;
            }

        } catch (\Exception $e) {
            Log::error('Exception while getting subscription', [
                'subscription_id' => $subscriptionId,
                'error' => $e->getMessage()
            ]);

            $result = [
                'success' => false,
                'message' => 'Exception occurred while getting subscription',
                'error' => $e->getMessage()
            ];
            
            // Cache the error result
            $subscriptionCache[$subscriptionId] = $result;
            return $result;
        }
    }

    /**
     * Cancel a subscription in Chargebee
     *
     * @param string $subscriptionId
     * @param array $cancelData
     * @return array
     */
    public function cancelSubscription(string $subscriptionId, array $cancelData = []): array
    {
        try {
            $url = "https://{$this->siteName}.chargebee.com/api/v2/subscriptions/{$subscriptionId}/cancel";
            
            Log::info('Cancelling subscription in Chargebee', [
                'subscription_id' => $subscriptionId,
                'cancel_data' => $cancelData
            ]);

            $response = Http::asForm()
                ->withBasicAuth($this->apiKey, '')
                ->post($url, $cancelData);

            if ($response->successful()) {
                $data = $response->json();
                Log::info('Subscription cancelled successfully', [
                    'subscription_id' => $subscriptionId,
                    'response_status' => $response->status()
                ]);

                return [
                    'success' => true,
                    'message' => 'Subscription cancelled successfully',
                    'subscription' => $data
                ];
            } else {
                Log::error('Failed to cancel subscription', [
                    'subscription_id' => $subscriptionId,
                    'status' => $response->status(),
                    'response' => $response->json()
                ]);

                return [
                    'success' => false,
                    'message' => 'Failed to cancel subscription',
                    'error' => $response->json()
                ];
            }

        } catch (\Exception $e) {
            Log::error('Exception while cancelling subscription', [
                'subscription_id' => $subscriptionId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Exception occurred while cancelling subscription',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Get current addon quantities for a subscription
     *
     * @param string $subscriptionId
     * @return array
     */
    public function getCurrentAddonQuantities(string $subscriptionId): array
    {
        // Return cached result if available
        if (isset($this->addonQuantitiesCache[$subscriptionId])) {
            return $this->addonQuantitiesCache[$subscriptionId];
        }
        
        try {
            $subscription = $this->getSubscription($subscriptionId);
            
            if (!$subscription['success']) {
                $result = [
                    'success' => false,
                    'message' => 'Failed to get subscription data',
                    'error' => $subscription['error'] ?? 'Unknown error'
                ];
                
                // Cache even failed results to prevent repeated failures

                $this->addonQuantitiesCache[$subscriptionId] = $result;

                return $result;
            }

            $subscriptionData = $subscription['subscription'];
            $addonQuantities = [];

            // Handle nested subscription structure
            if (isset($subscriptionData['subscription'])) {
                $subscriptionData = $subscriptionData['subscription'];
            }
            
            $webUsersAddonId = config('services.chargebee.web_users_addon_id');
            $appUsersAddonId = config('services.chargebee.app_users_addon_id');
            
            // Extract addon quantities - optimize by reducing log calls
            if (isset($subscriptionData['subscription_items']) && is_array($subscriptionData['subscription_items'])) {
                // Product Catalog 2.0
                foreach ($subscriptionData['subscription_items'] as $item) {                    
                    if (isset($item['item_type']) && $item['item_type'] === 'addon' && isset($item['item_price_id'])) {
                        $addonQuantities[$item['item_price_id']] = $item['quantity'] ?? 0;
                    }
                }
            } elseif (isset($subscriptionData['addons']) && is_array($subscriptionData['addons'])) {
                // Product Catalog 1.0
                foreach ($subscriptionData['addons'] as $addon) {                    
                    if (isset($addon['id'])) {
                        $addonQuantities[$addon['id']] = $addon['quantity'] ?? 0;
                    }
                }
            }

            // Only log essential information
            Log::info('Addon quantities retrieved', [
                'subscription_id' => $subscriptionId,
                'web_users_quantity' => $addonQuantities[$webUsersAddonId] ?? 0,
                'app_users_quantity' => $addonQuantities[$appUsersAddonId] ?? 0
            ]);

            $result = [
                'success' => true,
                'message' => 'Addon quantities retrieved successfully',
                'addon_quantities' => $addonQuantities,
                'subscription_data' => $subscriptionData
            ];
            
            // Cache the result
            $this->addonQuantitiesCache[$subscriptionId] = $result;
            return $result;

        } catch (\Exception $e) {
            Log::error('Exception while getting addon quantities', [
                'subscription_id' => $subscriptionId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Exception occurred while getting addon quantities',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Get raw subscription data for debugging
     *
     * @param string $subscriptionId
     * @return array
     */
    public function getRawSubscriptionData(string $subscriptionId): array
    {
        try {
            $url = "https://{$this->siteName}.chargebee.com/api/v2/subscriptions/{$subscriptionId}";
            
            Log::info('Getting raw subscription data from Chargebee', [
                'subscription_id' => $subscriptionId
            ]);

            $response = Http::withBasicAuth($this->apiKey, '')
                ->get($url);

            if ($response->successful()) {
                $data = $response->json();
                Log::info('Raw subscription data retrieved successfully', [
                    'subscription_id' => $subscriptionId,
                    'response_status' => $response->status()
                ]);

                return [
                    'success' => true,
                    'message' => 'Raw subscription data retrieved successfully',
                    'subscription_id' => $subscriptionId,
                    'raw_data' => $data,
                    'http_status' => $response->status(),
                    'headers' => $response->headers()
                ];
            } else {
                Log::error('Failed to get raw subscription data', [
                    'subscription_id' => $subscriptionId,
                    'status' => $response->status(),
                    'response' => $response->json()
                ]);

                return [
                    'success' => false,
                    'message' => 'Failed to get raw subscription data',
                    'error' => $response->json(),
                    'http_status' => $response->status()
                ];
            }

        } catch (\Exception $e) {
            Log::error('Exception while getting raw subscription data', [
                'subscription_id' => $subscriptionId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Exception occurred while getting raw subscription data',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Process subscription updates for subscriptions due in 3 days
     *
     * @return array
     */
    public function processSubscriptionUpdates(): array
    {
        try {
            $dateIn3Days = Carbon::now()->addDays(3)->format('Y-m-d');
            $subscriptionsDue = $this->getSubscriptionsDueIn3Days($dateIn3Days);

            if ($subscriptionsDue->isEmpty()) {
                return $this->createEmptyResponse($dateIn3Days);
            }
            
            $mappingResult = $this->mapSubscriptionsToUsers($subscriptionsDue);
            
            // Extract just the subscription mapping for processing
            $subscriptionUserMapping = $mappingResult['subscription_mapping'] ?? [];
            
            // Process subscriptions
            $processedResults = $this->processSubscriptions($subscriptionUserMapping);
            
            return $this->createSuccessResponse($dateIn3Days, $subscriptionsDue, $mappingResult, $processedResults);

    } catch (\Exception $e) {
        Log::error('Failed to process subscription updates', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        return [
            'success' => false,
            'message' => 'Failed to process subscription updates',
            'error' => $e->getMessage()
        ];
    }
}

/**
 * Get subscriptions due in 3 days
 *
 * @param string $dateIn3Days
 * @return \Illuminate\Database\Eloquent\Collection
 */
private function getSubscriptionsDueIn3Days(string $dateIn3Days)
{
    // Get subscriptions due in 3 days directly from Chargebee
    $chargebeeSite = config('services.chargebee.site_name');
    $apiKey = config('services.chargebee.api_key');
    
    try {
        
        // Convert date to Unix timestamp format (seconds since epoch)
        // Start of the day
        $startTimestamp = strtotime($dateIn3Days . ' 00:00:00');
        // End of the day
        $endTimestamp = strtotime($dateIn3Days . ' 23:59:59');
        
        Log::info('Fetching active subscriptions with next billing date in 3 days', [
            'target_date' => $dateIn3Days,
            'start_timestamp' => $startTimestamp,
            'end_timestamp' => $endTimestamp,
            'timezone' => date_default_timezone_get()
        ]);
        
        $url = 'https://' . config('services.chargebee.site_name') . '.chargebee.com/api/v2/subscriptions';
        
        // Optimize HTTP request with shorter timeouts and better error handling
        $response = Http::withBasicAuth(
            config('services.chargebee.api_key'), 
            ''
        )
            ->timeout(15) // Reduced timeout
            ->withOptions([
                'timeout' => 15,
                'connect_timeout' => 5,
                'http_errors' => false, // Don't throw exceptions for HTTP errors
                'verify' => true // Verify SSL certificates
            ])
            ->get($url, [
                // Use Unix timestamp format as required by Chargebee API
                'next_billing_at[after]' => $startTimestamp,
                'next_billing_at[before]' => $endTimestamp,
                'status' => 'active',
                'limit' => 100
            ]);
        
        if (!$response->successful()) {
            Log::error('Failed to fetch subscriptions from Chargebee', [
                'status' => $response->status(),
                'response' => $response->json()
            ]);
                return collect([]);
            }
            
            $chargebeeSubscriptions = $response->json()['list'] ?? [];
            
            // Optimize database queries by fetching all subscriptions at once
            $subscriptionIds = collect($chargebeeSubscriptions)
                ->pluck('subscription.id')
                ->filter()
                ->values()
                ->toArray();
                
            // Get all matching local subscriptions in a single query
            $localSubscriptions = Subscription::whereIn('gocardless_subscription_id', $subscriptionIds)
                ->get()
                ->keyBy('gocardless_subscription_id');
                
            // Map Chargebee subscriptions to our local subscription model with fewer DB queries
            $subscriptions = collect($chargebeeSubscriptions)->map(function($item) use ($localSubscriptions) {
                $subscription = $item['subscription'] ?? [];
                $subscriptionId = $subscription['id'] ?? null;
                
                if (!$subscriptionId) {
                    return null;
                }
                
                // Check if we already have this subscription in our local cache
                $localSubscription = $localSubscriptions->get($subscriptionId);
                
                // If found, use the local subscription
                if ($localSubscription) {
                    return $localSubscription;
                }
                
                // Otherwise, create a temporary subscription object with the necessary fields
                $tempSubscription = new Subscription();
                $tempSubscription->gocardless_subscription_id = $subscriptionId;
                $tempSubscription->customer_id = $subscription['customer_id'] ?? null;
                
                return $tempSubscription;
            })->filter(); // Remove any null values
            
            Log::info('Found subscriptions due in 3 days from Chargebee', [
                'target_date' => $dateIn3Days,
                'subscription_count' => $subscriptions->count()
            ]);
            
            return $subscriptions;
            
        } catch (\Exception $e) {
            Log::error('Exception while fetching subscriptions from Chargebee', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return collect([]);
        }
    }

    /**
     * Map subscriptions to their users and company information
     *
     * @param \Illuminate\Database\Eloquent\Collection $subscriptions
     * @return array
     */
    private function mapSubscriptionsToUsers($subscriptions): array
    {
        $subscriptionUserMapping = [];
        $companyUsersMapping = [];
        
        // Extract all subscription user UUIDs for a single query
        $userUuids = $subscriptions->pluck('user_uuid')->filter()->unique()->values()->toArray();
        
        // Get all users in a single query
        $users = DB::table('users')
            ->whereIn('uuid', $userUuids)
            ->select('id', 'uuid', 'name', 'email', 'phone', 'company_uuid')
            ->get()
            ->keyBy('uuid');
            
        // Get all company UUIDs from the users
        $companyUuids = $users->pluck('company_uuid')->filter()->unique()->values()->toArray();
        
        // Get all company users in a single query
        $allCompanyUsers = DB::table('users')
            ->whereIn('company_uuid', $companyUuids)
            ->select('id', 'uuid', 'name', 'email', 'phone', 'company_uuid')
            ->get();
            
        // Group company users by company UUID
        $companyUsersGrouped = $allCompanyUsers->groupBy('company_uuid');
        
        // Get all drivers in a single query
        $allDrivers = DB::table('users')
            ->join('drivers', 'users.uuid', '=', 'drivers.user_uuid')
            ->whereIn('users.company_uuid', $companyUuids)
            ->select('users.id', 'users.uuid', 'users.company_uuid', 'users.name', 'users.email', 'users.phone')
            ->get();
            
        // Group drivers by company UUID
        $driversGrouped = $allDrivers->groupBy('company_uuid');

        foreach ($subscriptions as $subscription) {
            $userUuid = $subscription->user_uuid;
            $user = $users[$userUuid] ?? null;

            if ($user) {
                $companyUuid = $user->company_uuid;
                $companyUsers = $companyUsersGrouped[$companyUuid] ?? collect([]);
                $drivers = $driversGrouped[$companyUuid] ?? collect([]);
                $regularUsers = $this->filterRegularUsers($companyUsers, $drivers);

                $subscriptionUserMapping[$subscription->gocardless_subscription_id] = $this->createSubscriptionMapping(
                    $subscription, $user, $companyUsers, $regularUsers, $drivers
                );

                if (!isset($companyUsersMapping[$companyUuid])) {
                    $companyUsersMapping[$companyUuid] = $this->createCompanyMapping($user, $companyUsers, $regularUsers, $drivers);
                }
            } else {
                $this->logUserNotFound($subscription);
            }
        }

        $this->logMappingResults($subscriptionUserMapping, $companyUsersMapping);

        return [
            'subscription_mapping' => $subscriptionUserMapping,
            'company_mapping' => $companyUsersMapping
        ];
    }

    /**
     * Get user for a subscription
     *
     * @param Subscription $subscription
     * @return object|null
     */
    private function getUserForSubscription(Subscription $subscription)
    {
        return DB::table('users')
            ->where('uuid', $subscription->user_uuid)
            ->select('id', 'uuid', 'name', 'email', 'phone', 'company_uuid')
            ->first();
    }

    /**
     * Get all users in a company
     *
     * @param string $companyUuid
     * @return \Illuminate\Support\Collection
     */
    private function getCompanyUsers(string $companyUuid)
    {
        return DB::table('users')
            ->where('company_uuid', $companyUuid)
            ->select('id', 'uuid', 'name', 'email', 'phone', 'company_uuid')
            ->get();
    }

    /**
     * Get drivers in a company
     *
     * @param string $companyUuid
     * @return \Illuminate\Support\Collection
     */
    private function getCompanyDrivers(string $companyUuid)
    {
        return DB::table('users')
            ->join('drivers', 'users.uuid', '=', 'drivers.user_uuid')
            ->where('users.company_uuid', $companyUuid)
            ->select('users.id', 'users.uuid', 'users.company_uuid', 'users.name', 'users.email', 'users.phone')
            ->get();
    }

    /**
     * Filter regular users (non-drivers)
     *
     * @param \Illuminate\Support\Collection $companyUsers
     * @param \Illuminate\Support\Collection $drivers
     * @return \Illuminate\Support\Collection
     */
    private function filterRegularUsers($companyUsers, $drivers)
    {
        $driverUuids = $drivers->pluck('uuid')->toArray();

        return $companyUsers->filter(function($companyUser) use ($driverUuids) {
            return !in_array($companyUser->uuid, $driverUuids);
        })->values();
    }

    /**
     * Create subscription mapping data
     *
     * @param Subscription $subscription
     * @param object $user
     * @param \Illuminate\Support\Collection $companyUsers
     * @param \Illuminate\Support\Collection $regularUsers
     * @param \Illuminate\Support\Collection $drivers
     * @return array
     */
    private function createSubscriptionMapping($subscription, $user, $companyUsers, $regularUsers, $drivers): array
    {
        return [
            'subscription' => $subscription,
            'user' => $user,
            'subscription_id' => $subscription->gocardless_subscription_id,
            'user_uuid' => $subscription->user_uuid,
            'user_name' => $user->name,
            'user_email' => $user->email,
            'company_uuid' => $user->company_uuid,
            'company_users' => [
                'total_users' => $companyUsers->count(),
                'regular_users' => $regularUsers->count(),
                'drivers' => $drivers->count(),
            ]
        ];
    }

    /**
     * Create company mapping data
     *
     * @param object $user
     * @param \Illuminate\Support\Collection $companyUsers
     * @param \Illuminate\Support\Collection $regularUsers
     * @param \Illuminate\Support\Collection $drivers
     * @return array
     */
    private function createCompanyMapping($user, $companyUsers, $regularUsers, $drivers): array
    {
        return [
            'company_uuid' => $user->company_uuid,
            'total_users' => $companyUsers->count(),
            'regular_users' => $regularUsers->count(),
            'drivers' => $drivers->count(),
            'subscription_owner' => [
                'name' => $user->name,
                'email' => $user->email,
                'uuid' => $user->uuid
            ]
        ];
    }

    /**
     * Format user details for response
     *
     * @param \Illuminate\Support\Collection $users
     * @return array
     */
    private function formatUserDetails($users): array
    {
        return $users->map(function($user) {
            return [
                'uuid' => $user->uuid,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone ?? null
            ];
        })->toArray();
    }

    /**
     * Process subscriptions based on the mapping data
     *
     * @param array $subscriptionUserMapping
     * @return array
     */
    private function processSubscriptions(array $subscriptionUserMapping): array
    {
        $processedSubscriptions = [];
        $errors = [];
        
        foreach ($subscriptionUserMapping as $subscriptionId => $mapping) {
            // Validate that the mapping has all required keys before processing
            if (!isset($mapping['subscription']) || !isset($mapping['user']) || !isset($mapping['company_users'])) {
                $errorMessage = 'Missing required data for subscription processing';
                if (!isset($mapping['subscription'])) {
                    $errorMessage = 'Subscription data missing';
                } elseif (!isset($mapping['user'])) {
                    $errorMessage = 'User data missing';
                } elseif (!isset($mapping['company_users'])) {
                    $errorMessage = 'Company users data missing';
                }
                
                $error = $this->createErrorEntry($subscriptionId, $mapping, $errorMessage);
                $errors[] = $error;
                $this->logProcessingError($subscriptionId, $mapping, $errorMessage);
                continue;
            }
            
            // Process subscription with all required data
            try {
                $result = $this->processIndividualSubscription($mapping['subscription'], $mapping['user'], $mapping['company_users']);
                $processedSubscriptions[] = $result;
                
                Log::info('Successfully processed subscription', [
                    'subscription_id' => $subscriptionId,
                    'company_uuid' => $mapping['company_uuid'] ?? 'unknown'
                ]);
            } catch (\Exception $e) {
                $error = $this->createErrorEntry($subscriptionId, $mapping, $e->getMessage());
                $errors[] = $error;
                $this->logProcessingError($subscriptionId, $mapping, $e->getMessage());
            }
        }

        return [
            'processed' => $processedSubscriptions,
            'errors' => $errors
        ];
    }

    /**
     *
     * @param string $subscriptionId
     * @param object $subscription
     * Process an individual subscription for updating
     *
     * @param object $subscription The subscription object
     * @param object $user The user object
     * @param array $companyUsers The company users data
     * @return array The processed subscription result
     */
    private function processIndividualSubscription($subscription, $user, array $companyUsers): array
    {
        // Extract necessary data
        $subscriptionId = $subscription->gocardless_subscription_id;
        $regularUserCount = $companyUsers['regular_users'];
        $driverCount = $companyUsers['drivers'];
        $totalUserCount = $companyUsers['total_users'];
        
        // Log subscription processing with minimal data
        Log::info('Processing subscription', [
            'subscription_id' => $subscriptionId,
            'regular_users' => $regularUserCount,
            'drivers' => $driverCount
        ]);
        
        // Get current counts from Chargebee
        $addonQuantities = $this->getCurrentAddonQuantities($subscriptionId);
        $webUsersAddonId = config('services.chargebee.web_users_addon_id');
        $appUsersAddonId = config('services.chargebee.app_users_addon_id');
        
        // Determine if update is needed

        $currentWebUsers = $addonQuantities['addon_quantities'][$webUsersAddonId] ?? 0;
        $currentAppUsers = $addonQuantities['addon_quantities'][$appUsersAddonId] ?? 0;

        
        $currentChargebeeCounts = [
            'web_users' => $currentWebUsers,
            'app_users' => $currentAppUsers
        ];
        
        // Determine if we need to update
        $shouldUpdateWebUsers = $regularUserCount > $currentWebUsers;
        $shouldUpdateAppUsers = $driverCount > $currentAppUsers;
        $shouldUpdate = $shouldUpdateWebUsers || $shouldUpdateAppUsers;
        
        $updateDecision = [
            'should_update' => $shouldUpdate,
            'reason' => $shouldUpdate ? 'Calculated counts are greater than current counts' : 'Current counts are greater than or equal to calculated counts',
            'should_update_web_users' => $shouldUpdateWebUsers,
            'should_update_app_users' => $shouldUpdateAppUsers,
            'current_web_users' => $currentWebUsers,
            'current_app_users' => $currentAppUsers
        ];
        
        // If no update is needed, return early
        if (!$shouldUpdate) {
            return $this->createNoUpdateResponse($subscription, $user, $companyUsers, $regularUserCount, $driverCount, $totalUserCount, $currentChargebeeCounts, $updateDecision);
        }
        
        // Make API call to Chargebee
        try {

            $chargebeeSite = config('services.chargebee.site_name');

            $chargebeeApiKey = config('services.chargebee.api_key');
            $chargebeeUrl = "https://{$chargebeeSite}.chargebee.com/api/v2/subscriptions/{$subscriptionId}";
            
            // First, get the subscription to find the subscription item IDs for Product Catalog 2.0
            // Use cached subscription data if available to reduce API calls
            if (!isset($this->subscriptionCache[$subscriptionId])) {
                $subscriptionResponse = $this->getSubscription($subscriptionId);
                
                if (!$subscriptionResponse['success']) {
                    Log::error('Failed to fetch subscription details', [
                        'subscription_id' => $subscriptionId,
                        'error' => $subscriptionResponse['error'] ?? 'Unknown error'
                    ]);
                    throw new \Exception('Failed to fetch subscription details: ' . ($subscriptionResponse['error'] ?? 'Unknown error'));
                }
                
                // Extract subscription data
                $subscriptionData = $subscriptionResponse['subscription'];
                if (isset($subscriptionData['subscription'])) {
                    $subscriptionData = $subscriptionData['subscription'];
                }
                
                // Cache the subscription data

                $this->subscriptionCache[$subscriptionId] = $subscriptionData;
            } else {
                $subscriptionData = $this->subscriptionCache[$subscriptionId];

            }
            
            $subscriptionItems = $subscriptionData['subscription_items'] ?? [];
            
            // Prepare the payload for Product Catalog 2.0
            $pc2Payload = [];
            $index = 0;
            
            // Based on Chargebee support example, we need to use item_price_id instead of id
            // The correct format is: subscription_items[item_price_id][0] and subscription_items[quantity][0]
            
            if ($shouldUpdateWebUsers) {
                $pc2Payload["subscription_items[item_price_id][$index]"] = $webUsersAddonId;
                $pc2Payload["subscription_items[quantity][$index]"] = $regularUserCount;
                $index++;
            }
            
            if ($shouldUpdateAppUsers) {
                $pc2Payload["subscription_items[item_price_id][$index]"] = $appUsersAddonId;
                $pc2Payload["subscription_items[quantity][$index]"] = $driverCount;
                $index++;
            }
            
            // Always use the Product Catalog 2.0 endpoint as per Chargebee support's example
            if (empty($pc2Payload)) {
                // Return early if no updates are needed
                return $this->createNoUpdateResponse($subscription, $user, $companyUsers, $regularUserCount, $driverCount, $totalUserCount, $currentChargebeeCounts, $updateDecision);
            }
            
            $updateUrl = $chargebeeUrl . '/update_for_items';
            
            // Optimize HTTP request with shorter timeouts and better error handling
            $response = Http::asForm()
                ->withBasicAuth($chargebeeApiKey, '')
                ->withOptions([
                    'timeout' => 15,
                    'connect_timeout' => 5,
                    'http_errors' => false,
                    'verify' => true
                ])
                ->post($updateUrl, $pc2Payload);
            
            // Log the response with minimal data
            if ($response->successful()) {
                Log::info('Chargebee update successful', [
                    'subscription_id' => $subscriptionId,
                    'status' => $response->status()
                ]);
            } else {
                Log::error('Chargebee update failed', [
                    'subscription_id' => $subscriptionId,
                    'status' => $response->status(),
                    'response' => $response->json()
                ]);
            }
            
            // Return formatted response
            return $this->createUpdateResponse($subscription, $user, $companyUsers, $regularUserCount, $driverCount, $totalUserCount, $currentChargebeeCounts, $updateDecision, $response);
        } catch (\Exception $e) {
            Log::error('Exception during Chargebee API request', [
                'subscription_id' => $subscriptionId,
                'error' => $e->getMessage()
            ]);
            
            throw $e;
        }
    }
    
    // Removed problematic subscription handling method
    
    /**
     * Create response for no update needed
     *
     * @param Subscription $subscription
     * @param object $user
     * @param array $companyUsers
     * @param int $regularUserCount
     * @param int $driverCount
     * @param int $totalUserCount
     * @param array $currentChargebeeCounts
     * @param array $updateDecision
     * @return array
     */
    private function createNoUpdateResponse($subscription, $user, $companyUsers, $regularUserCount, $driverCount, $totalUserCount, $currentChargebeeCounts, $updateDecision): array
    {
        Log::info('No update needed - current counts are greater than or equal to calculated counts', [
            'subscription_id' => $subscription->gocardless_subscription_id,
            'reason' => 'Current counts >= calculated counts'
        ]);

        return [
            'subscription_id' => $subscription->gocardless_subscription_id,
            'subscription_owner' => [
                'name' => $user->name,
                'email' => $user->email,
                'uuid' => $user->uuid
            ],
            'company_uuid' => $subscription->company_uuid,
            'calculated_counts' => [
                'regular_users' => $regularUserCount,
                'drivers' => $driverCount,
                'total_users' => $totalUserCount
            ],
            'current_chargebee_counts' => [
                'web_users' => $updateDecision['current_web_users'],
                'app_users' => $updateDecision['current_app_users']
            ],
            'company_users' => $companyUsers,
            'update_decision' => [
                'should_update' => false,
                'reason' => 'Current counts >= calculated counts',
                'should_update_web_users' => $updateDecision['should_update_web_users'],
                'should_update_app_users' => $updateDecision['should_update_app_users']
            ],
            'chargebee_response' => null,
            'success' => true
        ];
    }

    /**
     * Create response for successful update
     *
     * @param Subscription $subscription
     * @param object $user
     * @param array $companyUsers
     * @param int $regularUserCount
     * @param int $driverCount
     * @param int $totalUserCount
     * @param array $currentChargebeeCounts
     * @param array $updateDecision
     * @param \Illuminate\Http\Client\Response $response
     * @return array
     */
    private function createUpdateResponse($subscription, $user, $companyUsers, $regularUserCount, $driverCount, $totalUserCount, $currentChargebeeCounts, $updateDecision, $response): array
    {
        return [
            'subscription_id' => $subscription->gocardless_subscription_id,
            'subscription_owner' => [
                'name' => $user->name,
                'email' => $user->email,
                'uuid' => $user->uuid
            ],
            'company_uuid' => $subscription->company_uuid,
            'calculated_counts' => [
                'regular_users' => $regularUserCount,
                'drivers' => $driverCount,
                'total_users' => $totalUserCount
            ],
            'current_chargebee_counts' => [
                'web_users' => $updateDecision['current_web_users'],
                'app_users' => $updateDecision['current_app_users']
            ],
            'company_users' => $companyUsers,
            'update_decision' => [
                'should_update' => true,
                'should_update_web_users' => $updateDecision['should_update_web_users'],
                'should_update_app_users' => $updateDecision['should_update_app_users'],
                'reason' => 'Calculated counts > current counts'
            ],
            'chargebee_response' => [
                'status' => $response->status(),
                'body' => $response->json()
            ],
            'success' => $response->status() >= 200 && $response->status() < 300
        ];
    }

    /**
     * Create empty response when no subscriptions found
     *
     * @param string $targetDate
     * @return array
     */
    private function createEmptyResponse(string $targetDate): array
    {
        return [
            'success' => true,
            'message' => 'No subscriptions due in 3 days',
            'data' => [
                'target_date' => $targetDate,
                'processed_count' => 0,
                'subscriptions' => []
            ]
        ];
    }

    /**
     * Create success response
     *
     * @param string $dateIn3Days
     * @param \Illuminate\Database\Eloquent\Collection $subscriptionsDue
     * @param array $mappingData
     * @param array $processedResults
     * @return array
     */
    private function createSuccessResponse(string $dateIn3Days, $subscriptionsDue, array $mappingData, array $processedResults): array
    {
        return [
            'success' => true,
            'message' => 'Subscription updates processed for subscriptions due in 3 days',
            'data' => [
                'target_date' => $dateIn3Days,
                'total_subscriptions' => $subscriptionsDue->count(),
                'mapped_subscriptions' => count($mappingData['subscription_mapping']),
                'unique_companies' => count($mappingData['company_mapping']),
                'processed_count' => count($processedResults['processed']),
                'error_count' => count($processedResults['errors']),
                'company_users_mapping' => $mappingData['company_mapping'],
                'subscription_user_mapping' => $this->formatSubscriptionMapping($mappingData['subscription_mapping']),
                'processed_subscriptions' => $processedResults['processed'],
                'errors' => $processedResults['errors']
            ]
        ];
    }

    /**
     * Format subscription mapping for response
     *
     * @param array $subscriptionMapping
     * @return array
     */
    private function formatSubscriptionMapping(array $subscriptionMapping): array
    {
        return array_map(function($item) {
            return [
                'subscription_id' => $item['subscription_id'],
                'user_name' => $item['user_name'],
                'user_email' => $item['user_email'],
                'company_uuid' => $item['company_uuid'],
                'company_users_count' => $item['company_users']['total_users'],
                'regular_users_count' => $item['company_users']['regular_users'],
                'drivers_count' => $item['company_users']['drivers']
            ];
        }, $subscriptionMapping);
    }

    /**
     * Create error entry
     *
     * @param string $subscriptionId
     * @param array $mapping
     * @param string $errorMessage
     * @return array
     */
    private function createErrorEntry(string $subscriptionId, array $mapping, string $errorMessage): array
    {
        // Safely access user information from the mapping
        $userName = 'unknown';
        $userEmail = 'unknown';
        
        // Try to get user name and email from different possible locations in the mapping
        if (isset($mapping['user_name'])) {
            $userName = $mapping['user_name'];
        } elseif (isset($mapping['user']) && isset($mapping['user']->name)) {
            $userName = $mapping['user']->name;
        }
        
        if (isset($mapping['user_email'])) {
            $userEmail = $mapping['user_email'];
        } elseif (isset($mapping['user']) && isset($mapping['user']->email)) {
            $userEmail = $mapping['user']->email;
        }
        
        return [
            'subscription_id' => $subscriptionId,
            'user_name' => $userName,
            'user_email' => $userEmail,
            'company_uuid' => $mapping['company_uuid'] ?? 'unknown',
            'error' => $errorMessage
        ];
    }

    /**
     * Log user not found
     *
     * @param Subscription $subscription
     */
    private function logUserNotFound(Subscription $subscription): void
    {
        Log::warning('User not found for subscription', [
            'subscription_id' => $subscription->gocardless_subscription_id,
            'user_uuid' => $subscription->user_uuid
        ]);
    }

    /**
     * Log mapping results
     *
     * @param array $subscriptionUserMapping
     * @param array $companyUsersMapping
     */
    private function logMappingResults(array $subscriptionUserMapping, array $companyUsersMapping): void
    {
        Log::info('Mapped subscriptions to users and company users', [
            'mapping_count' => count($subscriptionUserMapping),
            'company_count' => count($companyUsersMapping),
            'mapping_details' => array_map(function($item) {
                return [
                    'subscription_id' => $item['subscription_id'],
                    'user_name' => $item['user_name'],
                    'user_email' => $item['user_email'],
                    'company_uuid' => $item['company_uuid'],
                    'company_users_count' => $item['company_users']['total_users'],
                    'regular_users_count' => $item['company_users']['regular_users'],
                    'drivers_count' => $item['company_users']['drivers']
                ];
            }, $subscriptionUserMapping)
        ]);
    }

    /**
     * Log subscription processing
     *
     * @param Subscription $subscription
     * @param object $user
     * @param int $regularUserCount
     * @param int $driverCount
     * @param int $totalUserCount
     */
    private function logSubscriptionProcessing($subscription, $user, $regularUserCount, $driverCount, $totalUserCount): void
    {
        Log::info('Calculated user and driver counts for subscription update', [
            'subscription_id' => $subscription->gocardless_subscription_id,
            'subscription_owner' => [
                'name' => $user->name,
                'email' => $user->email,
                'uuid' => $user->uuid
            ],
            'company_uuid' => $subscription->company_uuid,
            'regular_user_count' => $regularUserCount,
            'driver_count' => $driverCount,
            'total_users' => $totalUserCount
        ]);
    }

    /**
     * Log Chargebee response
     *
     * @param Subscription $subscription
     * @param object $user
     * @param \Illuminate\Http\Client\Response $response
     * @param int $regularUserCount
     * @param int $driverCount
     * @param int $totalUserCount
     * @param array $currentChargebeeCounts
     * @param array $updateDecision
     */
    private function logChargebeeResponse($subscription, $user, $response, $regularUserCount, $driverCount, $totalUserCount, $currentChargebeeCounts, $updateDecision): void
    {
        Log::info('Chargebee API response for subscription update', [
            'subscription_id' => $subscription->gocardless_subscription_id,
            'subscription_owner' => [
                'name' => $user->name,
                'email' => $user->email
            ],
            'company_uuid' => $subscription->company_uuid,
            'http_status' => $response->status(),
            'response_body' => $response->json(),
            'calculated_counts' => [
                'regular_users' => $regularUserCount,
                'drivers' => $driverCount,
                'total_users' => $totalUserCount
            ],
            'current_chargebee_counts' => [
                'web_users' => $updateDecision['current_web_users'],
                'app_users' => $updateDecision['current_app_users']
            ],
            'update_decision' => [
                'should_update_web_users' => $updateDecision['should_update_web_users'],
                'should_update_app_users' => $updateDecision['should_update_app_users']
            ]
        ]);
    }

    /**
     * Log processing error
     *
     * @param string $subscriptionId
     * @param array $mapping
     * @param string $errorMessage
     */
    private function logProcessingError(string $subscriptionId, array $mapping, string $errorMessage): void
    {
        // Safely access user information from the mapping
        $userName = 'unknown';
        $userEmail = 'unknown';
        $companyUuid = 'unknown';
        
        // Try to get user name and email from different possible locations in the mapping
        if (isset($mapping['user_name'])) {
            $userName = $mapping['user_name'];
        } elseif (isset($mapping['user']) && isset($mapping['user']->name)) {
            $userName = $mapping['user']->name;
        }
        
        if (isset($mapping['user_email'])) {
            $userEmail = $mapping['user_email'];
        } elseif (isset($mapping['user']) && isset($mapping['user']->email)) {
            $userEmail = $mapping['user']->email;
        }
        
        if (isset($mapping['company_uuid'])) {
            $companyUuid = $mapping['company_uuid'];
        } elseif (isset($mapping['user']) && isset($mapping['user']->company_uuid)) {
            $companyUuid = $mapping['user']->company_uuid;
        }
        
        Log::error('Failed to process subscription update', [
            'subscription_id' => $subscriptionId,
            'user_name' => $userName,
            'user_email' => $userEmail,
            'company_uuid' => $companyUuid,
            'error' => $errorMessage
        ]);
    }
} 