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
            $this->saveBillingRequestEvent($payment->id, $event, 'billing_request_fulfilled');
    
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
                $this->saveBillingRequestEvent($payment->id, $event, 'subscription_creation_started');
                
                $subscriptionCreated = $this->createSubscriptionFromBillingRequest($payment, $event);
                
                if ($subscriptionCreated) {
                    $this->saveBillingRequestEvent($payment->id, $event, 'subscription_creation_completed');
                } else {
                    $this->saveBillingRequestEvent($payment->id, $event, 'subscription_creation_failed');
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
        $this->saveBillingRequestEvent($payment->id, $event, 'billing_request_failed');
        
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
            $this->saveBillingRequestEvent($payment->id, $event, 'billing_request_completed');

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
                $this->saveBillingRequestEvent($payment->id, $event, 'subscription_creation_started');
                
                $subscriptionCreated = $this->createSubscriptionFromBillingRequest($billingRequest, $event, $payment->id);
                
                if ($subscriptionCreated) {
                    $this->saveBillingRequestEvent($payment->id, $event, 'subscription_creation_completed');
                } else {
                    $this->saveBillingRequestEvent($payment->id, $event, 'subscription_creation_failed');
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

        $payment = Payment::where('gocardless_payment_id', $paymentId)->first();
        
        $existingPayment = Payment::where('gocardless_payment_id', $paymentId)->first();
    
        if (!$existingPayment && in_array($action, ['submitted', 'confirmed', 'paid_out'])) {
            // NEW monthly payment - create record
            $this->createMonthlyPaymentRecord($event);
            return;
        }
        
        if ($existingPayment) {
        //     // EXISTING payment - update status
        //     $this->updatePaymentStatus($existingPayment, $event);
            $this->saveMonthlyPaymentEvent($existingPayment, $event, $existingPayment);
        }

        switch ($action) {
            case 'confirmed':
                $payment->update(['status' => 'completed']);
                break;
            case 'paid_out':
                $payment->update(['status' => 'completed']);
                break;
            case 'failed':
                $payment->update(['status' => 'failed']);
                // event(new PaymentFailed($payment));
                break;
            case 'cancelled':
                $payment->update(['status' => 'cancelled']);
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
        if (!$subscriptionId && isset($event['links']['billing_request'])) {
            $billingRequestId = $event['links']['billing_request'];
            
        }
        // if (!$subscriptionId) {
        //     throw new Exception("No subscription ID found for payment: {$paymentId}");
        // }

        // Get payment details from GoCardless API
        // $paymentDetails = $this->getPaymentDetailsFromGoCardless($paymentId);
        if (!$subscriptionId && isset($event['links']['billing_request'])) {
        // // Find original subscription payment to get company details
            $originalPayment = Payment::where('subscription_id', $subscriptionId)
                                    // ->where('transaction_type', 'subscription_setup')
                                    ->first();
        }else{
            $originalPayment = Payment::where('checkout_session_id', $billingRequestId)->first();
        }
        
        if (!$originalPayment) {
            throw new Exception("Original subscription payment not found for: {$subscriptionId}");
        }

        // Determine status based on webhook action
        $status = match($event['action']) {
            'submitted' => 'processing',
            // 'confirmed' => 'payment_confirmed',
            'confirmed' => 'completed',
            'paid_out' => 'completed',
            default => 'pending'
        };

        $monthlyPayment = Payment::create([
            // 'session_id' => $sessionId,
            'company_plan_id' => $originalPayment->company_plan_id,
            'company_uuid' => $originalPayment->company_uuid,
            'user_uuid' => $originalPayment->user_uuid,
            'plan_id' => $originalPayment->plan_id,
            'gocardless_payment_id' => $paymentId,
            'subscription_id' => $subscriptionId,
            'total_amount' => $originalPayment->total_amount,
            // 'transaction_id' => $sessionId,
            'status' => $status,
            'amount' => $originalPayment->total_amount,
            'currency' => $originalPayment->currency,
            'payment_gateway_id' => 1,
            'payment_method' => 'direct_debit',
            // 'success_url' => $data['success_url'],
            // 'cancel_url' => $data['cancel_url'],
            'payment_metadata' => json_encode($event),
            // 'expires_at' => $expiresAt,
            // 'created_by_id' => 1,
            // 'updated_by_id' => 1
        ]);
        Log::info("Monthly payment record created", [
            'monthly_payment_id' => $monthlyPayment->id,
            'gocardless_payment_id' => $paymentId,
        ]);
        // Save payment event
        $this->saveMonthlyPaymentEvent($monthlyPayment, $event, $originalPayment);
        
        // Update subscription billing dates
        // $this->updateSubscriptionAfterPayment($originalPayment, $originalPayment);
        
        DB::commit();
        
        Log::info("Monthly payment record created", [
            'monthly_payment_id' => $monthlyPayment->id,
            'gocardless_payment_id' => $paymentId,
            'subscription_id' => $subscriptionId,
            'amount' => $monthlyPayment->amount,
            'status' => $status,
            // 'billing_date' => $paymentDetails['charge_date']
        ]);

    } catch (Exception $e) {
        DB::rollBack();
        
        Log::error("Error creating monthly payment record", [
            'payment_id' => $event['links']['payment'] ?? null,
            'subscription_id' => $event['links']['subscription'] ?? null,
            'error' => $e->getMessage()
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
    private function createSubscriptionRecord($event,$payment)
    {
        $paymentMetadata = [];
        if (isset($payment->payment_metadata)) {
            $paymentMetadata = is_string($payment->payment_metadata) 
                ? json_decode($payment->payment_metadata, true) 
                : $payment->payment_metadata;
        }
        $startDate = null;
        $calculatedStartDate = $startDate ?: $this->calculateStartDate('monthly');
        if ($startDate && $startDate <= date('Y-m-d')) {
            $calculatedStartDate = date('Y-m-d', strtotime('+1 day'));
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
            'day_of_month' => $this->billingRequestService->calculateDayOfMonth($calculatedStartDate),
            'status' => "active",
            'start_date' => $calculatedStartDate,
            // 'end_date' => $event['end_date'],
            'billing_request_id' => $payment->checkout_session_id,

        ]);
    }
    private function getPaymentDetails($paymentId)
    {
        $payment    =   Payment::where('id', $paymentId)
                        ->where('deleted',0)
                        ->where('record_status','1')
                        ->first();
        return $payment;
    }
    private function handleSubscriptionEvent(array $event): void
    {
        Log::info("Handling subscription event");
        Log::info("subscription Event details: " . json_encode($event));
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
            // Log::info("Subscription details: " . json_encode($subscription));
            
            
            switch ($action) {
                case 'created':
                    Log::info("Creating subscription record");
                    // $subscription->update(['status' => 'active']);
                    $newsub=$this->createSubscriptionRecord($event,$payment);
                    $payment->update(['status' => 'subscription_active','subscription_id' => $newsub->id]);
                    Log::info("Creating subscription completed");
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
        // Handle mandate-related events
        $action = $event['action'];
        $mandateId = $event['links']['mandate'] ?? null;
        $billingRequestId = $event['links']['billing_request'] ?? null;
        $originalPayment = Payment::where('checkout_session_id', $billingRequestId)->first();
        $eventType="mandate_".$action;
        try {
            $eventData = [
                'payment_id' => $originalPayment->id,
                'event_type' => $eventType,
                'event_data' => json_encode([
                    'original_event' => $event,
                    'billing_request_id' => $event['links']['billing_request'] ?? null,
                    'mandate_id' => $event['links']['mandate'] ?? null,
                    
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


        } catch (Exception $e) {
            Log::error("Failed to save billing request event", [
                'payment_id' => $paymentId,
                'event_type' => $eventType,
                'error' => $e->getMessage()
            ]);
           
        }
    }

    /**
     * Save billing request event to payment_events_relation table
     */
    private function saveBillingRequestEvent(int $paymentId, array $event, string $eventType, ?string $errorMessage = null): bool
    {
        Log::info("Saving billing request event to payment_events_relation table, payment_id: {$paymentId}, event_type: {$eventType}, error_message: {$errorMessage}");
        Log::info("Event details: ", $event);
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