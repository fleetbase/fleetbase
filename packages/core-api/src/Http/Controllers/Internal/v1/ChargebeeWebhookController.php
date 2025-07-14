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
use Fleetbase\Models\ProcessedWebhook;
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
            $webhookId = $request->header('X-Chargebee-Webhook-Id');
            if ($webhookId && $this->isDuplicateWebhook($webhookId)) {
                Log::info('Duplicate Chargebee webhook ignored');
                return response('Already processed', 200);
            }

            // Handle the event
            $this->handleWebhookEvent($event);

            // Store webhook ID to prevent duplicates
            if ($webhookId) {
                $this->storeWebhookId($webhookId, $event);
            }

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
        $webhookSecret = config('services.chargebee.webhook_secret');
        
        // Try different possible header names for Chargebee signature
        $signature = $request->header('X-Chargebee-Signature') 
                  ?? $request->header('x-chargebee-signature')
                  ?? $request->header('Chargebee-Signature')
                  ?? $request->header('chargebee-signature')
                  ?? $request->server('HTTP_X_CHARGEBEE_SIGNATURE');

        $payload = $request->getContent();

        // Debug all headers to see what Chargebee is actually sending
        Log::info('All Webhook Headers', [
            'all_headers' => $request->headers->all(),
            'server_vars' => array_filter($_SERVER, function($key) {
                return strpos($key, 'HTTP_') === 0 || strpos($key, 'CONTENT_') === 0;
            }, ARRAY_FILTER_USE_KEY)
        ]);

        // Log signature attempt
        Log::info('Webhook Signature Attempt', [
            'signature_found' => !empty($signature),
            'signature_value' => $signature,
            'secret_configured' => !empty($webhookSecret),
            'payload_length' => strlen($payload),
            'user_agent' => $request->header('User-Agent')
        ]);

        // If no signature header found, check if it's a legitimate Chargebee request
        if (!$signature) {
            return $this->verifyChargebeeRequestAlternative($request);
        }

        if (!$webhookSecret) {
            Log::warning('Webhook secret not configured');
            return false;
        }

        // Standard HMAC verification
        $computedSignature = hash_hmac('sha256', $payload, $webhookSecret);
        
        Log::info('Signature Verification', [
            'received' => $signature,
            'computed' => $computedSignature,
            'match' => hash_equals($signature, $computedSignature)
        ]);

        return hash_equals($signature, $computedSignature);
    }

    /**
     * Alternative verification when signature header is missing
     */
    private function verifyChargebeeRequestAlternative(Request $request): bool
    {
        // Check if request is from Chargebee based on other indicators
        $userAgent = $request->header('User-Agent');
        $contentType = $request->header('Content-Type');
        $payload = $request->getContent();

        Log::info('Alternative Chargebee Verification', [
            'user_agent' => $userAgent,
            'content_type' => $contentType,
            'is_json' => $this->isValidJson($payload),
            'has_chargebee_structure' => $this->hasChargebeeStructure($payload)
        ]);

        // Basic checks for Chargebee webhook
        $isChargebeeUserAgent = strpos($userAgent, 'ChargeBee') !== false;
        $isJsonContent = strpos($contentType, 'application/json') !== false;
        $hasValidStructure = $this->hasChargebeeStructure($payload);

        if ($isChargebeeUserAgent && $isJsonContent && $hasValidStructure) {
            // Additional security: IP whitelist (optional)
            if ($this->isFromChargebeeIP($request->ip())) {
                Log::info('Chargebee webhook verified via alternative method');
                return true;
            }
            
            // If IP check not available, verify based on structure
            Log::warning('Accepting Chargebee webhook without signature (configure signature in Chargebee dashboard for better security)');
            return true;
        }

        Log::warning('Request does not appear to be from Chargebee', [
            'user_agent_match' => $isChargebeeUserAgent,
            'json_content' => $isJsonContent,
            'valid_structure' => $hasValidStructure
        ]);

        return false;
    }

    /**
     * Check if payload has valid Chargebee structure
     */
    private function hasChargebeeStructure(string $payload): bool
    {
        $data = json_decode($payload, true);
        
        if (!$data) {
            return false;
        }

        // Check for required Chargebee fields
        return isset($data['event_type']) && 
               isset($data['content']) && 
               isset($data['id']) &&
               in_array($data['event_type'], [
                   'subscription_created',
                   'subscription_cancelled', 
                   'subscription_changed',
                   'subscription_renewed',
                   'payment_succeeded',
                   'payment_failed',
                   'invoice_generated',
                   'customer_created'
               ]);
    }

    /**
     * Check if request is from valid JSON
     */
    private function isValidJson(string $payload): bool
    {
        json_decode($payload);
        return json_last_error() === JSON_ERROR_NONE;
    }

    /**
     * Optional: Check if IP is from Chargebee (you need to get these IPs from Chargebee)
     */
    private function isFromChargebeeIP(string $ip): bool
    {
        // Chargebee IP ranges (you'll need to get these from Chargebee support)
        $chargebeeIPs = [
            // Add Chargebee IP ranges here
            // Example: '52.74.0.0/16', '54.254.0.0/16'
        ];

        foreach ($chargebeeIPs as $range) {
            if ($this->ipInRange($ip, $range)) {
                return true;
            }
        }

        // For now, accept all IPs if no ranges configured
        return empty($chargebeeIPs);
    }

    /**
     * Check if IP is in CIDR range
     */
    private function ipInRange(string $ip, string $range): bool
    {
        if (strpos($range, '/') === false) {
            return $ip === $range;
        }

        list($subnet, $bits) = explode('/', $range);
        $ip = ip2long($ip);
        $subnet = ip2long($subnet);
        $mask = -1 << (32 - $bits);
        $subnet &= $mask;
        return ($ip & $mask) == $subnet;
    }

    /**
     * Check if webhook is duplicate
     */
    private function isDuplicateWebhook(?string $webhookId): bool
    {
        if (!$webhookId) {
            return false; // If no webhook ID, assume it's not a duplicate
        }

        return DB::table('processed_webhooks')
            ->where('webhook_id', $webhookId)
            ->exists();
    }

    /**
     * Store webhook ID
     */
    private function storeWebhookId(string $webhookId, array $event): void
    {
        DB::table('processed_webhooks')->insert([
            'webhook_id' => $webhookId,
            'processed_at' => now(),
            'event_id' => $event['id'] ?? null,
            'event_data' => json_encode($event)
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
                $this->handlePaymentSucceeded($content['transaction'], $content['subscription'] ?? null);
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
        

        try {
            Log::info('Processing subscription created', ['subscription_id' => $subscription['id']]);
            DB::transaction(function () use ($subscription) {
                // Find user by customer ID first
                $user = User::where('chargebee_subscription_id', $subscription['id'])->first();

                // If user not found by customer ID, try to find by email from subscription metadata
                if (!$user && isset($subscription['customer_email'])) {
                    Log::info('User not found by customer ID, trying to find by email', [
                        'customer_id' => $subscription['customer_id'],
                        'email' => $subscription['customer_email']
                    ]);
                    $user = User::where('email', $subscription['customer_email'])->first();
                    
                    // If found by email, update the user with the customer ID
                    if ($user) {
                        $user->update(['chargebee_customer_id' => $subscription['customer_id']]);
                        Log::info('Updated user with chargebee_customer_id', [
                            'user_id' => $user->id,
                            'customer_id' => $subscription['customer_id']
                        ]);
                    }
                }

                // If still no user found, try to find by subscription metadata or other fields
                if (!$user) {
                    Log::warning('User not found for customer ID or email', [
                        'customer_id' => $subscription['customer_id'],
                        'customer_email' => $subscription['customer_email'] ?? 'not provided',
                        'subscription_id' => $subscription['id']
                    ]);
                    
                    // Try to find user by subscription metadata if available
                    if (isset($subscription['metadata']) && isset($subscription['metadata']['user_uuid'])) {
                        $user = User::where('uuid', $subscription['metadata']['user_uuid'])->first();
                        if ($user) {
                            $user->update(['chargebee_customer_id' => $subscription['customer_id']]);
                            Log::info('Found user by UUID from metadata and updated customer ID', [
                                'user_id' => $user->id,
                                'customer_id' => $subscription['customer_id']
                            ]);
                        }
                    }
                }

                // If still no user found, wait a bit and retry (race condition handling)
                if (!$user) {
                    Log::info('User still not found, starting retry mechanism...', [
                        'customer_id' => $subscription['customer_id']
                    ]);
                    
                    // Retry mechanism with exponential backoff
                    $maxRetries = 5;
                    $baseWaitTime = 2; // Start with 2 seconds
                    
                    for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
                        $waitTime = $baseWaitTime * $attempt; // 2, 4, 6, 8, 10 seconds
                        
                        Log::info("Retry attempt {$attempt}/{$maxRetries}, waiting {$waitTime} seconds...", [
                            'customer_id' => $subscription['customer_id'],
                            'wait_time' => $waitTime
                        ]);
                        
                        // Wait before retry
                        sleep($waitTime);
                        
                        // Retry finding user by customer ID
                        $user = User::where('chargebee_subscription_id', $subscription['id'])->first();
                        
                        if ($user) {
                            Log::info('User found after retry attempt ' . $attempt, [
                                'user_id' => $user->id,
                                'customer_id' => $subscription['customer_id'],
                                'attempts_taken' => $attempt
                            ]);
                            break;
                        }
                        
                        // Also try by email on each retry
                        if (isset($subscription['customer_email'])) {
                            $user = User::where('email', $subscription['customer_email'])->first();
                            if ($user) {
                                $user->update(['chargebee_customer_id' => $subscription['customer_id']]);
                                Log::info('User found by email on retry attempt ' . $attempt, [
                                    'user_id' => $user->id,
                                    'customer_id' => $subscription['customer_id'],
                                    'attempts_taken' => $attempt
                                ]);
                                break;
                            }
                        }
                        
                        Log::info("Retry attempt {$attempt} failed, user still not found", [
                            'customer_id' => $subscription['customer_id']
                        ]);
                    }
                }

                if (!$user) {
                    Log::warning('User not found for customer ID after retry: ' . $subscription['customer_id']);
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
                        // 'current_term_start' => $subscription['current_term_start'] ?? null,
                        // 'current_term_end' => $subscription['current_term_end'] ?? null,
                        'next_payment_date' => $subscription['next_billing_at'] ?? null,
                        
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
    private function handlePaymentSucceeded(array $transaction, ?array $subscription = null): void
    {
        Log::info('Processing payment succeeded', ['transaction_id' => $transaction['id']]);
        // $user = User::where('chargebee_customer_id', $transaction['customer_id'])->first();
        try {
            $plan = DB::table('plan')->where('name', 'Basic Plan')->first();
            $subscriptionRecord = Subscription::where('gocardless_subscription_id', $transaction['subscription_id'])->first();
            // Store transaction record
            Payment::updateOrCreate(
                ['gocardless_payment_id' => $transaction['id']],
                [
                    'gocardless_customer_id' => $transaction['customer_id'],
                    'subscription_id' => $subscriptionRecord->id ?? null ,
                    'amount' => $transaction['amount'],
                    'company_plan_id' => 1,
                    'plan_id' => $plan->id,
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

            if ($subscription) {
                $subscriptionRecord = Subscription::where('gocardless_subscription_id', $subscription['id'])->first();
                if ($subscriptionRecord) {
                    $subscriptionRecord->update([
                        'next_payment_date' => $subscription['next_billing_at'] ?? null,
                        // You can update other fields if needed
                    ]);
                    Log::info('Updated subscription next_payment_date after payment succeeded', [
                        'subscription_id' => $subscription['id'],
                        'next_payment_date' => $subscription['next_billing_at'] ?? null,
                    ]);
                }
            }

            // Update user payment status - try multiple ways to find user
            $user = User::where('chargebee_customer_id', $transaction['customer_id'])->first();
            
            // If user not found by customer ID, try to find by subscription ID
            if (!$user && isset($transaction['subscription_id'])) {
                Log::info('User not found by customer ID for payment, trying to find by subscription ID', [
                    'customer_id' => $transaction['customer_id'],
                    'subscription_id' => $transaction['subscription_id']
                ]);
                $user = User::where('chargebee_subscription_id', $transaction['subscription_id'])->first();
                
                // If found by subscription ID, update the user with the customer ID
                if ($user) {
                    $user->update(['chargebee_customer_id' => $transaction['customer_id']]);
                    Log::info('Updated user with chargebee_customer_id from payment', [
                        'user_id' => $user->id,
                        'customer_id' => $transaction['customer_id']
                    ]);
                }
            }
            
            // If user not found by customer ID, try to find by email from transaction metadata
            if (!$user && isset($transaction['customer_email'])) {
                Log::info('User not found by customer ID for payment, trying to find by email', [
                    'customer_id' => $transaction['customer_id'],
                    'email' => $transaction['customer_email']
                ]);
                $user = User::where('email', $transaction['customer_email'])->first();
                
                // If found by email, update the user with the customer ID
                if ($user) {
                    $user->update(['chargebee_customer_id' => $transaction['customer_id']]);
                    Log::info('Updated user with chargebee_customer_id from payment', [
                        'user_id' => $user->id,
                        'customer_id' => $transaction['customer_id']
                    ]);
                }
            }

            // If still no user found, retry with exponential backoff
            if (!$user) {
                Log::info('User still not found for payment, starting retry mechanism...', [
                    'customer_id' => $transaction['customer_id']
                ]);
                
                // Retry mechanism with exponential backoff
                $maxRetries = 5;
                $baseWaitTime = 2; // Start with 2 seconds
                
                for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
                    $waitTime = $baseWaitTime * $attempt; // 2, 4, 6, 8, 10 seconds
                    
                    Log::info("Payment retry attempt {$attempt}/{$maxRetries}, waiting {$waitTime} seconds...", [
                        'customer_id' => $transaction['customer_id'],
                        'wait_time' => $waitTime
                    ]);
                    
                    // Wait before retry
                    sleep($waitTime);
                    
                    // Retry finding user by customer ID
                    $user = User::where('chargebee_customer_id', $transaction['customer_id'])->first();
                    
                    if ($user) {
                        Log::info('User found for payment after retry attempt ' . $attempt, [
                            'user_id' => $user->id,
                            'customer_id' => $transaction['customer_id'],
                            'attempts_taken' => $attempt
                        ]);
                        break;
                    }
                    
                    // Also try by subscription ID on each retry
                    if (isset($transaction['subscription_id'])) {
                        $user = User::where('chargebee_subscription_id', $transaction['subscription_id'])->first();
                        if ($user) {
                            $user->update(['chargebee_customer_id' => $transaction['customer_id']]);
                            Log::info('User found by subscription ID for payment on retry attempt ' . $attempt, [
                                'user_id' => $user->id,
                                'customer_id' => $transaction['customer_id'],
                                'attempts_taken' => $attempt
                            ]);
                            break;
                        }
                    }
                    
                    // Also try by email on each retry
                    if (isset($transaction['customer_email'])) {
                        $user = User::where('email', $transaction['customer_email'])->first();
                        if ($user) {
                            $user->update(['chargebee_customer_id' => $transaction['customer_id']]);
                            Log::info('User found by email for payment on retry attempt ' . $attempt, [
                                'user_id' => $user->id,
                                'customer_id' => $transaction['customer_id'],
                                'attempts_taken' => $attempt
                            ]);
                            break;
                        }
                    }
                    
                    Log::info("Payment retry attempt {$attempt} failed, user still not found", [
                        'customer_id' => $transaction['customer_id']
                    ]);
                }
            }

            if ($user) {
                $user->update(['payment_status' => 'success']);
                Log::info('Updated user payment status to success', [
                    'user_id' => $user->id,
                    'transaction_id' => $transaction['id']
                ]);
            } else {
                Log::warning('User not found for payment transaction', [
                    'customer_id' => $transaction['customer_id'],
                    'transaction_id' => $transaction['id']
                ]);
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