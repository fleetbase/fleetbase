<?php
namespace Fleetbase\Services;

use Illuminate\Support\Facades\Log;
// use Fleetbase\Models\BillingRequest;
use Fleetbase\Models\Payment;
use Fleetbase\Models\Subscription;
use Fleetbase\Models\CompanyPlanRelation;
use Fleetbase\Models\PaymentEventsRelation;
use Fleetbase\Events\BillingRequestCompleted;
use Illuminate\Support\Facades\DB;
// use Fleetbase\Events\PaymentFailed;
use Fleetbase\Services\GoCardlessBillingRequestService;
use Illuminate\Support\Carbon;
use Exception;

class GoCardlessWebhookService
{
    protected $billingRequestService;

    public function __construct(GoCardlessBillingRequestService $billingRequestService)
    {
        $this->billingRequestService = $billingRequestService;
    }
    public function processEvent(array $event): void
    {
        $eventType = $event['resource_type'] ?? null;
 
        $action = $event['action'] ?? null;
        
        Log::info("Processing GoCardless webhook: {$eventType}.{$action}", $event);

        switch ($eventType) {
            case 'billing_requests':
                $this->handleBillingRequestEvent($event);
                break;
            case 'payments':
                Log::info("Inside payment flow");
                $this->handlePaymentEvent($event);
                break;
            case 'subscriptions':
                $this->handleSubscriptionEvent($event);
                break;
            case 'mandates':
                $this->handleMandateEvent($event);
                break;
            default:
                Log::info("Unhandled webhook event type: {$eventType}");
        }
    }

