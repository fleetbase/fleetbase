<?php

namespace Fleetbase\Http\Controllers\Internal\v1;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Exception;

class GoCardlessWebhookController extends Controller
{
    /**
     * Handle GoCardless webhook events
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function handleWebhook(Request $request)
    {
        try {
            // Verify webhook signature
            if (!$this->verifyWebhookSignature($request)) {
                Log::warning('GoCardless webhook signature verification failed', [
                    'ip' => $request->ip(),
                    'signature' => $request->header('Webhook-Signature')
                ]);
                
                return response()->json(['error' => 'Invalid signature'], 401);
            }

            // Get events from request
            $events = $request->json('events', []);
            
            if (empty($events)) {
                Log::warning('GoCardless webhook received with no events');
                return response()->json(['error' => 'No events found'], 400);
            }

            Log::info('GoCardless webhook received', [
                'event_count' => count($events),
                'ip' => $request->ip()
            ]);

            // Process each event
            foreach ($events as $event) {
                $this->processWebhookEvent($event);
            }

            return response()->json(['status' => 'success'], 200);

        } catch (Exception $e) {
            Log::error('GoCardless webhook processing failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json(['error' => 'Webhook processing failed'], 500);
        }
    }

    /**
     * Verify webhook signature
     */
    private function verifyWebhookSignature(Request $request): bool
    {
        $webhookSecret = config('gocardless.webhook_secret');
        
        if (!$webhookSecret) {
            Log::warning('GoCardless webhook secret not configured');
            return false;
        }

        $providedSignature = $request->header('Webhook-Signature');
        $payload = $request->getContent();
        $calculatedSignature = hash_hmac('sha256', $payload, $webhookSecret);

        return hash_equals($calculatedSignature, $providedSignature);
    }

    /**
     * Process individual webhook event
     */
    private function processWebhookEvent(array $event)
    {
        $resourceType = $event['resource_type'] ?? null;
        $action = $event['action'] ?? null;
        $eventId = $event['id'] ?? null;

        Log::info('Processing GoCardless webhook event', [
            'event_id' => $eventId,
            'resource_type' => $resourceType,
            'action' => $action,
            'created_at' => $event['created_at'] ?? null
        ]);

        // Check for duplicate events
        if ($this->isDuplicateEvent($eventId)) {
            Log::info('Skipping duplicate webhook event', ['event_id' => $eventId]);
            return;
        }

        // Store event for tracking
        $this->storeWebhookEvent($event);

        // Route to specific handler based on resource type
        switch ($resourceType) {
            case 'billing_requests':
                $this->handleBillingRequestEvent($event);
                break;
            case 'payments':
                $this->handlePaymentEvent($event);
                break;
            case 'mandates':
                $this->handleMandateEvent($event);
                break;
            case 'subscriptions':
                $this->handleSubscriptionEvent($event);
                break;
            case 'refunds':
                $this->handleRefundEvent($event);
                break;
            case 'payouts':
                $this->handlePayoutEvent($event);
                break;
            default:
                Log::info('Unhandled webhook resource type', [
                    'resource_type' => $resourceType,
                    'event_id' => $eventId
                ]);
        }
    }

    /**
     * Handle billing request events
     */
    private function handleBillingRequestEvent(array $event)
    {
        $action = $event['action'];
        $billingRequestId = $event['links']['billing_request'] ?? null;

        switch ($action) {
            case 'fulfilled':
                $this->handleBillingRequestFulfilled($billingRequestId, $event);
                break;
            case 'cancelled':
                $this->handleBillingRequestCancelled($billingRequestId, $event);
                break;
            case 'customer_approval_granted':
                $this->handleBillingRequestApprovalGranted($billingRequestId, $event);
                break;
            case 'customer_approval_denied':
                $this->handleBillingRequestApprovalDenied($billingRequestId, $event);
                break;
            default:
                Log::info('Unhandled billing request action', [
                    'action' => $action,
                    'billing_request_id' => $billingRequestId
                ]);
        }
    }

