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
use Fleetbase\Models\FailedWebhook;
use Fleetbase\Models\ProcessedWebhook;
use Fleetbase\Mail\InvoiceGeneratedMail;
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
            $response =$this->handleWebhookEvent($event);

            // Store webhook ID to prevent duplicates
            if ($webhookId && $response->getStatusCode() === 200) {
                $this->storeWebhookId($webhookId, $event);
            }

            // return response('OK', 200);
            return $response;

        } catch (\Exception $e) {
            DB::table('failed_webhooks')->insert([
                'event_type'    => $event['event_type'] ?? 'unknown',
                'event_data'    => json_encode($event ?? []),
                'error_message' => $e->getMessage(),
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);
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
    private function handleWebhookEvent(array $event)
    {
        $eventType = $event['event_type'];
        $content = $event['content'];

        switch ($eventType) {
            case 'subscription_created':
                try {
                    $this->handleSubscriptionCreated($content['subscription']);
                    return response()->json(['status' => 'success'], 200);
                } catch (\InvalidArgumentException $e) {
                    Log::error('Invalid subscription data: ' . $e->getMessage());
                    return response()->json(['error' => $e->getMessage()], 400);
                } catch (\Exception $e) {
                    Log::error('Subscription creation failed: ' . $e->getMessage());
                    return response()->json(['error' => 'Failed to process subscription'], 500);
                }

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
                try {
                    $this->handlePaymentSucceeded($content['transaction'], $content['subscription'] ?? null, $content['invoice'] ?? null);
                    return response()->json(['status' => 'success'], 200);
                } catch (\InvalidArgumentException $e) {
                    Log::error('Invalid payment data: ' . $e->getMessage());
                    return response()->json(['error' => $e->getMessage()], 400);
                } catch (\Exception $e) {
                    Log::error('Payment processing failed: ' . $e->getMessage());
                    return response()->json(['error' => 'Failed to process payment'], 500);
                }

                case 'payment_failed':
                    try {
                        $this->handlePaymentFailed($content['transaction']);
                        return response()->json(['status' => 'success'], 200);
                    } catch (\Exception $e) {
                        Log::error('Payment failure processing failed: ' . $e->getMessage());
                        return response()->json(['error' => 'Failed to process payment failure'], 500);
                    }

            case 'invoice_generated':
                try {
                    // $this->handleInvoiceGenerated($content['invoice']);
                    // Just log the invoice generation, don't send email yet
                    Log::info('Invoice generated', [
                        'invoice_id' => $content['invoice']['id'] ?? 'unknown',
                        'invoice_number' => $content['invoice']['invoice_number'] ?? 'unknown',
                        'amount' => $content['invoice']['amount'] ?? 0,
                        'status' => $content['invoice']['status'] ?? 'unknown'
                    ]);
                    return response()->json(['status' => 'success'], 200);
                } catch (\Exception $e) {
                    Log::error('Invoice generation processing failed: ' . $e->getMessage());
                    return response()->json(['error' => 'Failed to process invoice generation'], 500);
                }

            // case 'customer_created':
            //     $this->handleCustomerCreated($content['customer']);
            //     break;

            default:
            Log::info('Unhandled Chargebee event type: ' . $eventType);
            return response()->json(['status' => 'ignored'], 200);
        }
    }

    /**
     * Handle subscription created
     */
    private function handleSubscriptionCreated(array $subscription): void
    {
        Log::info('Processing subscription created', ['subscription_id' => $subscription['id'] ?? 'unknown']);

        try {
            // Validate required subscription data
            if (!isset($subscription['id']) || !isset($subscription['customer_id'])) {
                throw new \InvalidArgumentException('Missing required subscription data: id or customer_id', 400);
            }

            DB::transaction(function () use ($subscription) {
                // Find user by subscription ID first
                $user = User::where('chargebee_subscription_id', $subscription['id'])->first();

                // If user not found by subscription ID, try to find by customer ID
                if (!$user) {
                    Log::info('User not found by subscription ID, trying to find by customer ID', [
                        'customer_id' => $subscription['customer_id'],
                        'subscription_id' => $subscription['id']
                    ]);
                    $user = User::where('chargebee_customer_id', $subscription['customer_id'])->first();
                }

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
                if (!$user && isset($subscription['metadata']) && isset($subscription['metadata']['user_uuid'])) {
                    Log::info('User not found by email, trying to find by UUID from metadata', [
                        'user_uuid' => $subscription['metadata']['user_uuid']
                    ]);
                    $user = User::where('uuid', $subscription['metadata']['user_uuid'])->first();
                    if ($user) {
                        $user->update(['chargebee_customer_id' => $subscription['customer_id']]);
                        Log::info('Found user by UUID from metadata and updated customer ID', [
                            'user_id' => $user->id,
                            'customer_id' => $subscription['customer_id']
                        ]);
                    }
                }

                // If still no user found, make final attempts without delays
                if (!$user) {
                    Log::info('User still not found, making final attempts...', [
                        'customer_id' => $subscription['customer_id']
                    ]);
                    
                    // Try one more time by customer ID
                    $user = User::where('chargebee_customer_id', $subscription['customer_id'])->first();
                    
                    // Try one more time by subscription ID
                    if (!$user) {
                        $user = User::where('chargebee_subscription_id', $subscription['id'])->first();
                    }
                    
                    // Try one more time by email
                    if (!$user && isset($subscription['customer_email'])) {
                        $user = User::where('email', $subscription['customer_email'])->first();
                        if ($user) {
                            $user->update(['chargebee_customer_id' => $subscription['customer_id']]);
                            Log::info('User found by email on final attempt', [
                                'user_id' => $user->id,
                                'customer_id' => $subscription['customer_id']
                            ]);
                        }
                    }
                }

                // If no user found after all attempts, throw exception
                if (!$user) {
                    $errorMessage = 'User not found for subscription creation. Customer ID: ' . ($subscription['customer_id'] ?? 'unknown') . '. Subscription ID: ' . ($subscription['id'] ?? 'unknown');
                    Log::error('Subscription creation failed: ' . $errorMessage);
                    throw new \InvalidArgumentException($errorMessage, 400);
                }

                // Create or update subscription record
                try {
                    Subscription::updateOrCreate(
                        ['gocardless_subscription_id' => $subscription['id']],
                        [
                            'user_uuid' => $user->uuid ?? null,
                            'company_uuid' => $user->company_uuid ?? null,
                            'payment_id' => null,
                            'gocardless_mandate_id' => $subscription['customer_id'] ?? null,
                            // 'chargebee_customer_id' => $subscription['customer_id'],
                            'interval_unit' => 'monthly',
                            'interval' => $subscription['billing_period'] ?? 1,
                            'day_of_month' => 1,
                            'start_date' => $subscription['activated_at'] ?? null,
                            'end_date' => $subscription['current_term_end'] ?? null,
                            'status' => $subscription['status'] ?? 'active',
                            // 'current_term_start' => $subscription['current_term_start'] ?? null,
                            // 'current_term_end' => $subscription['current_term_end'] ?? null,
                            'next_payment_date' => $subscription['next_billing_at'] ?? null,
                            'created_by_id' => $user->id,
                        ]
                    );
                } catch (\Exception $e) {
                    Log::error('Failed to create/update subscription record: ' . $e->getMessage(), [
                        'subscription_id' => $subscription['id'] ?? 'unknown',
                        'user_id' => $user->id ?? 'unknown'
                    ]);
                    throw new \InvalidArgumentException('Failed to process subscription record: ' . $e->getMessage(), 400);
                }

                // Update user subscription status
                try {
                    $user->update([
                        'subscription_status' => 'active',
                        'subscribed_at' => now()
                    ]);
                    Log::info('Updated user subscription status', [
                        'user_id' => $user->id,
                        'subscription_status' => 'active'
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to update user subscription status: ' . $e->getMessage(), [
                        'user_id' => $user->id ?? 'unknown'
                    ]);
                    // Continue processing even if user update fails
                }

                // Send welcome email
                // Mail::to($user->email)->send(new WelcomeMail($user, $subscription));

                Log::info('Subscription created successfully', [
                    'user_id' => $user->id,
                    'subscription_id' => $subscription['id']
                ]);
            });

        } catch (\InvalidArgumentException $e) {
            // Re-throw the custom exception to be handled by the calling webhook handler
            throw $e;
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
    private function handlePaymentSucceeded(array $transaction, ?array $subscription = null, ?array $invoice = null): void
    {
        Log::info('Processing payment succeeded', ['transaction_id' => $transaction['id'] ?? 'unknown'], $subscription);
        try {
            // Validate required transaction data
            if (!isset($transaction['id']) || !isset($transaction['customer_id'])) {
                throw new \InvalidArgumentException('Missing required transaction data: id or customer_id', 400);
            }

            $user_new = null;
            if (is_array($subscription) && isset($subscription['id'])) {
                $user_new = User::where('chargebee_subscription_id', $subscription['id'])->first();
            }
            Log::info('user_new', ['user_new' => $user_new ? $user_new->id : null]);
            
            $plan = DB::table('plan')->where('name', 'Basic Plan')->first();
            Log::info('plan', ['plan' => $plan ? $plan->id : null]);
            
            $subscriptionRecord = null;
            if (isset($transaction['subscription_id'])) {
                $subscriptionRecord = Subscription::where('gocardless_subscription_id', $transaction['subscription_id'])->first();
            }
            Log::info('subscriptionRecord', ['subscriptionRecord' => $subscriptionRecord ? $subscriptionRecord->id : null]);
            // If user has subscription_id but subscription record does not exist, create it
            if (!$subscriptionRecord && $user_new && $subscription && isset($subscription['id'])) {
                try {
                    $subscriptionRecord = Subscription::create([
                        'gocardless_subscription_id' => $subscription['id'],
                        'user_uuid' => $user_new->uuid ?? null,
                        'company_uuid' => $user_new->company_uuid ?? null,
                        'payment_id' => null,
                        'gocardless_mandate_id' => $subscription['customer_id'] ?? null,
                        'interval_unit' => 'monthly',
                        'interval' => $subscription['billing_period'] ?? 1,
                        'day_of_month' => 1,
                        'start_date' => $subscription['activated_at'] ?? null,
                        'end_date' => $subscription['current_term_end'] ?? null,
                        'status' => $subscription['status'] ?? 'active',
                        'next_payment_date' => $subscription['next_billing_at'] ?? null,
                        'created_by_id' => $user_new->id,
                    ]);
                    Log::info('Recovered missing subscription in payment_succeeded', [
                        'subscription_id' => $subscription['id'],
                        'user_id' => $user_new->id,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to create subscription record: ' . $e->getMessage(), [
                        'subscription_id' => $subscription['id'] ?? 'unknown',
                        'user_id' => $user_new->id ?? 'unknown'
                    ]);
                    // Continue processing even if subscription creation fails
                }
            }

            // Store transaction record
            Payment::updateOrCreate(
                ['gocardless_payment_id' => $transaction['id']],
                [
                    'gocardless_customer_id' => $transaction['customer_id'],
                    'subscription_id' => $subscriptionRecord ? $subscriptionRecord->id : null,
                    'amount' => $transaction['amount'],
                    'company_plan_id' => null,
                    'plan_id' => $plan ? $plan->id : null,
                    'total_amount' => $transaction['amount'],
                    'currency_code' => $transaction['currency_code'],
                    'status' => 'completed',
                    // 'type' => $transaction['type'],
                    'paid_at' => $transaction['date'] ?? now(),
                    'payment_metadata' => json_encode($transaction),
                    'payment_method' => 'direct_debit',
                    'payment_type' => 'subscription',
                    'created_by_id' => $user_new ? $user_new->id : null,
                    'is_recurring' => 1,
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

            // If still no user found, try one more time without delays
            if (!$user) {
                Log::info('User still not found for payment, making final attempts...', [
                    'customer_id' => $transaction['customer_id']
                ]);
                
                // Try one more time by customer ID
                $user = User::where('chargebee_customer_id', $transaction['customer_id'])->first();
                
                // Try one more time by subscription ID
                if (!$user && isset($transaction['subscription_id'])) {
                    $user = User::where('chargebee_subscription_id', $transaction['subscription_id'])->first();
                    if ($user) {
                        $user->update(['chargebee_customer_id' => $transaction['customer_id']]);
                        Log::info('User found by subscription ID on final attempt', [
                            'user_id' => $user->id,
                            'customer_id' => $transaction['customer_id']
                        ]);
                    }
                }
                
                // Try one more time by email
                if (!$user && isset($transaction['customer_email'])) {
                    $user = User::where('email', $transaction['customer_email'])->first();
                    if ($user) {
                        $user->update(['chargebee_customer_id' => $transaction['customer_id']]);
                        Log::info('User found by email on final attempt', [
                            'user_id' => $user->id,
                            'customer_id' => $transaction['customer_id']
                        ]);
                    }
                }
            }

            if ($user) {
                $user->update(['payment_status' => 'success']);
                Log::info('Updated user payment status to success', [
                    'user_id' => $user->id,
                    'transaction_id' => $transaction['id']
                ]);
            } else {
                Log::warning('User not found for payment transaction after all retry attempts', [
                    'customer_id' => $transaction['customer_id'],
                    'transaction_id' => $transaction['id']
                ]);
                
                // Return 400 status with specific error message instead of continuing
                $errorMessage = 'User not found for customer ID: ' . $transaction['customer_id'] . '. Transaction ID: ' . $transaction['id'];
                Log::error('Payment processing failed: ' . $errorMessage);
                
                // Throw a custom exception that should be caught by your webhook handler
                // and return a 400 status code
                throw new \InvalidArgumentException($errorMessage, 400);
            }

            // Send paid invoice email after successful payment
            $this->sendPaidInvoiceEmail($invoice, $user);

            Log::info('Payment processed successfully', [
                'transaction_id' => $transaction['id']
            ]);

        } catch (\InvalidArgumentException $e) {
            // Re-throw the custom exception to be handled by the calling webhook handler
            throw $e;
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
        Log::info('Processing payment failed', ['transaction_id' => $transaction['id'] ?? 'unknown']);

        try {
            // Validate required transaction data
            if (!isset($transaction['id']) || !isset($transaction['customer_id'])) {
                throw new \InvalidArgumentException('Missing required transaction data: id or customer_id', 400);
            }

            // Find user by subscription ID first
            $user = null;
            if (isset($transaction['subscription_id'])) {
                $user = User::where('chargebee_subscription_id', $transaction['subscription_id'])->first();
            }

            // If user not found by subscription ID, try to find by customer ID
            if (!$user) {
                Log::info('User not found by subscription ID for failed payment, trying to find by customer ID', [
                    'customer_id' => $transaction['customer_id'],
                    'subscription_id' => $transaction['subscription_id'] ?? 'not provided'
                ]);
                $user = User::where('chargebee_customer_id', $transaction['customer_id'])->first();
            }

            // If user not found by customer ID, try to find by email from transaction metadata
            if (!$user && isset($transaction['customer_email'])) {
                Log::info('User not found by customer ID for failed payment, trying to find by email', [
                    'customer_id' => $transaction['customer_id'],
                    'email' => $transaction['customer_email']
                ]);
                $user = User::where('email', $transaction['customer_email'])->first();
                
                // If found by email, update the user with the customer ID
                if ($user) {
                    $user->update(['chargebee_customer_id' => $transaction['customer_id']]);
                    Log::info('Updated user with chargebee_customer_id from failed payment', [
                        'user_id' => $user->id,
                        'customer_id' => $transaction['customer_id']
                    ]);
                }
            }

            // If still no user found, throw exception
            if (!$user) {
                $errorMessage = 'User not found for failed payment. Customer ID: ' . ($transaction['customer_id'] ?? 'unknown') . '. Transaction ID: ' . ($transaction['id'] ?? 'unknown');
                Log::error('Failed payment processing failed: ' . $errorMessage);
                throw new \InvalidArgumentException($errorMessage, 400);
            }

            // Find plan
            $plan = DB::table('plan')->where('name', 'Basic Plan')->first();
            if (!$plan) {
                $errorMessage = 'Basic Plan not found for failed payment processing. Transaction ID: ' . ($transaction['id'] ?? 'unknown');
                Log::error('Failed payment processing failed: ' . $errorMessage);
                throw new \InvalidArgumentException($errorMessage, 400);
            }

            // Find subscription record
            $subscriptionRecord = null;
            if (isset($transaction['subscription_id'])) {
                $subscriptionRecord = Subscription::where('gocardless_subscription_id', $transaction['subscription_id'])->first();
            }
            
            Log::info('Found data for failed payment processing', [
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'subscription_record' => $subscriptionRecord ? $subscriptionRecord->id : null
            ]);

            // Store failed transaction
            try {
                Payment::updateOrCreate(
                    ['gocardless_payment_id' => $transaction['id']],
                    [
                        'gocardless_customer_id' => $transaction['customer_id'] ?? null,
                        'subscription_id' => $subscriptionRecord ? $subscriptionRecord->id : null,
                        'amount' => $transaction['amount'] ?? 0,
                        'company_plan_id' => null,
                        'plan_id' => $plan->id,
                        'total_amount' => $transaction['amount'] ?? 0,
                        'currency_code' => $transaction['currency_code'] ?? 'USD',
                        'status' => 'failed',
                        // 'type' => $transaction['type'],
                        'failed_at' => isset($transaction['date']) ? $transaction['date'] : now(),
                        'payment_metadata' => json_encode($transaction),
                        'payment_method' => 'direct_debit',
                        'payment_type' => 'subscription',
                        'created_by_id' => $user->id,
                        'failure_reason' => $transaction['failure_reason'] ?? null,
                        'is_recurring' => 1,
                        // 'gateway_transaction_id' => $transaction['gateway_transaction_id'] ?? null,
                    ]
                );
            } catch (\Exception $e) {
                Log::error('Failed to create/update failed payment record: ' . $e->getMessage(), [
                    'transaction_id' => $transaction['id'] ?? 'unknown'
                ]);
                throw new \InvalidArgumentException('Failed to process failed payment record: ' . $e->getMessage(), 400);
            }

            // Update user payment status
            try {
                $user->update(['payment_status' => 'failed']);
                Log::info('Updated user payment status to failed', [
                    'user_id' => $user->id,
                    'transaction_id' => $transaction['id']
                ]);

                // Send payment failed email
                // Mail::to($user->email)->send(new PaymentFailedMail($user, $transaction));
            } catch (\Exception $e) {
                Log::error('Failed to update user payment status: ' . $e->getMessage(), [
                    'user_id' => $user->id ?? 'unknown',
                    'transaction_id' => $transaction['id'] ?? 'unknown'
                ]);
                // Continue processing even if user update fails
            }

            Log::info('Payment failure processed successfully', [
                'transaction_id' => $transaction['id'],
                'user_id' => $user->id
            ]);

        } catch (\InvalidArgumentException $e) {
            // Re-throw the custom exception to be handled by the calling webhook handler
            throw $e;
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
        Log::info('Processing invoice generated', ['invoice_id' => $invoice['id'] ?? 'unknown']);

        try {
            // Validate required invoice data
            if (!isset($invoice['id'])) {
                throw new \InvalidArgumentException('Missing required invoice data: id', 400);
            }

            // Get customer information if available
            $customer = [];
            if (isset($invoice['customer'])) {
                $customer = $invoice['customer'];
            }

            // Get support email from environment variable
            $supportEmail = config('services.support_emails');
            
            if (!$supportEmail) {
                Log::warning('SUPPORT_EMAIL not configured in environment variables', [
                    'invoice_id' => $invoice['id']
                ]);
                return;
            }

            // Send invoice notification to support
            try {
                Mail::to($supportEmail)->send(new InvoiceGeneratedMail($invoice, $customer));
                
                Log::info('Invoice notification sent to support successfully', [
                    'invoice_id' => $invoice['id'],
                    'support_email' => $supportEmail
                ]);
            } catch (\Exception $e) {
                Log::error('Failed to send invoice notification to support: ' . $e->getMessage(), [
                    'invoice_id' => $invoice['id'],
                    'support_email' => $supportEmail
                ]);
                // Don't throw the exception to avoid webhook failure
            }

            Log::info('Invoice processed successfully', [
                'invoice_id' => $invoice['id']
            ]);

        } catch (\InvalidArgumentException $e) {
            // Re-throw the custom exception to be handled by the calling webhook handler
            throw $e;
        } catch (\Exception $e) {
            Log::error('Failed to handle invoice generated: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Send paid invoice email after successful payment
     */
    private function sendPaidInvoiceEmail(?array $invoice, $user): void
    {
        try {
            // Check if invoice data is available
            if (!$invoice) {
                Log::info('No invoice data provided, skipping invoice email');
                return;
            }

            $invoiceId = $invoice['id'] ?? null;
            if (!$invoiceId) {
                Log::info('No invoice ID found in invoice data, skipping invoice email');
                return;
            }

            // Get support email from environment variable
            $supportEmail = config('services.support_emails');
            if (!$supportEmail) {
                Log::warning('SUPPORT_EMAIL not configured, skipping invoice email', [
                    'invoice_id' => $invoiceId
                ]);
                return;
            }

            // Prepare invoice data for email (mark as paid since payment succeeded)
            $invoiceData = array_merge($invoice, [
                'status' => 'paid',
                'paid_at' => time(),
            ]);

            // Prepare customer data
            $customer = [
                'id' => $user->chargebee_customer_id ?? 'unknown',
                'first_name' => $user->first_name ?? '',
                'last_name' => $user->last_name ?? '',
                'email' => $user->email ?? '',
                'company' => $user->company_name ?? '',
                'company_uuid' => $user->company_uuid ?? 'unknown',
            ];

            // Log::info('Sending paid invoice email', [
            //     'invoice_id' => $invoiceId,
            //     'customer_email' => $customer['email'],
            //     'amount' => $invoiceData['amount'] ?? 0
            // ]);

            // Send the paid invoice email
            Mail::to($supportEmail)->send(new InvoiceGeneratedMail($invoiceData, $customer));
            
            // Log::info('Paid invoice email sent successfully', [
            //     'invoice_id' => $invoiceId,
            //     'support_email' => $supportEmail
            // ]);

        } catch (\Exception $e) {
            Log::error('Failed to send paid invoice email', [
                'invoice_id' => $invoice['id'] ?? 'unknown',
                'error' => $e->getMessage()
            ]);
            // Don't throw the exception to avoid webhook failure
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