<?php

namespace Fleetbase\Http\Controllers\Internal\v1;

use Fleetbase\Http\Controllers\Controller;
use Fleetbase\Models\Plan;
use Fleetbase\Models\PlanPricingRelation;
use Fleetbase\Models\Payment;
use Fleetbase\Models\CompanyPlanRelation;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class PlanController extends Controller
{
    /**
     * Get all active plans.
     *
     * @return JsonResponse
     */
    public function index(): JsonResponse
    {
        try {
            $plans = Plan::active()
                ->with(['paymentGateway'])
                ->get()
                ->map(function ($plan) {
                    return [
                        'id' => $plan->id,
                        'name' => $plan->name,
                        'payment_gateway' => $plan->paymentGateway ? [
                            'id' => $plan->paymentGateway->id,
                            'name' => $plan->paymentGateway->name ?? 'N/A'
                        ] : null,
                        'created_at' => $plan->created_at,
                        'updated_at' => $plan->updated_at,
                    ];
                });

            return response()->json([
                'success' => true,
                'message' => 'Plans retrieved successfully',
                'data' => $plans,
                'count' => $plans->count()
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve plans',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all tiers (pricing relations) for a specific plan.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function getTiers(int $id): JsonResponse
    {
        try {
            $plan = Plan::active()->findOrFail($id);
            
            $tiers = PlanPricingRelation::where('plan_id', $id)
                ->active()
                ->get()
                ->map(function ($tier) {
                    return [
                        'id' => $tier->id,
                        'plan_id' => $tier->plan_id,
                        'billing_cycle' => $tier->billing_cycle,
                        'billing_cycle_name' => $tier->billing_cycle_name,
                        'price_per_user' => $tier->price_per_user,
                        'price_per_driver' => $tier->price_per_driver,
                        'currency' => $tier->currency,
                        'formatted_price_per_user' => $tier->formatted_price_per_user,
                        'formatted_price_per_driver' => $tier->formatted_price_per_driver,
                        'is_monthly' => $tier->isMonthly(),
                        'is_quarterly' => $tier->isQuarterly(),
                        'is_annual' => $tier->isAnnual(),
                        'created_at' => $tier->created_at,
                        'updated_at' => $tier->updated_at,
                    ];
                });

            return response()->json([
                'success' => true,
                'message' => 'Plan tiers retrieved successfully',
                'data' => [
                    'plan' => [
                        'id' => $plan->id,
                        'name' => $plan->name,
                    ],
                    'tiers' => $tiers
                ],
                'count' => $tiers->count()
            ], 200);

        } catch (ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Plan not found',
                'error' => 'The specified plan does not exist or is not active'
            ], 404);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve plan tiers',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get user's current plan and payment status.
     *
     * @param int $userId
     * @return JsonResponse
     */
    public function getUserPaymentStatus(string $userId): JsonResponse
    {
        try {
            // Get user's current active company plan
            $companyPlan = CompanyPlanRelation::where('user_uuid', $userId)
                ->active()
                ->with(['plan', 'company'])
                ->first();

            if (!$companyPlan) {
                return response()->json([
                    'success' => true,
                    'message' => 'No active plan found for user',
                    'data' => [
                        'has_active_plan' => false,
                        'current_plan' => null,
                        'payment_status' => null,
                        'recent_payments' => []
                    ]
                ], 200);
            }

            // Get recent payments for this company plan
            $recentPayments = Payment::where('company_plan_id', $companyPlan->id)
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get()
                ->map(function ($payment) {
                    return [
                        'id' => $payment->id,
                        'invoice_number' => $payment->invoice_number,
                        'payment_type' => $payment->payment_type,
                        'payment_type_name' => $payment->payment_type_name,
                        'status' => $payment->status,
                        'status_name' => $payment->status_name,
                        'amount' => $payment->amount,
                        'total_amount' => $payment->total_amount,
                        'formatted_amount' => $payment->formatted_amount,
                        'formatted_total_amount' => $payment->formatted_total_amount,
                        'payment_method' => $payment->payment_method,
                        'payment_method_name' => $payment->payment_method_name,
                        'paid_at' => $payment->paid_at,
                        'failed_at' => $payment->failed_at,
                        'created_at' => $payment->created_at,
                        'is_completed' => $payment->isCompleted(),
                        'is_failed' => $payment->isFailed(),
                        'is_pending' => $payment->isPending(),
                        'is_refunded' => $payment->isRefunded(),
                    ];
                });

            // Get the latest payment to determine current status
            $latestPayment = $recentPayments->first();
            
            // Determine overall payment status
            $paymentStatus = $this->determinePaymentStatus($companyPlan, $latestPayment);

            return response()->json([
                'success' => true,
                'message' => 'User payment status retrieved successfully',
                'data' => [
                    'user_id' => $userId,
                    'has_active_plan' => true,
                    'current_plan' => [
                        'id' => $companyPlan->plan->id,
                        'name' => $companyPlan->plan->name,
                        'company_plan_id' => $companyPlan->id,
                        'company' => [
                            'uuid' => $companyPlan->company_uuid,
                            'name' => $companyPlan->company->name ?? 'N/A'
                        ],
                        'started_at' => $companyPlan->created_at,
                        'is_active' => $companyPlan->isActive(),
                    ],
                    'payment_status' => $paymentStatus,
                    'recent_payments' => $recentPayments,
                    'payment_summary' => [
                        'total_payments' => $recentPayments->count(),
                        'completed_payments' => $recentPayments->where('is_completed', true)->count(),
                        'failed_payments' => $recentPayments->where('is_failed', true)->count(),
                        'pending_payments' => $recentPayments->where('is_pending', true)->count(),
                    ]
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve user payment status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculate pricing for a specific tier.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function calculatePricing(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'tier_id' => 'required|integer|exists:plan_pricing_relation,id',
                'users' => 'integer|min:1',
                'drivers' => 'integer|min:0',
            ]);

            $tier = PlanPricingRelation::active()->findOrFail($request->tier_id);
            $users = $request->input('users', 1);
            $drivers = $request->input('drivers', 0);

            $totalPrice = $tier->calculateTotalPrice($users, $drivers);

            return response()->json([
                'success' => true,
                'message' => 'Pricing calculated successfully',
                'data' => [
                    'tier' => [
                        'id' => $tier->id,
                        'billing_cycle' => $tier->billing_cycle,
                        'billing_cycle_name' => $tier->billing_cycle_name,
                        'price_per_user' => $tier->price_per_user,
                        'price_per_driver' => $tier->price_per_driver,
                        'currency' => $tier->currency,
                    ],
                    'calculation' => [
                        'users' => $users,
                        'drivers' => $drivers,
                        'user_cost' => $tier->price_per_user * $users,
                        'driver_cost' => $tier->price_per_driver * $drivers,
                        'total_price' => $totalPrice,
                        'formatted_total' => $tier->currency . ' ' . number_format($totalPrice, 2),
                    ]
                ]
            ], 200);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);

        } catch (ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Tier not found',
                'error' => 'The specified pricing tier does not exist or is not active'
            ], 404);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to calculate pricing',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get billing cycle options.
     *
     * @return JsonResponse
     */
    public function getBillingCycles(): JsonResponse
    {
        try {
            $billingCycles = PlanPricingRelation::getBillingCycleOptions();

            return response()->json([
                'success' => true,
                'message' => 'Billing cycles retrieved successfully',
                'data' => $billingCycles
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve billing cycles',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Determine the overall payment status for a user.
     *
     * @param CompanyPlanRelation $companyPlan
     * @param array|null $latestPayment
     * @return array
     */
    private function determinePaymentStatus($companyPlan, $latestPayment): array
    {
        $status = [
            'overall_status' => 'unknown',
            'status_message' => 'Payment status could not be determined',
            'last_payment_date' => null,
            'next_payment_due' => null,
            'is_overdue' => false,
            'has_failed_payments' => false,
        ];

        if (!$latestPayment) {
            $status['overall_status'] = 'no_payments';
            $status['status_message'] = 'No payments found for this plan';
            return $status;
        }

        // Check for failed payments
        $hasFailedPayments = Payment::where('company_plan_id', $companyPlan->id)
            ->failed()
            ->exists();

        $status['has_failed_payments'] = $hasFailedPayments;
        $status['last_payment_date'] = $latestPayment['paid_at'] ?? $latestPayment['created_at'];

        // Determine overall status based on latest payment
        if ($latestPayment['is_completed']) {
            $status['overall_status'] = 'active';
            $status['status_message'] = 'Payment is up to date';
        } elseif ($latestPayment['is_pending']) {
            $status['overall_status'] = 'pending';
            $status['status_message'] = 'Payment is pending';
        } elseif ($latestPayment['is_failed']) {
            $status['overall_status'] = 'failed';
            $status['status_message'] = 'Latest payment failed';
        } else {
            $status['overall_status'] = 'inactive';
            $status['status_message'] = 'Payment status unclear';
        }

        return $status;
    }
    public function getLatest(): JsonResponse
    {
        try {
            $latestPlan = PlanPricingRelation::with(['plan'])
                ->where('deleted', 0) // Only active plans
                ->where('record_status', 1)
                // ->latest('created_at')
                ->first();

            if (!$latestPlan) {
                return response()->json([
                    'success' => false,
                    'message' => 'No pricing plans available',
                    'data' => null
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Latest pricing plan retrieved successfully',
                'data' => [
                    'id' => $latestPlan->id,
                    'plan_id' => $latestPlan->plan_id,
                    'plan_name' => $latestPlan->plan->name ?? null,
                    'price' => $latestPlan->price,
                    'currency' => $latestPlan->currency,
                    'billing_interval' => $latestPlan->billing_interval,
                    'features' => $latestPlan->features,
                    'is_active' => $latestPlan->is_active,
                    'created_at' => $latestPlan->created_at,
                    'updated_at' => $latestPlan->updated_at,
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving latest pricing plan',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}