    private function handleBillingRequestEvent(array $event): void
    {
        Log::info("Inside handleBillingRequestEvent:");
        $action = $event['action'];
        $billingRequestData = $event['links']['billing_request'] ?? null;
        $result = ['billing_request_id' => $billingRequestData];

        if (!$billingRequestData) {
            Log::warning('Billing request ID not found in webhook event');
            return;
        }

        $billingRequest = Payment::where('checkout_session_id', $billingRequestData)->first();
        
        if (!$billingRequest) {
            Log::warning("Billing request not found:  {$billingRequestData}");
            return;
        }
        Log::info("Billing request action: {$action}");
        switch ($action) {
            case 'fulfilled':
                $this->handleBillingRequestFulFilled($billingRequest, $event);
                break;
            
            case 'completed':
                $this->handleBillingRequestCompleted($billingRequest, $event);
                break;
            case 'cancelled':
                $this->handleBillingRequestCancelled($billingRequest, $event);
                break;
            case 'expired':
                $this->handleBillingRequestExpired($billingRequest, $event);
                break;
            case 'failed':
                $this->handleBillingRequestFailed($billingRequest, $event);
                break;
        }
    }
    private function handleBillingRequestFulFilled($payment, array $event): void
    {
        Log::info("Inside handleBillingRequestFulFilled:");
        try {
            // Get billing request ID from the event
            $billingRequestId = $event['links']['billing_request'] ?? null;
            
            if (!$billingRequestId) {
                Log::warning("No billing request ID found in fulfilled event", $event);
                return;
            }
            
            // If $payment is an ID, get the payment object
            if (is_numeric($payment)) {
                $payment = DB::table('payments')->where('checkout_session_id', $payment->checkout_session_id)->first();
            }
    
            if (!$payment) {
                Log::warning("No payment found for billing request fulfilled", [
                    'billing_request_id' => $billingRequestId
                ]);
                return;
            }

            // if ($payment && !$payment->gocardless_subscription_id) {
            if ($payment) {
                
            
                // Create subscription now that billing request is fulfilled
                
                $billingRequest = $this->billingRequestService->getBillingRequest($billingRequestId);
                $mandateId = $billingRequest['mandate_request']['links']['mandate'];
                Log::info("webhook fulfilled Mandate ID: {$mandateId}");
                $subscription = $this->billingRequestService->createSubscriptionFromPayment($payment, $mandateId);
                
                if ($subscription) {
                    $payment->update([
                        'gocardless_subscription_id' => $subscription['id'],
                        'status' => 'subscription_active'
                    ]);
                }
            }
    
            Log::info("Processing billing request fulfilled", [
                'billing_request_id' => $billingRequestId,
                'payment_id' => $payment->id
            ]);
    
            // Save the billing request fulfilled event to payment_events_relation
            $this->saveBillingRequestEvent($payment->id, $event, 'billing_request_fulfilled', null);
    
            // Prepare update data for payment
            $paymentUpdateData = [
                'status' => 'subscription_active',
                // 'paid_at' => now(),
                'updated_at' => now()
            ];
    
            // Store all the GoCardless IDs in payment metadata
            $paymentMetadata = json_decode($payment->payment_metadata ?? '{}', true);
            
            if (isset($event['links']['mandate_request_mandate'])) {
                $paymentMetadata['mandate_id'] = $event['links']['mandate_request_mandate'];
            }
            if (isset($event['links']['customer'])) {
                $paymentMetadata['customer_id'] = $event['links']['customer'];
            }
            if (isset($event['links']['customer_bank_account'])) {
                $paymentMetadata['bank_account_id'] = $event['links']['customer_bank_account'];
            }
            if (isset($event['links']['payment_request_payment'])) {
                $paymentUpdateData['gocardless_payment_id'] = $event['links']['payment_request_payment'];
                $paymentMetadata['payment_id'] = $event['links']['payment_request_payment'];
            }
            
            $paymentMetadata['fulfilled_at'] = now()->toISOString();
            $paymentMetadata['billing_request_id'] = $billingRequestId;
            $paymentUpdateData['payment_metadata'] = json_encode($paymentMetadata);
    
            // Update the payment record
            DB::table('payments')
                ->where('id', $payment->id)
                ->update($paymentUpdateData);
    
            Log::info("Updated payment for fulfilled billing request", [
                'billing_request_id' => $billingRequestId,
                'payment_id' => $payment->id,
                'gocardless_payment_id' => $event['links']['payment_request_payment'] ?? null
            ]);
    
            // Create subscription if this is a subscription payment
            if ($payment->payment_type === 'subscription') {
                $this->saveBillingRequestEvent($payment->id, $event, 'subscription_creation_started', null);
                
                $subscriptionCreated = $this->createSubscriptionFromBillingRequest($payment, $event);
                
                if ($subscriptionCreated) {
                    $this->saveBillingRequestEvent($payment->id, $event, 'subscription_creation_completed', null);
                } else {
                    $this->saveBillingRequestEvent($payment->id, $event, 'subscription_creation_failed', 'Failed to create subscription');
                }
            }
    
        } catch (Exception $e) {
            Log::error("Error handling billing request fulfilled", [
                'billing_request_id' => $event['links']['billing_request'] ?? null,
                'payment_id' => isset($payment->id) ? $payment->id : null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
    
            // Save error event if we have a payment
            if (isset($payment->id)) {
                $this->saveBillingRequestEvent($payment->id, $event, 'billing_request_processing_error', $e->getMessage());
            }
    
            throw $e;
        }
    }
    /**
     * Handle billing request failed event
     */
    private function handleBillingRequestFailed($payment, array $event): void
    {
        Log::info("Processing billing request failed", [
            'payment_id' => $payment->id,
            'billing_request_id' => $event['links']['billing_request'] ?? null,
            'failure_details' => $event['details'] ?? []
        ]);

        // Save the billing request failed event
        $errorMessage = $event['details']['description'] ?? 'Billing request failed';
        $this->saveBillingRequestEvent($payment->id, $event, 'billing_request_failed', $errorMessage);
        
        // Update payment status to failed
        $paymentUpdateData = [
            'status' => 'failed',
            'failed_at' => now(),
            'updated_at' => now()
        ];

        // Store failure details in payment metadata
        $paymentMetadata = json_decode($payment->payment_metadata ?? '{}', true);
        $paymentMetadata['failed_at'] = now()->toISOString();
        $paymentMetadata['failure_reason'] = $event['details']['reason_code'] ?? 'billing_request_failed';
        // $paymentMetadata['failure_description'] = $event['details']['description'] ?? 'Billing request failed';
        $paymentUpdateData['payment_metadata'] = json_encode($paymentMetadata);

        // Also store in failure_reason field if your table has it
        $paymentUpdateData['failure_reason'] = json_encode([
            'reason_code' => $event['details']['reason_code'] ?? null,
            'description' => $event['details']['description'] ?? null,
            'cause' => $event['details']['cause'] ?? null,
            'details' => $event['details'] ?? []
        ]);

        // Update the payment record
        Payment::where('id', $payment->id)->update($paymentUpdateData);

        Log::info("Updated payment for failed billing request", [
            'payment_id' => $payment->id,
            'billing_request_id' => $event['links']['billing_request'] ?? null
        ]);
    }

    private function handleBillingRequestCompleted(BillingRequest $billingRequest, array $event): void
    {
        Log::info("Billing request completed:");
        $billingRequest->update([
            'status' => 'completed',
            'completed_at' => now(),
            'mandate_id' => $event['links']['mandate'] ?? null,
        ]);
         // Find the related payment record using billing request ID
        $payment = DB::table('payments')
         ->where('checkout_session_id', $billingRequest->checkout_session_id)
         ->where('deleted', 0)
         ->first();

        if ($payment) {
            // Save the billing request completed event to payment_events_relation
            $this->saveBillingRequestEvent($payment->id, $event, 'billing_request_completed', null);

            // Update payment status
            $paymentUpdateData = [
                'status' => 'completed',
                'paid_at' => now(),
                'updated_at' => now()
            ];

            // Store mandate ID in payment metadata
            if (isset($event['links']['mandate'])) {
                $paymentMetadata = json_decode($payment->payment_metadata ?? '{}', true);
                $paymentMetadata['mandate_id'] = $event['links']['mandate'];
                $paymentMetadata['billing_request_completed_at'] = now()->toISOString();
                $paymentUpdateData['payment_metadata'] = json_encode($paymentMetadata);
            }

            DB::table('payments')
                ->where('id', $payment->id)
                ->update($paymentUpdateData);

            Log::info("Updated payment {$payment->id} for completed billing request", [
                'billing_request_id' => $billingRequest->gocardless_id,
                'payment_id' => $payment->id
            ]);

            // Create subscription if this was for a subscription
            if ($billingRequest->subscription_plan_id) {
                Log::info("Creating subscription for completed billing request", [
                    'billing_request_id' => $billingRequest->gocardless_id
                ]);
                // Save subscription creation start event
                $this->saveBillingRequestEvent($payment->id, $event, 'subscription_creation_started', null);
                
                $subscriptionCreated = $this->createSubscriptionFromBillingRequest($billingRequest, $event, $payment->id);
                
                if ($subscriptionCreated) {
                    $this->saveBillingRequestEvent($payment->id, $event, 'subscription_creation_completed', null);
                } else {
                    $this->saveBillingRequestEvent($payment->id, $event, 'subscription_creation_failed', 'Failed to create subscription');
                }
            }

        } else {
            Log::warning("No payment found for billing request", [
                'billing_request_id' => $billingRequest->gocardless_id
            ]);

            // Still save the event even if no payment found (for debugging)
            $this->saveOrphanedBillingRequestEvent($billingRequest->gocardless_id, $event, 'billing_request_completed_no_payment');
        }

        // Create subscription if this was for a subscription
        if ($billingRequest->subscription_plan_id) {
            $this->createSubscriptionFromBillingRequest($billingRequest, $event);
        }

        event(new BillingRequestCompleted($billingRequest));
        
        Log::info("Billing request completed: {$billingRequest->gocardless_id}");
    }

    private function handleBillingRequestCancelled(BillingRequest $billingRequest, array $event): void
    {
        $billingRequest->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
        ]);
        
        Log::info("Billing request cancelled: {$billingRequest->gocardless_id}");
    }

