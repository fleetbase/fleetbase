<?php
namespace Fleetbase\Services;

use Illuminate\Support\Facades\Log;
// use Fleetbase\Models\BillingRequest;
use Fleetbase\Models\Payment;
// use Fleetbase\Models\Subscription;
use Fleetbase\Events\BillingRequestCompleted;
use Illuminate\Support\Facades\DB;
// use Fleetbase\Events\PaymentFailed;

class GoCardlessWebhookService
{
    public function processEvent(array $event): void
    {
        $eventType = $event['resource_type'] ?? null;
        $action = $event['action'] ?? null;
        
        Log::info("Processing GoCardless webhook: {$eventType}.{$action}", $event);

        switch ($eventType) {
            case 'billing_requests':
                $this->handleBillingRequestEvent($event);
                break;
            // case 'payments':
            //     $this->handlePaymentEvent($event);
            //     break;
            // case 'subscriptions':
            //     $this->handleSubscriptionEvent($event);
            //     break;
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
    
            Log::info("Processing billing request fulfilled", [
                'billing_request_id' => $billingRequestId,
                'payment_id' => $payment->id
            ]);
    
            // Save the billing request fulfilled event to payment_events_relation
            $this->saveBillingRequestEvent($payment->id, $event, 'billing_request_fulfilled');
    
            // Prepare update data for payment
            $paymentUpdateData = [
                'status' => 'completed',
                'paid_at' => now(),
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
        $action = $event['action'];
        $paymentId = $event['links']['payment'] ?? null;
        
        if (!$paymentId) {
            return;
        }

        $payment = Payment::where('billing_request_id', $paymentId)->first();
        
        if (!$payment) {
            Log::warning("Payment not found: {$paymentId}");
            return;
        }

        switch ($action) {
            case 'confirmed':
                $payment->update(['status' => 'confirmed']);
                break;
            case 'paid_out':
                $payment->update(['status' => 'paid_out']);
                break;
            // case 'failed':
            //     $payment->update(['status' => 'failed']);
            //     event(new PaymentFailed($payment));
            //     break;
            case 'cancelled':
                $payment->update(['status' => 'cancelled']);
                break;
        }
    }

    private function handleSubscriptionEvent(array $event): void
    {
        $action = $event['action'];
        $subscriptionId = $event['links']['subscription'] ?? null;
        
        if (!$subscriptionId) {
            return;
        }

        $subscription = Subscription::where('gocardless_id', $subscriptionId)->first();
        
        if (!$subscription) {
            Log::warning("Subscription not found: {$subscriptionId}");
            return;
        }

        switch ($action) {
            case 'created':
                $subscription->update(['status' => 'active']);
                break;
            case 'cancelled':
                $subscription->update(['status' => 'cancelled']);
                break;
            case 'finished':
                $subscription->update(['status' => 'finished']);
                break;
        }
    }

    private function handleMandateEvent(array $event): void
    {
        // Handle mandate-related events
        $action = $event['action'];
        Log::info("Mandate event: {$action}");
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