    /**
     * Handle payment events
     */
    private function handlePaymentEvent(array $event)
    {
        $action = $event['action'];
        $paymentId = $event['links']['payment'] ?? null;
        $mandateId = $event['links']['mandate'] ?? null;

        switch ($action) {
            case 'created':
                $this->handlePaymentCreated($paymentId, $event);
                break;
            case 'submitted':
                $this->handlePaymentSubmitted($paymentId, $event);
                break;
            case 'confirmed':
                $this->handlePaymentConfirmed($paymentId, $event);
                break;
            case 'failed':
                $this->handlePaymentFailed($paymentId, $event);
                break;
            case 'cancelled':
                $this->handlePaymentCancelled($paymentId, $event);
                break;
            case 'charged_back':
                $this->handlePaymentChargedBack($paymentId, $event);
                break;
            default:
                Log::info('Unhandled payment action', [
                    'action' => $action,
                    'payment_id' => $paymentId
                ]);
        }
    }

    /**
     * Handle mandate events
     */
    private function handleMandateEvent(array $event)
    {
        $action = $event['action'];
        $mandateId = $event['links']['mandate'] ?? null;

        switch ($action) {
            case 'created':
                $this->handleMandateCreated($mandateId, $event);
                break;
            case 'active':
                $this->handleMandateActive($mandateId, $event);
                break;
            case 'cancelled':
                $this->handleMandateCancelled($mandateId, $event);
                break;
            case 'failed':
                $this->handleMandateFailed($mandateId, $event);
                break;
            case 'expired':
                $this->handleMandateExpired($mandateId, $event);
                break;
            default:
                Log::info('Unhandled mandate action', [
                    'action' => $action,
                    'mandate_id' => $mandateId
                ]);
        }
    }

    // Billing Request Event Handlers

    private function handleBillingRequestFulfilled(string $billingRequestId, array $event)
    {
        Log::info('Billing request fulfilled', [
            'billing_request_id' => $billingRequestId,
            'event_id' => $event['id']
        ]);

        // Update any local records
        $this->updateBillingRequestStatus($billingRequestId, 'fulfilled');

        // Trigger any completion logic (send emails, update user subscriptions, etc.)
        $this->triggerBillingRequestCompletion($billingRequestId);
    }

    private function handleBillingRequestCancelled(string $billingRequestId, array $event)
    {
        Log::info('Billing request cancelled', [
            'billing_request_id' => $billingRequestId,
            'event_id' => $event['id']
        ]);

        $this->updateBillingRequestStatus($billingRequestId, 'cancelled');
        $this->triggerBillingRequestCancellation($billingRequestId);
    }

    private function handleBillingRequestApprovalGranted(string $billingRequestId, array $event)
    {
        Log::info('Billing request approval granted', [
            'billing_request_id' => $billingRequestId,
            'event_id' => $event['id']
        ]);

        $this->updateBillingRequestStatus($billingRequestId, 'approved');
    }

    private function handleBillingRequestApprovalDenied(string $billingRequestId, array $event)
    {
        Log::info('Billing request approval denied', [
            'billing_request_id' => $billingRequestId,
            'event_id' => $event['id']
        ]);

        $this->updateBillingRequestStatus($billingRequestId, 'denied');
        $this->triggerBillingRequestCancellation($billingRequestId);
    }

    // Payment Event Handlers

    private function handlePaymentCreated(string $paymentId, array $event)
    {
        Log::info('Payment created', [
            'payment_id' => $paymentId,
            'event_id' => $event['id']
        ]);

        // Store payment record if needed
        $this->storePaymentRecord($paymentId, $event);
    }

    private function handlePaymentConfirmed(string $paymentId, array $event)
    {
        Log::info('Payment confirmed', [
            'payment_id' => $paymentId,
            'event_id' => $event['id']
        ]);

        // Update payment status
        $this->updatePaymentStatus($paymentId, 'confirmed');

        // Trigger success actions (fulfill orders, send confirmations, etc.)
        $this->triggerPaymentSuccess($paymentId);
    }