    private function handleBillingRequestExpired(BillingRequest $billingRequest, array $event): void
    {
        $billingRequest->update([
            'status' => 'expired',
            'expired_at' => now(),
        ]);
        
        Log::info("Billing request expired: {$billingRequest->gocardless_id}");
    }

    private function handlePaymentEvent(array $event): void
    {
        Log::info("Handling payment event");
        $action = $event['action'];
        $paymentId = $event['links']['payment'] ?? null;
        
        if (!$paymentId) {
            return;
        }

        // $payment = Payment::where('gocardless_payment_id', $paymentId)->first();
        
        $existingPayment = Payment::where('gocardless_payment_id', $paymentId)->first();
        Log::info("Existing payment: " . json_encode($existingPayment));
        if (!$existingPayment && in_array($action, ['submitted', 'confirmed', 'paid_out','created'])) {
            // NEW monthly payment - create record
            Log::info("Create new monthly payment record");
            $this->createMonthlyPaymentRecord($event);
            return;
        }
        else {
            Log::info("Condition not met", [
                'reason' => !$existingPayment ? 'action not in array' : 'existing payment found'
            ]);
        }
        
        if ($existingPayment) {
        //     // EXISTING payment - update status
        //     $this->updatePaymentStatus($existingPayment, $event);
            $this->saveMonthlyPaymentEvent($existingPayment, $event, $existingPayment);
        }

        switch ($action) {
            case 'confirmed':
                $chargedAt = isset($event['created_at']) 
                ? Carbon::parse($event['created_at']) 
                : now();
                $existingPayment->update(['status' => 'completed','charged_at' => $chargedAt]);
                // Update subscription next payment date when payment is confirmed
                $this->updateSubscriptionNextPaymentDate($event,$existingPayment);
                break;
            case 'paid_out':
                $paidOutAt = isset($event['created_at']) 
                ? Carbon::parse($event['created_at']) 
                : now();
                $existingPayment->update(['status' => 'completed','paid_out_at' => $paidOutAt]);
                // Update subscription next payment date when payment is paid out
                $this->updateSubscriptionNextPaymentDate($event,$existingPayment);
                break;
            case 'failed':
                $existingPayment->update(['status' => 'failed']);
                // event(new PaymentFailed($payment));
                break;
            case 'cancelled':
                $existingPayment->update(['status' => 'cancelled']);
                break;
        }
    }
    
