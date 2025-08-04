<?php

namespace Fleetbase\Http\Controllers\Internal\v1;
use Fleetbase\Http\Controllers\Controller;
use Fleetbase\Services\SubscriptionUpdateService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class SubscriptionController extends Controller
{
    protected $subscriptionUpdateService;

    public function __construct(SubscriptionUpdateService $subscriptionUpdateService)
    {
        $this->subscriptionUpdateService = $subscriptionUpdateService;
    }

    /**
     * Update a subscription in Chargebee
     *
     * @param Request $request
     * @param string $subscriptionId
     * @return JsonResponse
     */
    public function updateSubscription(Request $request, string $subscriptionId): JsonResponse
    {
        try {
            // Validate the request data
            $validator = Validator::make($request->all(), [
                'plan_id' => 'sometimes|string',
                'plan_quantity' => 'sometimes|integer|min:1',
                'plan_unit_price' => 'sometimes|numeric|min:0',
                'billing_cycles' => 'sometimes|integer|min:1',
                'end_of_term' => 'sometimes|boolean',
                'prorate' => 'sometimes|boolean',
                'immediate_change' => 'sometimes|boolean',
                'coupon' => 'sometimes|string',
                'custom_fields' => 'sometimes|array',
                'custom_fields.*' => 'string',
                // Support both old addons format and new subscription_items format
                'addons' => 'sometimes|array',
                'addons.*.id' => 'required_with:addons|string',
                'addons.*.quantity' => 'sometimes|integer|min:1',
                'subscription_items' => 'sometimes|array',
                'subscription_items.*.item_price_id' => 'required_with:subscription_items|string',
                'subscription_items.*.quantity' => 'sometimes|integer|min:1',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            Log::info('Subscription update request received', [
                'subscription_id' => $subscriptionId,
                'request_data' => $request->all()
            ]);

            // Prepare update data
            $updateData = $request->only([
                'plan_id',
                'plan_quantity',
                'plan_unit_price',
                'billing_cycles',
                'end_of_term',
                'prorate',
                'immediate_change',
                'coupon',
                'custom_fields',
                'addons',
                'subscription_items'
            ]);

            // Remove null values
            $updateData = array_filter($updateData, function ($value) {
                return $value !== null;
            });

            // Update the subscription
            $result = $this->subscriptionUpdateService->updateSubscription($subscriptionId, $updateData);

            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'message' => $result['message'],
                    'data' => [
                        'subscription' => $result['subscription'],
                        'updated_at' => now()->toISOString()
                    ]
                ], 200);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => $result['message'],
                    'error' => $result['error'] ?? 'Unknown error occurred'
                ], 400);
            }

        } catch (\Exception $e) {
            Log::error('Subscription update failed', [
                'subscription_id' => $subscriptionId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update subscription',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get subscription details from Chargebee
     *
     * @param string $subscriptionId
     * @return JsonResponse
     */
    public function getSubscription(string $subscriptionId): JsonResponse
    {
        try {
            Log::info('Getting subscription details', [
                'subscription_id' => $subscriptionId
            ]);

            $result = $this->subscriptionUpdateService->getSubscription($subscriptionId);

            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'message' => $result['message'],
                    'data' => [
                        'subscription' => $result['subscription']
                    ]
                ], 200);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => $result['message'],
                    'error' => $result['error'] ?? 'Unknown error occurred'
                ], 400);
            }

        } catch (\Exception $e) {
            Log::error('Failed to get subscription', [
                'subscription_id' => $subscriptionId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get subscription',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancel a subscription in Chargebee
     *
     * @param Request $request
     * @param string $subscriptionId
     * @return JsonResponse
     */
    public function cancelSubscription(Request $request, string $subscriptionId): JsonResponse
    {
        try {
            // Validate the request data
            $validator = Validator::make($request->all(), [
                'end_of_term' => 'sometimes|boolean',
                'prorate' => 'sometimes|boolean',
                'credit_option' => 'sometimes|string|in:full,partial,none',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            Log::info('Subscription cancellation request received', [
                'subscription_id' => $subscriptionId,
                'request_data' => $request->all()
            ]);

            // Prepare cancellation data
            $cancelData = $request->only([
                'end_of_term',
                'prorate',
                'credit_option'
            ]);

            // Remove null values
            $cancelData = array_filter($cancelData, function ($value) {
                return $value !== null;
            });

            // Cancel the subscription
            $result = $this->subscriptionUpdateService->cancelSubscription($subscriptionId, $cancelData);

            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'message' => $result['message'],
                    'data' => [
                        'subscription' => $result['subscription'],
                        'cancelled_at' => now()->toISOString()
                    ]
                ], 200);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => $result['message'],
                    'error' => $result['error'] ?? 'Unknown error occurred'
                ], 400);
            }

        } catch (\Exception $e) {
            Log::error('Subscription cancellation failed', [
                'subscription_id' => $subscriptionId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel subscription',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update subscription amount in Chargebee
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function updateSubscriptionQuantity(Request $request): JsonResponse
    {
        try {
            // Delegate to the service class
            $result = $this->subscriptionUpdateService->processSubscriptionUpdates();

            // Return appropriate HTTP status based on result
            $statusCode = $result['success'] ? 200 : 500;
            
            return response()->json($result, $statusCode);

        } catch (\Exception $e) {
            Log::error('Failed to update subscription amounts', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update subscription amounts',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get current addon quantities for a subscription
     *
     * @param string $subscriptionId
     * @return JsonResponse
     */
    public function getCurrentAddonQuantities(string $subscriptionId): JsonResponse
    {
        try {
            Log::info('Getting current addon quantities', [
                'subscription_id' => $subscriptionId
            ]);

            $result = $this->subscriptionUpdateService->getCurrentAddonQuantities($subscriptionId);

            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'message' => 'Addon quantities retrieved successfully',
                    'data' => [
                        'addon_quantities' => $result['addon_quantities'],
                        'subscription_data' => $result['subscription_data'] ?? null
                    ]
                ], 200);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => $result['message'],
                    'error' => $result['error'] ?? 'Unknown error occurred'
                ], 400);
            }

        } catch (\Exception $e) {
            Log::error('Failed to get current addon quantities', [
                'subscription_id' => $subscriptionId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get current addon quantities',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get raw subscription data for debugging
     *
     * @param string $subscriptionId
     * @return JsonResponse
     */
    public function getRawSubscriptionData(string $subscriptionId): JsonResponse
    {
        try {
            Log::info('Getting raw subscription data', [
                'subscription_id' => $subscriptionId
            ]);

            $result = $this->subscriptionUpdateService->getRawSubscriptionData($subscriptionId);

            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'message' => 'Raw subscription data retrieved successfully',
                    'data' => $result
                ], 200);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => $result['message'],
                    'error' => $result['error'] ?? 'Unknown error occurred'
                ], 400);
            }

        } catch (\Exception $e) {
            Log::error('Failed to get raw subscription data', [
                'subscription_id' => $subscriptionId,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get raw subscription data',
                'error' => $e->getMessage()
            ], 500);
        }
    }
} 