    private function handlePaymentFailed(string $paymentId, array $event)
    {
        Log::warning('Payment failed', [
            'payment_id' => $paymentId,
            'event_id' => $event['id'],
            'details' => $event['details'] ?? null
        ]);

        $this->updatePaymentStatus($paymentId, 'failed');
        $this->triggerPaymentFailure($paymentId, $event['details'] ?? []);
    }

    private function handlePaymentSubmitted(string $paymentId, array $event)
    {
        Log::info('Payment submitted', [
            'payment_id' => $paymentId,
            'event_id' => $event['id']
        ]);

        $this->updatePaymentStatus($paymentId, 'submitted');
    }

    private function handlePaymentCancelled(string $paymentId, array $event)
    {
        Log::info('Payment cancelled', [
            'payment_id' => $paymentId,
            'event_id' => $event['id']
        ]);

        $this->updatePaymentStatus($paymentId, 'cancelled');
    }

    private function handlePaymentChargedBack(string $paymentId, array $event)
    {
        Log::warning('Payment charged back', [
            'payment_id' => $paymentId,
            'event_id' => $event['id']
        ]);

        $this->updatePaymentStatus($paymentId, 'charged_back');
        $this->triggerPaymentChargeback($paymentId);
    }

    // Mandate Event Handlers

    private function handleMandateCreated(string $mandateId, array $event)
    {
        Log::info('Mandate created', [
            'mandate_id' => $mandateId,
            'event_id' => $event['id']
        ]);

        $this->storeMandateRecord($mandateId, $event);
    }

    private function handleMandateActive(string $mandateId, array $event)
    {
        Log::info('Mandate became active', [
            'mandate_id' => $mandateId,
            'event_id' => $event['id']
        ]);

        $this->updateMandateStatus($mandateId, 'active');
        $this->triggerMandateActivation($mandateId);
    }

    private function handleMandateCancelled(string $mandateId, array $event)
    {
        Log::info('Mandate cancelled', [
            'mandate_id' => $mandateId,
            'event_id' => $event['id']
        ]);

        $this->updateMandateStatus($mandateId, 'cancelled');
        $this->triggerMandateCancellation($mandateId);
    }

    private function handleMandateFailed(string $mandateId, array $event)
    {
        Log::warning('Mandate failed', [
            'mandate_id' => $mandateId,
            'event_id' => $event['id']
        ]);

        $this->updateMandateStatus($mandateId, 'failed');
    }

    private function handleMandateExpired(string $mandateId, array $event)
    {
        Log::info('Mandate expired', [
            'mandate_id' => $mandateId,
            'event_id' => $event['id']
        ]);

        $this->updateMandateStatus($mandateId, 'expired');
    }

    // Subscription Event Handlers

    private function handleSubscriptionEvent(array $event)
    {
        $action = $event['action'];
        $subscriptionId = $event['links']['subscription'] ?? null;

        Log::info('Subscription event', [
            'action' => $action,
            'subscription_id' => $subscriptionId,
            'event_id' => $event['id']
        ]);

        // Handle subscription events as needed
        switch ($action) {
            case 'created':
                $this->handleSubscriptionCreated($subscriptionId, $event);
                break;
            case 'cancelled':
                $this->handleSubscriptionCancelled($subscriptionId, $event);
                break;
            case 'finished':
                $this->handleSubscriptionFinished($subscriptionId, $event);
                break;
        }
    }

    // Refund Event Handlers

    private function handleRefundEvent(array $event)
    {
        $action = $event['action'];
        $refundId = $event['links']['refund'] ?? null;
        $paymentId = $event['links']['payment'] ?? null;

        Log::info('Refund event', [
            'action' => $action,
            'refund_id' => $refundId,
            'payment_id' => $paymentId,
            'event_id' => $event['id']
        ]);

        if ($action === 'created') {
            $this->triggerRefundCreated($refundId, $paymentId);
        }
    }

    // Payout Event Handlers

    private function handlePayoutEvent(array $event)
    {
        $action = $event['action'];
        $payoutId = $event['links']['payout'] ?? null;

        Log::info('Payout event', [
            'action' => $action,
            'payout_id' => $payoutId,
            'event_id' => $event['id']
        ]);
    }

    // Helper Methods

