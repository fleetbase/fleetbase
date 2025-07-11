<?php

namespace Fleetbase\Http\Controllers\Internal\v1;
use Illuminate\Routing\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Fleetbase\Models\Payment;
use Fleetbase\Models\PaymentGateway;
use Fleetbase\Models\Plan;
use Fleetbase\Models\User;
use Fleetbase\Models\Subscription;
use Fleetbase\Models\PlanPricingRelation;
use Fleetbase\Models\CompanyPlanRelation;
// use App\Models\Transaction;
// use App\Mail\WelcomeMail;
// use App\Mail\PaymentFailedMail;
use Illuminate\Support\Facades\Mail;

class ChargebeeWebhookController extends Controller
{
    /**
     * Handle Chargebee webhook
     */
    public function handle(Request $request)
    {
        try {
            // Verify webhook signature
            if (!$this->verifyWebhookSignature($request)) {
                Log::warning('Invalid Chargebee webhook signature');
                return response('Unauthorized', 401);
            }

            // Get webhook data
            $payload = $request->getContent();
            $event = json_decode($payload, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error('Invalid JSON in Chargebee webhook');
                return response('Invalid JSON', 400);
            }

            // Log the webhook event
            Log::info('Chargebee Webhook Event', [
                'event_type' => $event['event_type'],
                'webhook_id' => $request->header('X-Chargebee-Webhook-Id'),
                'timestamp' => now()
            ]);

            // Check for duplicate webhooks
            // if ($this->isDuplicateWebhook($request->header('X-Chargebee-Webhook-Id'))) {
            //     Log::info('Duplicate Chargebee webhook ignored');
            //     return response('Already processed', 200);
            // }

            // Handle the event
            $this->handleWebhookEvent($event);

            // Store webhook ID to prevent duplicates
            // $this->storeWebhookId($request->header('X-Chargebee-Webhook-Id'));

            return response('OK', 200);

        } catch (\Exception $e) {
            Log::error('Chargebee webhook error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response('Internal Server Error', 500);
        }
    }

    /**
     * Verify webhook signature
     */
    
    // private function verifyWebhookSignature(Request $request): bool
    // {
    //     $signature = $request->header('X-Chargebee-Signature');
    //     $payload = $request->getContent();
    //     $webhookSecret = config('services.chargebee.webhook_secret');

    //     if (!$signature || !$webhookSecret) {
    //         return false;
    //     }

    //     $computedSignature = hash_hmac('sha256', $payload, $webhookSecret);

    //     return hash_equals($signature, $computedSignature);
    // }
    private function verifyWebhookSignature(Request $request): bool
    {
        $signature = $request->header('X-Chargebee-Signature');
        $payload = $request->getContent();
        $webhookSecret = config('services.chargebee.webhook_secret');

        // Debug logging
        Log::info('Webhook Signature Debug', [
            'received_signature' => $signature,
            'payload_length' => strlen($payload),
            'payload_preview' => substr($payload, 0, 100) . '...',
            'secret_configured' => !empty($webhookSecret),
            'secret_length' => $webhookSecret ? strlen($webhookSecret) : 0,
            'headers' => $request->headers->all()
        ]);

        if (!$signature || !$webhookSecret) {
            Log::warning('Missing signature or secret', [
                'has_signature' => !empty($signature),
                'has_secret' => !empty($webhookSecret)
            ]);
            return false;
        }

        // Method 1: Standard HMAC (your current approach)
        $computedSignature = hash_hmac('sha256', $payload, $webhookSecret);
        
        // Method 2: Base64 encoded HMAC (some services use this)
        $computedSignatureBase64 = base64_encode(hash_hmac('sha256', $payload, $webhookSecret, true));
        
        // Method 3: Hex encoded HMAC
        $computedSignatureHex = hash_hmac('sha256', $payload, $webhookSecret);

        Log::info('Signature Comparison', [
            'received' => $signature,
            'computed_standard' => $computedSignature,
            'computed_base64' => $computedSignatureBase64,
            'computed_hex' => $computedSignatureHex,
            'match_standard' => hash_equals($signature, $computedSignature),
            'match_base64' => hash_equals($signature, $computedSignatureBase64),
            'match_hex' => hash_equals($signature, $computedSignatureHex)
        ]);

        // Try different comparison methods
        $isValid = hash_equals($signature, $computedSignature) ||
                   hash_equals($signature, $computedSignatureBase64) ||
                   hash_equals($signature, $computedSignatureHex);

        if (!$isValid) {
            Log::warning('Signature verification failed', [
                'expected_any_of' => [
                    'standard' => $computedSignature,
                    'base64' => $computedSignatureBase64,
                    'hex' => $computedSignatureHex
                ],
                'received' => $signature
            ]);
        }

        return $isValid;
    }

    /**
     * Check if webhook is duplicate
     */
    private function isDuplicateWebhook(string $webhookId): bool
    {
        return DB::table('processed_webhooks')
            ->where('webhook_id', $webhookId)
            ->exists();
    }

    /**
     * Store webhook ID
     */
    private function storeWebhookId(string $webhookId): void
    {
        DB::table('processed_webhooks')->insert([
            'webhook_id' => $webhookId,
            'processed_at' => now()
        ]);
    }

    /**
     * Handle different webhook events
     */
    private function handleWebhookEvent(array $event): void
    {
        $eventType = $event['event_type'];
        $content = $event['content'];

        switch ($eventType) {
            case 'subscription_created':
                $this->handleSubscriptionCreated($content['subscription']);
                break;

            // case 'subscription_cancelled':
            //     $this->handleSubscriptionCancelled($content['subscription']);
            //     break;

            // case 'subscription_changed':
            //     $this->handleSubscriptionChanged($content['subscription']);
            //     break;

            // case 'subscription_renewed':
            //     $this->handleSubscriptionRenewed($content['subscription']);
            //     break;

            case 'payment_succeeded':
                $this->handlePaymentSucceeded($content['transaction']);
                break;

            case 'payment_failed':
                $this->handlePaymentFailed($content['transaction']);
                break;

            // case 'invoice_generated':
            //     $this->handleInvoiceGenerated($content['invoice']);
            //     break;

            // case 'customer_created':
            //     $this->handleCustomerCreated($content['customer']);
            //     break;

            default:
                Log::info('Unhandled Chargebee event type: ' . $eventType);
        }
    }

    /**
     * Handle subscription created
     */
    private function handleSubscriptionCreated(array $subscription): void
    {
        
        Log::info('Processing subscription created', ['subscription_id' => $subscription['id']]);

        try {
            DB::transaction(function () use ($subscription) {
                // Find user by customer ID
                $user = User::where('chargebee_customer_id', $subscription['customer_id'])->first();

                if (!$user) {
                    Log::warning('User not found for customer ID: ' . $subscription['customer_id']);
                    return;
                }

                // Create or update subscription record
                Subscription::updateOrCreate(
                    ['gocardless_subscription_id' => $subscription['id']],
                    [
                        'user_uuid' => $user->uuid,
                        'company_uuid' => $user->company_uuid,
                        'payment_id' => '1',
                        'gocardless_mandate_id' => $subscription['customer_id'],
                        // 'chargebee_customer_id' => $subscription['customer_id'],
                        'interval_unit' => 'monthly',
                        'interval' => $subscription['billing_period'],
                        'day_of_month' => 1,
                        'start_date' => $subscription['activated_at'] ?? null,
                        'end_date' => $subscription['current_term_end'] ?? null,
                        'status' => $subscription['status'],
                        'current_term_start' => $subscription['current_term_start'] ?? null,
                        'current_term_end' => $subscription['current_term_end'] ?? null,
                        'next_billing_at' => $subscription['next_billing_at'] ?? null,
                        
                    ]
                );

                // Update user subscription status
                $user->update([
                    'subscription_status' => 'active',
                    'subscribed_at' => now()
                ]);

                // Send welcome email
                // Mail::to($user->email)->send(new WelcomeMail($user, $subscription));

                Log::info('Subscription created successfully', [
                    'user_id' => $user->id,
                    'subscription_id' => $subscription['id']
                ]);
            });

        } catch (\Exception $e) {
            Log::error('Failed to handle subscription created: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Handle subscription cancelled
     */
    private function handleSubscriptionCancelled(array $subscription): void
    {
        Log::info('Processing subscription cancelled', ['subscription_id' => $subscription['id']]);

        try {
            DB::transaction(function () use ($subscription) {
                // Update subscription record
                $subscriptionRecord = Subscription::where('chargebee_subscription_id', $subscription['id'])->first();

                if ($subscriptionRecord) {
                    $subscriptionRecord->update([
                        'status' => $subscription['status'],
                        'cancelled_at' => $subscription['cancelled_at'] ?? now(),
                    ]);

                    // Update user status
                    $subscriptionRecord->user->update([
                        'subscription_status' => 'cancelled'
                    ]);

                    Log::info('Subscription cancelled successfully', [
                        'subscription_id' => $subscription['id']
                    ]);
                }
            });

        } catch (\Exception $e) {
            Log::error('Failed to handle subscription cancelled: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Handle subscription changed
     */
    private function handleSubscriptionChanged(array $subscription): void
    {
        Log::info('Processing subscription changed', ['subscription_id' => $subscription['id']]);

        try {
            $subscriptionRecord = Subscription::where('chargebee_subscription_id', $subscription['id'])->first();

            if ($subscriptionRecord) {
                $subscriptionRecord->update([
                    'plan_id' => $subscription['plan_id'],
                    'status' => $subscription['status'],
                    'current_term_start' => $subscription['current_term_start'] ?? null,
                    'current_term_end' => $subscription['current_term_end'] ?? null,
                    'next_billing_at' => $subscription['next_billing_at'] ?? null,
                ]);

                Log::info('Subscription updated successfully', [
                    'subscription_id' => $subscription['id']
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Failed to handle subscription changed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Handle payment succeeded
     */
    private function handlePaymentSucceeded(array $transaction): void
    {
        Log::info('Processing payment succeeded', ['transaction_id' => $transaction['id']]);
        // $user = User::where('chargebee_customer_id', $transaction['customer_id'])->first();
        try {
            // Store transaction record
            Payment::updateOrCreate(
                ['gocardless_payment_id' => $transaction['id']],
                [
                    'gocardless_customer_id' => $transaction['customer_id'],
                    'chargebee_subscription_id' => $transaction['subscription_id'] ?? null,
                    'amount' => $transaction['amount'],
                    'company_plan_id' => 1,
                    'plan_id' => 1,
                    'total_amount' => $transaction['amount'],
                    'currency_code' => $transaction['currency_code'],
                    'status' => 'completed',
                    // 'type' => $transaction['type'],
                    'paid_at' => $transaction['date'] ?? now(),
                    'payment_metadata' => json_encode($transaction),
                    'payment_method' => 'direct_debit',
                    'payment_type' => 'subscription',

                    // 'gateway_transaction_id' => $transaction['gateway_transaction_id'] ?? null,
                ]
            );

            // Update user payment status
            $user = User::where('chargebee_customer_id', $transaction['customer_id'])->first();
            if ($user) {
                $user->update(['payment_status' => 'success']);
            }

            Log::info('Payment processed successfully', [
                'transaction_id' => $transaction['id']
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to handle payment succeeded: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Handle payment failed
     */
    private function handlePaymentFailed(array $transaction): void
    {
        Log::info('Processing payment failed', ['transaction_id' => $transaction['id']]);

        try {
            // Store failed transaction
            Payment::updateOrCreate(
                ['gocardless_payment_id' => $transaction['id']],
                [
                    'gocardless_customer_id' => $transaction['customer_id'],
                    'chargebee_subscription_id' => $transaction['subscription_id'] ?? null,
                    'amount' => $transaction['amount'],
                    'company_plan_id' => 1,
                    'plan_id' => 1,
                    'total_amount' => $transaction['amount'],
                    'currency_code' => $transaction['currency_code'],
                    'status' => $transaction['status'],
                    // 'type' => $transaction['type'],
                    'failed_at' => $transaction['date'] ?? now(),
                    'payment_metadata' => json_encode($transaction),
                    'payment_method' => 'direct_debit',
                    'payment_type' => 'subscription',
                    'failure_reason' => $transaction['failure_reason'] ?? null,

                    // 'gateway_transaction_id' => $transaction['gateway_transaction_id'] ?? null,
                ]
            );
            Transaction::updateOrCreate(
                ['chargebee_transaction_id' => $transaction['id']],
                [
                    'chargebee_customer_id' => $transaction['customer_id'],
                    'chargebee_subscription_id' => $transaction['subscription_id'] ?? null,
                    'amount' => $transaction['amount'],
                    'currency_code' => $transaction['currency_code'],
                    'status' => $transaction['status'],
                    'type' => $transaction['type'],
                    'date' => $transaction['date'] ?? now(),
                    'failure_reason' => $transaction['failure_reason'] ?? null,
                ]
            );

            // Update user payment status
            $user = User::where('chargebee_customer_id', $transaction['customer_id'])->first();
            if ($user) {
                $user->update(['payment_status' => 'failed']);

                // Send payment failed email
                Mail::to($user->email)->send(new PaymentFailedMail($user, $transaction));
            }

            Log::info('Payment failure processed', [
                'transaction_id' => $transaction['id']
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to handle payment failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Handle invoice generated
     */
    private function handleInvoiceGenerated(array $invoice): void
    {
        Log::info('Processing invoice generated', ['invoice_id' => $invoice['id']]);

        try {
            // Store invoice record or send to customer
            // Add your invoice handling logic here

            Log::info('Invoice processed successfully', [
                'invoice_id' => $invoice['id']
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to handle invoice generated: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Handle customer created
     */
    private function handleCustomerCreated(array $customer): void
    {
        Log::info('Processing customer created', ['customer_id' => $customer['id']]);

        try {
            // Update user with customer ID if not already set
            $user = User::where('email', $customer['email'])->first();
            if ($user && !$user->chargebee_customer_id) {
                $user->update(['chargebee_customer_id' => $customer['id']]);
            }

        } catch (\Exception $e) {
            Log::error('Failed to handle customer created: ' . $e->getMessage());
            throw $e;
        }
    }
}