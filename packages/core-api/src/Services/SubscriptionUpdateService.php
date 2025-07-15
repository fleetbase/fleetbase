<?php

namespace Fleetbase\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Fleetbase\Models\Subscription;

class SubscriptionUpdateService
{
    protected $site;
    protected $apiKey;

    public function __construct()
    {
        $this->site = config('services.chargebee.site');
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
            $url = "https://{$this->site}.chargebee.com/api/v2/subscriptions/{$subscriptionId}";
            
            Log::info('Updating subscription in Chargebee', [
                'subscription_id' => $subscriptionId,
                'update_data' => $updateData
            ]);

            $response = Http::asForm()
                ->withBasicAuth($this->apiKey, '')
                ->post($url, $updateData);

            if ($response->successful()) {
                $data = $response->json();
                Log::info('Subscription updated successfully', [
                    'subscription_id' => $subscriptionId,
                    'response_status' => $response->status()
                ]);

                return [
                    'success' => true,
                    'message' => 'Subscription updated successfully',
                    'subscription' => $data
                ];
            } else {
                Log::error('Failed to update subscription', [
                    'subscription_id' => $subscriptionId,
                    'status' => $response->status(),
                    'response' => $response->json()
                ]);

                return [
                    'success' => false,
                    'message' => 'Failed to update subscription',
                    'error' => $response->json()
                ];
            }

        } catch (\Exception $e) {
            Log::error('Exception while updating subscription', [
                'subscription_id' => $subscriptionId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Exception occurred while updating subscription',
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
        try {
            $url = "https://{$this->site}.chargebee.com/api/v2/subscriptions/{$subscriptionId}";
            
            Log::info('Getting subscription from Chargebee', [
                'subscription_id' => $subscriptionId
            ]);

            $response = Http::withBasicAuth($this->apiKey, '')
                ->get($url);

            if ($response->successful()) {
                $data = $response->json();
                Log::info('Subscription retrieved successfully', [
                    'subscription_id' => $subscriptionId,
                    'response_status' => $response->status()
                ]);

                return [
                    'success' => true,
                    'message' => 'Subscription retrieved successfully',
                    'subscription' => $data
                ];
            } else {
                Log::error('Failed to get subscription', [
                    'subscription_id' => $subscriptionId,
                    'status' => $response->status(),
                    'response' => $response->json()
                ]);

                return [
                    'success' => false,
                    'message' => 'Failed to get subscription',
                    'error' => $response->json()
                ];
            }

        } catch (\Exception $e) {
            Log::error('Exception while getting subscription', [
                'subscription_id' => $subscriptionId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Exception occurred while getting subscription',
                'error' => $e->getMessage()
            ];
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
            $url = "https://{$this->site}.chargebee.com/api/v2/subscriptions/{$subscriptionId}/cancel";
            
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
        try {
            $subscription = $this->getSubscription($subscriptionId);
            
            if (!$subscription['success']) {
                return [
                    'success' => false,
                    'message' => 'Failed to get subscription data',
                    'error' => $subscription['error'] ?? 'Unknown error'
                ];
            }

            $subscriptionData = $subscription['subscription'];
            $addonQuantities = [];

            // Handle nested subscription structure
            if (isset($subscriptionData['subscription'])) {
                $subscriptionData = $subscriptionData['subscription'];
            }

            // Extract addon quantities
            if (isset($subscriptionData['subscription_items']) && is_array($subscriptionData['subscription_items'])) {
                foreach ($subscriptionData['subscription_items'] as $item) {
                    if ($item['item_type'] === 'addon') {
                        $addonQuantities[$item['item_price_id']] = $item['quantity'] ?? 0;
                    }
                }
            } elseif (isset($subscriptionData['addons']) && is_array($subscriptionData['addons'])) {
                foreach ($subscriptionData['addons'] as $addon) {
                    $addonQuantities[$addon['id']] = $addon['quantity'] ?? 0;
                }
            }

            Log::info('Addon quantities retrieved successfully', [
                'subscription_id' => $subscriptionId,
                'addon_quantities' => $addonQuantities
            ]);

            return [
                'success' => true,
                'message' => 'Addon quantities retrieved successfully',
                'addon_quantities' => $addonQuantities,
                'subscription_data' => $subscriptionData
            ];

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
            $url = "https://{$this->site}.chargebee.com/api/v2/subscriptions/{$subscriptionId}";
            
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
     * Process subscription updates for subscriptions due tomorrow
     *
     * @return array
     */
    public function processSubscriptionUpdates(): array
    {
        try {
            $tomorrow = Carbon::tomorrow()->toDateString();
            $subscriptionsDueTomorrow = $this->getSubscriptionsDueTomorrow($tomorrow);

            if ($subscriptionsDueTomorrow->isEmpty()) {
                return $this->createEmptyResponse($tomorrow);
            }

            $subscriptionUserMapping = $this->mapSubscriptionsToUsers($subscriptionsDueTomorrow);
            $processedResults = $this->processSubscriptions($subscriptionUserMapping);

            return $this->createSuccessResponse($tomorrow, $subscriptionsDueTomorrow, $subscriptionUserMapping, $processedResults);

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
     * Get subscriptions due tomorrow
     *
     * @param string $tomorrow
     * @return \Illuminate\Database\Eloquent\Collection
     */
    private function getSubscriptionsDueTomorrow(string $tomorrow)
    {
        $subscriptions = Subscription::whereDate('next_payment_date', $tomorrow)->get();

        Log::info('Found subscriptions due tomorrow', [
            'tomorrow_date' => $tomorrow,
            'subscription_count' => $subscriptions->count(),
            'subscription_ids' => $subscriptions->pluck('gocardless_subscription_id')->toArray()
        ]);

        return $subscriptions;
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

        foreach ($subscriptions as $subscription) {
            $user = $this->getUserForSubscription($subscription);

            if ($user) {
                $companyUsers = $this->getCompanyUsers($user->company_uuid);
                $drivers = $this->getCompanyDrivers($user->company_uuid);
                $regularUsers = $this->filterRegularUsers($companyUsers, $drivers);

                $subscriptionUserMapping[$subscription->gocardless_subscription_id] = $this->createSubscriptionMapping(
                    $subscription, $user, $companyUsers, $regularUsers, $drivers
                );

                $companyUsersMapping[$user->company_uuid] = $this->createCompanyMapping($user, $companyUsers, $regularUsers, $drivers);
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
                'user_details' => $this->formatUserDetails($companyUsers),
                'regular_user_details' => $this->formatUserDetails($regularUsers),
                'driver_details' => $this->formatUserDetails($drivers)
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
     * Process individual subscriptions
     *
     * @param array $mappingData
     * @return array
     */
    private function processSubscriptions(array $mappingData): array
    {
        $processedSubscriptions = [];
        $errors = [];

        foreach ($mappingData['subscription_mapping'] as $subscriptionId => $mapping) {
            try {
                $result = $this->processIndividualSubscription($mapping['subscription'], $mapping['user'], $mapping['company_users']);
                $processedSubscriptions[] = $result;
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
     * Process individual subscription update
     *
     * @param Subscription $subscription
     * @param object $user
     * @param array $companyUsers
     * @return array
     */
    private function processIndividualSubscription($subscription, $user, $companyUsers): array
    {
        $regularUserCount = $companyUsers['regular_users'];
        $driverCount = $companyUsers['drivers'];
        $totalUserCount = $companyUsers['total_users'];

        $this->logSubscriptionProcessing($subscription, $user, $regularUserCount, $driverCount, $totalUserCount);

        $currentChargebeeCounts = $this->getCurrentChargebeeCounts($subscription->gocardless_subscription_id);
        $updateDecision = $this->determineUpdateNeeded($regularUserCount, $driverCount, $currentChargebeeCounts);

        if (!$updateDecision['should_update']) {
            return $this->createNoUpdateResponse($subscription, $user, $companyUsers, $regularUserCount, $driverCount, $totalUserCount, $currentChargebeeCounts, $updateDecision);
        }

        return $this->performChargebeeUpdate($subscription, $user, $companyUsers, $regularUserCount, $driverCount, $totalUserCount, $currentChargebeeCounts, $updateDecision);
    }

    /**
     * Get current Chargebee counts
     *
     * @param string $subscriptionId
     * @return array
     */
    private function getCurrentChargebeeCounts(string $subscriptionId): array
    {
        try {
            $chargebeeSubscription = $this->getSubscription($subscriptionId);
            
            if (!$chargebeeSubscription['success']) {
                Log::warning('Failed to get current Chargebee subscription data', [
                    'subscription_id' => $subscriptionId,
                    'error' => $chargebeeSubscription['error'] ?? 'Unknown error'
                ]);
                
                return ['addons' => [], 'error' => 'Failed to get current counts'];
            }

            $subscriptionData = $chargebeeSubscription['subscription'];
            
            if (isset($subscriptionData['subscription'])) {
                $subscriptionData = $subscriptionData['subscription'];
            }

            return $this->extractAddonQuantities($subscriptionData, $subscriptionId);

        } catch (\Exception $e) {
            Log::error('Failed to get current Chargebee counts', [
                'subscription_id' => $subscriptionId,
                'error' => $e->getMessage()
            ]);

            return ['addons' => [], 'error' => $e->getMessage()];
        }
    }

    /**
     * Extract addon quantities from subscription data
     *
     * @param array $subscriptionData
     * @param string $subscriptionId
     * @return array
     */
    private function extractAddonQuantities(array $subscriptionData, string $subscriptionId): array
    {
        $addonQuantities = [];

        if (isset($subscriptionData['subscription_items']) && is_array($subscriptionData['subscription_items'])) {
            foreach ($subscriptionData['subscription_items'] as $item) {
                if ($item['item_type'] === 'addon') {
                    $addonQuantities[$item['item_price_id']] = $item['quantity'] ?? 0;
                }
            }
        } elseif (isset($subscriptionData['addons']) && is_array($subscriptionData['addons'])) {
            foreach ($subscriptionData['addons'] as $addon) {
                $addonQuantities[$addon['id']] = $addon['quantity'] ?? 0;
            }
        }

        Log::info('Extracted current Chargebee addon quantities', [
            'subscription_id' => $subscriptionId,
            'addon_quantities' => $addonQuantities
        ]);

        return ['addons' => $addonQuantities];
    }

    /**
     * Determine if update is needed
     *
     * @param int $regularUserCount
     * @param int $driverCount
     * @param array $currentChargebeeCounts
     * @return array
     */
    private function determineUpdateNeeded(int $regularUserCount, int $driverCount, array $currentChargebeeCounts): array
    {
        $addonQuantities = $currentChargebeeCounts['addons'] ?? [];
        
        $webUsersAddonKey = config('services.chargebee.web_users_addon_id');
        $appUsersAddonKey = config('services.chargebee.app_users_addon_id');
        
        $currentWebUsers = $addonQuantities[$webUsersAddonKey] ?? 0;
        $currentAppUsers = $addonQuantities[$appUsersAddonKey] ?? 0;

        $shouldUpdateWebUsers = $regularUserCount > $currentWebUsers;
        $shouldUpdateAppUsers = $driverCount > $currentAppUsers;
        $shouldUpdate = $shouldUpdateWebUsers || $shouldUpdateAppUsers;

        Log::info('Count comparison and update decision', [
            'calculated_regular_users' => $regularUserCount,
            'current_web_users' => $currentWebUsers,
            'calculated_drivers' => $driverCount,
            'current_app_users' => $currentAppUsers,
            'should_update_web_users' => $shouldUpdateWebUsers,
            'should_update_app_users' => $shouldUpdateAppUsers,
            'should_update' => $shouldUpdate
        ]);

        return [
            'should_update' => $shouldUpdate,
            'should_update_web_users' => $shouldUpdateWebUsers,
            'should_update_app_users' => $shouldUpdateAppUsers,
            'current_web_users' => $currentWebUsers,
            'current_app_users' => $currentAppUsers
        ];
    }

    /**
     * Perform Chargebee update
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
    private function performChargebeeUpdate($subscription, $user, $companyUsers, $regularUserCount, $driverCount, $totalUserCount, $currentChargebeeCounts, $updateDecision): array
    {
        $chargebeeSite = config('services.chargebee.site');
        $chargebeeUrl = "https://{$chargebeeSite}.chargebee.com/api/v2/subscriptions/{$subscription->gocardless_subscription_id}/update_for_items";
        $apiKey = config('services.chargebee.api_key');

        $webUsersAddonKey = config('services.chargebee.web_users_addon_id');
        $appUsersAddonKey = config('services.chargebee.app_users_addon_id');

        $payload = [
            'subscription_items[item_price_id][0]' => $webUsersAddonKey,
            'subscription_items[quantity][0]' => $regularUserCount,
            'subscription_items[item_price_id][1]' => $appUsersAddonKey,
            'subscription_items[quantity][1]' => $driverCount,
            'invoice_immediately' => 'true'
        ];

        Log::info('Chargebee update payload', [
            'subscription_id' => $subscription->gocardless_subscription_id,
            'payload' => $payload
        ]);

        $response = Http::asForm()
            ->withBasicAuth($apiKey, '')
            ->post($chargebeeUrl, $payload);

        $this->logChargebeeResponse($subscription, $user, $response, $regularUserCount, $driverCount, $totalUserCount, $currentChargebeeCounts, $updateDecision);

        return $this->createUpdateResponse($subscription, $user, $companyUsers, $regularUserCount, $driverCount, $totalUserCount, $currentChargebeeCounts, $updateDecision, $response);
    }

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
     * @param string $tomorrow
     * @return array
     */
    private function createEmptyResponse(string $tomorrow): array
    {
        return [
            'success' => true,
            'message' => 'No subscriptions due tomorrow',
            'data' => [
                'tomorrow_date' => $tomorrow,
                'processed_count' => 0,
                'subscriptions' => []
            ]
        ];
    }

    /**
     * Create success response
     *
     * @param string $tomorrow
     * @param \Illuminate\Database\Eloquent\Collection $subscriptionsDueTomorrow
     * @param array $mappingData
     * @param array $processedResults
     * @return array
     */
    private function createSuccessResponse(string $tomorrow, $subscriptionsDueTomorrow, array $mappingData, array $processedResults): array
    {
        return [
            'success' => true,
            'message' => 'Subscription updates processed',
            'data' => [
                'tomorrow_date' => $tomorrow,
                'total_subscriptions' => $subscriptionsDueTomorrow->count(),
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
        return [
            'subscription_id' => $subscriptionId,
            'user_name' => $mapping['user_name'],
            'user_email' => $mapping['user_email'],
            'company_uuid' => $mapping['company_uuid'],
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
        Log::error('Failed to process subscription update', [
            'subscription_id' => $subscriptionId,
            'user_name' => $mapping['user_name'],
            'user_email' => $mapping['user_email'],
            'company_uuid' => $mapping['company_uuid'],
            'error' => $errorMessage
        ]);
    }
} 