    private function isDuplicateEvent(string $eventId): bool
    {
        return DB::table('gocardless_webhook_events')
            ->where('event_id', $eventId)
            ->exists();
    }

    private function storeWebhookEvent(array $event)
    {
        DB::table('gocardless_webhook_events')->insert([
            'event_id' => $event['id'],
            'resource_type' => $event['resource_type'],
            'action' => $event['action'],
            'event_data' => json_encode($event),
            'processed_at' => now(),
            'created_at' => now()
        ]);
    }

    private function updateBillingRequestStatus(string $billingRequestId, string $status)
    {
        // Update your local billing request records
        DB::table('checkout_sessions')
            ->where('billing_request_id', $billingRequestId)
            ->update([
                'status' => $status,
                'updated_at' => now()
            ]);
    }

    private function updatePaymentStatus(string $paymentId, string $status)
    {
        // Update payment records
        DB::table('checkout_sessions')
            ->where('payment_id', $paymentId)
            ->update([
                'status' => $status === 'confirmed' ? 'completed' : $status,
                'updated_at' => now()
            ]);
    }

    private function updateMandateStatus(string $mandateId, string $status)
    {
        // Update mandate records if you store them locally
        Log::info('Mandate status updated', [
            'mandate_id' => $mandateId,
            'status' => $status
        ]);
    }

    // Business Logic Triggers

    private function triggerBillingRequestCompletion(string $billingRequestId)
    {
        // Add your business logic here:
        // - Send confirmation emails
        // - Activate user subscriptions
        // - Update user permissions
        // - Send notifications
        
        Log::info('Triggering billing request completion logic', [
            'billing_request_id' => $billingRequestId
        ]);
    }

    private function triggerBillingRequestCancellation(string $billingRequestId)
    {
        // Handle cancellation logic
        Log::info('Triggering billing request cancellation logic', [
            'billing_request_id' => $billingRequestId
        ]);
    }

    private function triggerPaymentSuccess(string $paymentId)
    {
        // Handle successful payment
        Log::info('Triggering payment success logic', [
            'payment_id' => $paymentId
        ]);
    }

    private function triggerPaymentFailure(string $paymentId, array $details)
    {
        // Handle payment failure
        Log::warning('Triggering payment failure logic', [
            'payment_id' => $paymentId,
            'failure_details' => $details
        ]);
    }

    private function triggerPaymentChargeback(string $paymentId)
    {
        // Handle chargeback
        Log::warning('Triggering payment chargeback logic', [
            'payment_id' => $paymentId
        ]);
    }

    private function triggerMandateActivation(string $mandateId)
    {
        // Handle mandate activation
        Log::info('Triggering mandate activation logic', [
            'mandate_id' => $mandateId
        ]);
    }

    private function triggerMandateCancellation(string $mandateId)
    {
        // Handle mandate cancellation
        Log::info('Triggering mandate cancellation logic', [
            'mandate_id' => $mandateId
        ]);
    }

    private function storePaymentRecord(string $paymentId, array $event)
    {
        // Store payment record if needed
        Log::info('Storing payment record', [
            'payment_id' => $paymentId
        ]);
    }

    private function storeMandateRecord(string $mandateId, array $event)
    {
        // Store mandate record if needed
        Log::info('Storing mandate record', [
            'mandate_id' => $mandateId
        ]);
    }

    private function handleSubscriptionCreated(string $subscriptionId, array $event)
    {
        Log::info('Handling subscription creation', [
            'subscription_id' => $subscriptionId
        ]);
    }

    private function handleSubscriptionCancelled(string $subscriptionId, array $event)
    {
        Log::info('Handling subscription cancellation', [
            'subscription_id' => $subscriptionId
        ]);
    }

    private function handleSubscriptionFinished(string $subscriptionId, array $event)
    {
        Log::info('Handling subscription completion', [
            'subscription_id' => $subscriptionId
        ]);
    }

    private function triggerRefundCreated(string $refundId, string $paymentId)
    {
        Log::info('Handling refund creation', [
            'refund_id' => $refundId,
            'payment_id' => $paymentId
        ]);
    }
}