    /**
     * Create new monthly payment record
     */
    private function createMonthlyPaymentRecord(array $event): void
    {
        try {
            DB::beginTransaction();
            
            $paymentId = $event['links']['payment'];
            $subscriptionId = $event['links']['subscription'] ?? null;
            $billingRequestId = $event['links']['billing_request'] ?? null;
            
            // Check if subscription exists in the database
            $existingPayment = null;
            if ($subscriptionId) {
                $existingPayment = Payment::where('subscription_id', $subscriptionId)->first();
            }
            
            // If subscription exists and we already have a payment record, skip creating new payment
            if ($subscriptionId && $existingPayment) {
                Log::info("Payment already exists for subscription", [
                    'subscription_id' => $subscriptionId,
                    'existing_payment_id' => $existingPayment->id,
                    'gocardless_payment_id' => $paymentId
                ]);
                
                DB::commit();
                return;
            }
            
            // Find original payment to get company details
            // Initialize variables for payment creation
            $companyPlanId = null;
            $companyUuid = null;
            $userUuid = null;
            $planId = null;
            $totalAmount = null;
            $currency = 'EUR'; // default
            $originalPayment = null;
            
            if ($subscriptionId) {
                // Try to find by subscription_id first
                $originalPayment = Payment::where('subscription_id', $subscriptionId)
                                        ->first();
            }
            
            if (!$originalPayment && $billingRequestId) {
                // Fallback to billing request if subscription payment not found
                $originalPayment = Payment::where('checkout_session_id', $billingRequestId)->first();
            }
            if ($originalPayment) {
                // Use data from existing payment record
                $companyPlanId = $originalPayment->company_plan_id;
                $companyUuid = $originalPayment->company_uuid;
                $userUuid = $originalPayment->user_uuid;
                $planId = $originalPayment->plan_id;
                $totalAmount = $originalPayment->total_amount;
                $currency = $originalPayment->currency ?? 'EUR';
                $subscription_id=$originalPayment->subscription_id;

                
                Log::info("Using data from original payment record", [
                    'original_payment_id' => $originalPayment->id,
                    'company_plan_id' => $companyPlanId,
                    'plan_id' => $planId
                ]);
                
            } else {
                // No original payment found, get data from Subscription and related models
                Log::info("No original payment found, fetching from subscription data");
                
                if (!$subscriptionId) {
                    throw new Exception("No subscription ID or original payment found for payment: {$paymentId}");
                }
                
                // Get subscription record
                $subscription = Subscription::where('gocardless_subscription_id', $subscriptionId)->first();
                
                if (!$subscription) {
                    throw new Exception("Subscription not found for GoCardless subscription ID: {$subscriptionId}");
                }
                
                Log::info("Found subscription record", [
                    'subscription_id' => $subscription->id,
                    'company_uuid' => $subscription->company_uuid,
                    'user_uuid' => $subscription->user_uuid
                ]);
                
                // Get company plan details with pricing information
                $companyPlanDetails = CompanyPlanRelation::where('company_uuid', $subscription->company_uuid)
                    ->where('user_uuid', $subscription->user_uuid)
                    ->join('plan_pricing_relation', 'company_plan_relation.plan_pricing_id', '=', 'plan_pricing_relation.id')
                    ->select(
                        'company_plan_relation.*', 
                        'plan_pricing_relation.plan_id'
                    )
                    ->orderBy('company_plan_relation.created_at', 'desc')
                    ->first();
                
                if (!$companyPlanDetails) {
                    throw new Exception("Company plan details not found for subscription: {$subscriptionId}");
                }
                
                // Get amount from GoCardless API
                $paymentDetails = $this->billingRequestService->getPaymentDetailsFromGoCardless($paymentId);
                $apiAmount = $paymentDetails['amount'] ?? null;
                
                // Use data from subscription and company plan
                $companyPlanId = $companyPlanDetails->id;
                $companyUuid = $companyPlanDetails->company_uuid;
                $userUuid = $companyPlanDetails->user_uuid;
                $planId = $companyPlanDetails->plan_id;
                $subscription_id=$subscription->id;
                $totalAmount = $apiAmount ? ($apiAmount / 100) : ($companyPlanDetails->price / 100);
                $currency = $paymentDetails['currency'] ?? $companyPlanDetails->currency ?? 'EUR';
                
                Log::info("Using data from subscription and company plan", [
                    'subscription_id' => $subscription->id,
                    'company_plan_id' => $companyPlanId,
                    'plan_id' => $planId,
                    'amount_from_api' => $apiAmount,
                    'amount_from_plan' => $companyPlanDetails->price,
                    'final_amount' => $totalAmount
                ]);
            }
            
           
            
            if (!$companyPlanId || !$companyUuid || !$userUuid || !$planId) {
                throw new Exception("Missing required payment data: company_plan_id={$companyPlanId}, company_uuid={$companyUuid}, user_uuid={$userUuid}, plan_id={$planId}");
            }
            // Determine status based on webhook action
            $status = match($event['action']) {
                'submitted' => 'processing',
                'confirmed' => 'completed',
                'paid_out' => 'completed',
                'created' => 'pending',
                default => 'pending'
            };
            
            // Get next payment date if subscription exists
            $nextPaymentDate = null;
            if ($subscriptionId) {
                try {
                    $subscriptionDetails = $this->billingRequestService->getSubscriptionDetailsFromGoCardless($subscriptionId);
                    if ($subscriptionDetails) {
                        $subscriptionDetails = json_decode(json_encode($subscriptionDetails), true);
                    }
                    
                    Log::info("subscription details: " . json_encode($subscriptionDetails));
                    
                    if ($subscriptionDetails && isset($subscriptionDetails['upcoming_payments'][0])) {
                        $nextPaymentDate = $subscriptionDetails['upcoming_payments'][0]['charge_date'];
                    }
                } catch (Exception $e) {
                    Log::warning("Could not fetch subscription details", [
                        'subscription_id' => $subscriptionId,
                        'error' => $e->getMessage()
                    ]);
                }
            }
            
            // Get payment gateway
            $paymentGateway = DB::table('payment_gateway')
                ->where('name', 'GoCardless')
                ->first();
            
            $paymentGatewayId = $paymentGateway ? $paymentGateway->id : 1; 
            $monthlyPayment = Payment::create([
                'company_plan_id' => $companyPlanId,
                'company_uuid' => $companyUuid,
                'user_uuid' => $userUuid,
                'plan_id' => $planId,
                'gocardless_payment_id' => $paymentId,
                'subscription_id' => $subscriptionId,
                'total_amount' => $totalAmount,
                'status' => $status,
                'amount' => $totalAmount,
                'currency' => $currency,
                'payment_gateway_id' => $paymentGatewayId,
                'payment_method' => 'direct_debit',
                'next_payment_date' => $nextPaymentDate,
                'payment_metadata' => json_encode($event),
            ]);
            
            Log::info("Monthly payment record created", [
                'monthly_payment_id' => $monthlyPayment->id,
                'gocardless_payment_id' => $paymentId,
                'subscription_id' => $subscriptionId,
            ]);
            
            // Save payment event
            $this->saveMonthlyPaymentEvent($monthlyPayment, $event, $originalPayment);
            
            // Update subscription next payment date if this is a subscription payment
            if ($subscriptionId) {
                $this->updateSubscriptionNextPaymentDate($event,$monthlyPayment);
            }
            
            DB::commit();
            
            Log::info("Monthly payment record successfully created", [
                'monthly_payment_id' => $monthlyPayment->id,
                'gocardless_payment_id' => $paymentId,
                'subscription_id' => $subscriptionId,
                'amount' => $monthlyPayment->amount,
                'status' => $status,
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            
            Log::error("Error creating monthly payment record", [
                'payment_id' => $event['links']['payment'] ?? null,
                'subscription_id' => $event['links']['subscription'] ?? null,
                'billing_request_id' => $event['links']['billing_request'] ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            throw $e;
        }
    }

private function saveMonthlyPaymentEvent($monthlyPayment, $event, $paymentDetails)
{
    try {
        PaymentEventsRelation::create([
            'payment_id' => $monthlyPayment->id,
            'event_type' => $event['action'] ?? 'payment_event',
            'event_data' => json_encode([
                'event' => $event,
                'payment_details' => $paymentDetails
            ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            'event_date' => now()->format('Y-m-d H:i:s'),
            'gateway_event_id' => $event['id'] ?? uniqid('event_'),
            'event_status' => $paymentDetails['status'] ?? 'pending',
            'error_message' => $this->getErrorMessage($paymentDetails),
            'created_by_id' => 1,
           
            'record_status' => 1,
        ]);

        return true;

    } catch (\Exception $e) {
        \Log::error('Failed to save payment event', [
            'payment_id' => $monthlyPayment->id,
            'error' => $e->getMessage()
        ]);
        
        throw $e;
    }
}
private function getErrorMessage($paymentDetails)
{
    if (isset($paymentDetails['status']) && in_array($paymentDetails['status'], ['failed', 'cancelled'])) {
        return $paymentDetails['failure_reason'] ?? 
               $paymentDetails['cancellation_reason'] ?? 
               'Payment ' . $paymentDetails['status'];
    }
    
    return null;
}
   
    private function calculateStartDate($billingCycle)
    {
        // Start subscription tomorrow or next business day
        $startDate = now()->addDay();
        
        // If it's weekend, move to next Monday
        if ($startDate->isWeekend()) {
            $startDate = $startDate->next('Monday');
        }
        
        return $startDate->format('Y-m-d');
    }
    
    private function getChargeDateFromEvent($event)
    {
        try {
            // Method 1: Get from subscription if available
            if (isset($event['links']['subscription'])) {
                $subscription = $this->billingRequestService->getSubscription($event['links']['subscription']);
                
                // Get the first upcoming payment charge date
                if (!empty($subscription->upcoming_payments)) {
                    return $subscription->upcoming_payments[0]->charge_date;
                }
                
                // Fallback: calculate based on subscription start date
                if ($subscription->start_date) {
                    return $subscription->start_date;
                }
            }

            // Method 2: Get from payment if this is a payment event
            if (isset($event['links']['payment'])) {
                $payment = $this->billingRequestService->getPayment($event['links']['payment']);
                return $payment->charge_date;
            }

            // Method 3: Check event details for charge date
            if (isset($event['details']['charge_date'])) {
                return $event['details']['charge_date'];
            }

            // Fallback: use current date + 1 day
            return date('Y-m-d', strtotime('+1 day'));

        } catch (\Exception $e) {
            // Log error and return fallback date
            \Log::error('Failed to get charge date from event', [
                'event' => $event,
                'error' => $e->getMessage()
            ]);
            
            return date('Y-m-d', strtotime('+1 day'));
        }
    }
    private function getEndDateFromEvent($event)
    {
        try {
            // Method 1: Get from subscription
            if (isset($event['links']['subscription'])) {
                $subscription = $this->billingRequestService->getSubscription($event['links']['subscription']);
                
                // Check if subscription has an end date
                if ($subscription->end_date) {
                    return $subscription->end_date;
                }
            }

            // Method 2: Check event details
            if (isset($event['details']['end_date'])) {
                return $event['details']['end_date'];
            }

            // Method 3: Check if it's a cancelled subscription
            if ($event['action'] === 'cancelled' && isset($event['details']['cause'])) {
                return date('Y-m-d'); // End today if cancelled
            }

            // No end date (ongoing subscription)
            return null;

        } catch (\Exception $e) {
            \Log::error('Failed to get end date from event', [
                'event' => $event,
                'error' => $e->getMessage()
            ]);
            
            return null;
        }
    }
    private function createSubscriptionRecord($event,$payment)
    {
        $paymentMetadata = [];
        if (isset($payment->payment_metadata)) {
            $paymentMetadata = is_string($payment->payment_metadata) 
                ? json_decode($payment->payment_metadata, true) 
                : $payment->payment_metadata;
        }
        // $startDate = null;
        // $calculatedStartDate = $startDate ?: $this->calculateStartDate('monthly');
        // if ($startDate && $startDate <= date('Y-m-d')) {
        //     $calculatedStartDate = date('Y-m-d', strtotime('+1 day'));
        // }
        $subscriptionId = $event['links']['subscription'];
        $subscription = $this->billingRequestService->getSubscription($subscriptionId);
        $startDate = $this->getChargeDateFromEvent($event);
        $endDate = $this->getEndDateFromEvent($event);
        $nextPaymentDate = null;
        if (!empty($subscription->upcoming_payments)) {
            if (count($subscription->upcoming_payments) > 1) {
                // Use the second payment date as next payment
                $nextPaymentDate = $subscription->upcoming_payments[1]->charge_date;
            } else {
                // Calculate next payment based on interval
                $nextPaymentDate = $this->calculateNextPaymentDate(
                    $startDate, 
                    $subscription->interval_unit, 
                    $subscription->interval
                );
            }
        }
        $companyplan=CompanyPlanRelation::where('id', $payment->company_plan_id)
            ->where('deleted',0)
            ->where('record_status','1')
            ->orderBy('id', 'desc')
            ->first();
        return Subscription::create([
            
            'company_uuid' => $companyplan['company_uuid'],
            'user_uuid' => $companyplan['user_uuid'],
            'payment_id' => $payment->id,
            'gocardless_subscription_id' => $event['links']['subscription'],
            'gocardless_mandate_id' => $paymentMetadata['mandate_id'] ?? null,
            'interval_unit' => 'monthly',
            'interval' => 1,
            'day_of_month' => $this->billingRequestService->calculateDayOfMonth($startDate),
            'status' => "active",
            'start_date' => $startDate,
            'end_date' => $endDate,
            'next_payment_date'=>$nextPaymentDate,
            'billing_request_id' => $payment->checkout_session_id,

        ]);
    }
    private function calculateNextPaymentDate($startDate, $intervalUnit, $interval = 1)
    {
        $date = new \DateTime($startDate);
        
        switch ($intervalUnit) {
            case 'daily':
                return $date->modify("+{$interval} day")->format('Y-m-d');
            case 'weekly':
                return $date->modify("+{$interval} week")->format('Y-m-d');
            case 'monthly':
                return $date->modify("+{$interval} month")->format('Y-m-d');
            case 'quarterly':
                return $date->modify("+3 month")->format('Y-m-d');
            case 'yearly':
                return $date->modify("+{$interval} year")->format('Y-m-d');
            default:
                return $date->modify('+1 month')->format('Y-m-d');
        }
    }
    private function getPaymentDetails($paymentId)
    {
        $payment    =   Payment::where('id', $paymentId)
                        ->where('deleted',0)
                        ->where('record_status','1')
                        ->first();
        return $payment;
    }

    /**
     * Update subscription next payment date when a payment is confirmed
     */
    private function updateSubscriptionNextPaymentDate(array $event,$payment): void
    {
      
        try {
            $subscriptionId = $event['links']['subscription'] ?? null;
            
            if (!$subscriptionId) {
                Log::info('No subscription ID found in payment event, checking payment record');
                
                // If no subscription ID in event, try to get from payment record
                if ($payment && $payment->subscription_id) {
                    $subscription_id=$payment->subscription_id;
                    $subscription_new=Subscription::where('id',$subscription_id)->first();
                    $subscriptionId = $subscription_new->gocardless_subscription_id;
                    Log::info('Using subscription ID from payment record', [
                        'subscription_id' => $subscriptionId
                    ]);
                } else {
                    Log::info('No subscription ID found in event or payment, skipping next payment date update');
                    return;
                }
            }
    

            // Get subscription details from GoCardless API
            $subscriptionDetails = $this->billingRequestService->getSubscriptionDetailsFromGoCardless($subscriptionId);
            if (is_object($subscriptionDetails)) {
                $subscriptionDetails = (array) $subscriptionDetails;
            }
            if (!$subscriptionDetails || !isset($subscriptionDetails['upcoming_payments'])) {
                Log::warning('Could not get subscription details or upcoming payments from GoCardless', [
                    'subscription_id' => $subscriptionId
                ]);
                return;
            }
            
            // Get the next payment date from upcoming payments
            $nextPaymentDate = null;
            if (isset($subscriptionDetails['upcoming_payments']) && 
            is_array($subscriptionDetails['upcoming_payments']) && 
            !empty($subscriptionDetails['upcoming_payments'])) {
            
            $firstUpcomingPayment = $subscriptionDetails['upcoming_payments'][0];
            
            // This should now be an array due to json_decode above, but double-check
            if (is_array($firstUpcomingPayment)) {
                $nextPaymentDate = $firstUpcomingPayment['charge_date'] ?? null;
            } else {
                Log::warning('First upcoming payment is not an array', [
                    'type' => gettype($firstUpcomingPayment),
                    'subscription_id' => $subscriptionId
                ]);
            }
        }

        if (!$nextPaymentDate) {
            Log::warning('No upcoming payment date found in subscription details', [
                'subscription_id' => $subscriptionId,
                'upcoming_payments_count' => isset($subscriptionDetails['upcoming_payments']) ? count($subscriptionDetails['upcoming_payments']) : 0,
                'upcoming_payments_type' => isset($subscriptionDetails['upcoming_payments']) ? gettype($subscriptionDetails['upcoming_payments']) : 'not_set'
            ]);
            return;
        }

        // Find the subscription in our database
        $subscription = Subscription::where('gocardless_subscription_id', $subscriptionId)->first();
        
        if (!$subscription) {
            Log::warning('Subscription not found in database', [
                'subscription_id' => $subscriptionId
            ]);
            return;
        }

            // Update the subscription's next payment date
            $subscription->update([
                'next_payment_date' => $nextPaymentDate
            ]);

            Log::info('Updated subscription next payment date', [
                'subscription_id' => $subscriptionId,
                'next_payment_date' => $nextPaymentDate,
                'payment_id' => $event['links']['payment'] ?? null
            ]);

        } catch (Exception $e) {
            Log::error('Error updating subscription next payment date', [
                'subscription_id' => $subscriptionId ?? null,
                'payment_id' => $event['links']['payment'] ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }
    private function handleSubscriptionEvent(array $event): void
    {
        Log::info("Handling subscription event");
        $action = $event['action'];
        $subscriptionId = $event['links']['subscription'] ?? null;
        
        $paymentId = $event['metadata']['payment_id'] ?? null;
        if ($paymentId) {
            $planId = $event['metadata']['plan_id'] ?? null;

            if (!$subscriptionId || !$paymentId) {
                throw new Exception("Missing required data: subscription_id or payment_id");
            }

            // Get payment details from payments table
            $payment = $this->getPaymentDetails($paymentId);
            // Log::info("Payment details: " . json_encode($payment));

            // Get subscription details from subscriptions table
            $subscription = Subscription::where('gocardless_subscription_id',$subscriptionId)
                ->where('deleted',0)
                ->where('record_status','1')
                ->first();
            
            switch ($action) {
                case 'created':
                    Log::info("Creating subscription record");
                    // $subscription->update(['status' => 'active']);
                    $newsub=$this->createSubscriptionRecord($event,$payment);
                    $payment->update(['status' => 'subscription_active','subscription_id' => $newsub->id]);
                    Log::info("Creating subscription completed");
                    
                    // Update subscription next payment date when subscription is created
                    $this->updateSubscriptionNextPaymentDate($event,$payment);
                    break;
                case 'payment_created':
                    $this->updateSubscriptionNextPaymentDate($event,$payment);
                    break;
                case 'cancelled':
                    $subscription->update(['status' => 'cancelled']);
                    $payment->update(['status' => 'subscription_cancelled']);
                    break;
                case 'finished':
                    $subscription->update(['status' => 'finished']);
                    $payment->update(['status' => 'subscription_expired']);
                    break;
            }
        }else{
            Log::info("No payment id found for subscription event");
        }
    }
    
    private function handleMandateEvent(array $event): void
    {
        Log::info("Handling mandate event", [
            'action' => $event['action'] ?? 'unknown',
            'mandate_id' => $event['links']['mandate'] ?? null
        ]);
        
        $action = $event['action'];
        $mandateId = $event['links']['mandate'] ?? null;
        $billingRequestId = $event['links']['billing_request'] ?? null;
        
        if (!$billingRequestId) {
            Log::warning('No billing request ID found in mandate event', $event);
            return;
        }
        
        $originalPayment = Payment::where('checkout_session_id', $billingRequestId)->first();
        
        if (!$originalPayment) {
            Log::warning("No payment found for billing request in mandate event: {$billingRequestId}");
            return;
        }
        
        $eventType = "mandate_" . $action;
        $errorMessage = null;
        
        // Determine if this is an error event
        if (isset($event['details']['cause'])) {
            $cause = $event['details']['cause'];
            if (in_array($cause, ['mandate_failed', 'mandate_cancelled', 'mandate_expired'])) {
                $errorMessage = $event['details']['description'] ?? "Mandate {$cause}";
            }
        }
        
        try {
            $eventData = [
                'payment_id' => $originalPayment->id,
                'event_type' => $eventType,
                'event_data' => json_encode([
                    'original_event' => $event,
                    'billing_request_id' => $billingRequestId,
                    'mandate_id' => $mandateId,
                    'processed_at' => now()->toISOString(),
                    'event_details' => $event['details'] ?? [],
                    'event_metadata' => $event['metadata'] ?? []
                ]),
                'event_date' => $this->parseEventDate($event['created_at'] ?? null),
                'gateway_event_id' => $event['id'] ?? null,
                'event_status' => $errorMessage ? 'failed' : 'processed',
                'error_message' => $errorMessage,
                'created_at' => now(),
                'updated_at' => now(),
                'deleted' => 0,
                'record_status' => 1
            ];

            $eventId = DB::table('payment_events_relation')->insertGetId($eventData);
            
            Log::info("Saved mandate event", [
                'event_id' => $eventId,
                'payment_id' => $originalPayment->id,
                'event_type' => $eventType
            ]);

        } catch (Exception $e) {
            Log::error("Failed to save mandate event", [
                'payment_id' => $originalPayment->id,
                'event_type' => $eventType,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Save billing request event to payment_events_relation table
     */
    private function saveBillingRequestEvent(int $paymentId, array $event, string $eventType, ?string $errorMessage = null): bool
    {
        Log::info("Saving billing request event to payment_events_relation table, payment_id: {$paymentId}, event_type: {$eventType}, error_message: {$errorMessage}");
        try {
            $eventData = [
                'payment_id' => $paymentId,
                'event_type' => $eventType,
                'event_data' => json_encode([
                    'original_event' => $event,
                    'billing_request_id' => $event['links']['billing_request'] ?? null,
                    'mandate_id' => $event['links']['mandate_request_mandate'] ?? null,
                    'customer_id' => $event['links']['customer'] ?? null,
                    'bank_account_id' => $event['links']['customer_bank_account'] ?? null,
                    'payment_id' => $event['links']['payment_request_payment'] ?? null,
                    'processed_at' => now()->toISOString(),
                    'event_details' => $event['details'] ?? [],
                    'event_metadata' => $event['metadata'] ?? []
                ]),
                'event_date' => $this->parseEventDate($event['created_at'] ?? null),
                'gateway_event_id' => $event['id'] ?? null,
                'event_status' => $errorMessage ? 'failed' : 'processed',
                'error_message' => $errorMessage,
                'created_at' => now(),
                'updated_at' => now(),
                'deleted' => 0,
                'record_status' => 1
            ];

            $eventId = DB::table('payment_events_relation')->insertGetId($eventData);
            
            Log::info("Saved billing request event", [
                'event_id' => $eventId,
                'payment_id' => $paymentId,
                'event_type' => $eventType
            ]);

            return true;

        } catch (Exception $e) {
            Log::error("Failed to save billing request event", [
                'payment_id' => $paymentId,
                'event_type' => $eventType,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }
    /**
     * Parse GoCardless date or use current timestamp
     */
    private function parseEventDate($dateString): string
    {
        if (!$dateString) {
            return now()->format('Y-m-d H:i:s');
        }

        try {
            // GoCardless dates are in ISO format like "2025-06-20T09:12:43.375Z"
            $timestamp = strtotime($dateString);
            return $timestamp ? date('Y-m-d H:i:s', $timestamp) : now()->format('Y-m-d H:i:s');
        } catch (Exception $e) {
            Log::warning("Failed to parse event date: {$dateString}");
            return now()->format('Y-m-d H:i:s');
        }
    }
    private function savePaymentEvent(int $paymentId, array $event): bool
    {
        try {
            $eventData = [
                'payment_id' => $paymentId,
                'event_type' => ($event['resource_type'] ?? '') . '.' . ($event['action'] ?? ''),
                'event_data' => json_encode($event),
                'event_date' => isset($event['created_at']) ? Carbon::parse($event['created_at']) : now(),
                'gateway_event_id' => $event['id'] ?? null,
                'event_status' => 'processed',
                'error_message' => null,
                'created_at' => now(),
                'updated_at' => now(),
                'deleted' => 0,
                'record_status' => 1
            ];

            $eventId = DB::table('payment_events_relation')->insertGetId($eventData);
            
            $this->logToFile("Saved payment event", [
                'event_id' => $eventId,
                'payment_id' => $paymentId,
                'event_type' => $eventData['event_type']
            ]);

            return true;

        } catch (Exception $e) {
            $this->logToFile("Failed to save payment event", [
                'payment_id' => $paymentId,
                'error' => $e->getMessage(),
                'event' => $event
            ]);
            return false;
        }
    }
}