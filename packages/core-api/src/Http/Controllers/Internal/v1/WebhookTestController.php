<?php

namespace Fleetbase\Http\Controllers\Internal\v1;
use Illuminate\Routing\Controller;
use Illuminate\Http\Request;
use Fleetbase\Http\Controllers\Internal\v1\ChargebeeWebhookController;
use Illuminate\Support\Facades\Log;

class WebhookTestController extends Controller
{
    public function testSubscriptionCreated()
    {
       
        $webhookData = [
            'event_type' => 'subscription_created',
            'content' => [
                'subscription' => [
                    'id' => 'test_sub_' . uniqid(),
                    'customer_id' => 'Sba9IKD4CxH1LaI70RCFXvtAaL8NA6xV',
                    'plan_id' => 'basic_plan',
                    'status' => 'active',
                    'activated_at' => time(),
                    "next_billing_at" => 1754724698,
                    "billing_period"=> 1
                ]
            ]
        ];

        return $this->simulateWebhook($webhookData);
    }

    public function testPaymentSucceeded()
    {
        $webhookData = [
            'event_type' => 'payment_succeeded',
            'content' => [
                'transaction' => [
                    'id' => 'test_txn_' . uniqid(),
                    'customer_id' => 'Sba9IKD4CxH1LaI70RCFXvtAaL8NA6xV',
                    'subscription_id' => 'test_sub_123',
                    "payment_source_id"=> "pm_169qXOUqR5iYpMgo",
                    'amount' => 2999, // $29.99
                    'currency_code' => 'USD',
                    'status' => 'success',
                    'type' => 'payment',
                    'date' => time(),
                ],
                "invoice"=>[
            "id" => "1",
            "customer_id" => "AzqJexUr6OdhS13ud",
            "subscription_id" => "AzZQ8XUr6OKFf12hF",
            "recurring" => true,
            "status" => "paid",
            "price_type" => "tax_exclusive",
            "date" => 1752656640,
            "due_date" => 1752656640,
            "net_term_days" => 0,
            "exchange_rate" => 1.0,
            "total" => 8550,
            "amount_paid" => 8550,
            "amount_adjusted" => 0,
            "write_off_amount" => 0,
            "credits_applied" => 0,
            "amount_due" => 0,
            "paid_at" => 1753262077,
            "updated_at" => 1753262077,
            "resource_version" => 1753262077165,
            "deleted" => false,
            "object" =>"invoice",
            "first_invoice" => true,
            "amount_to_collect" => 0,
            "round_off_amount" => 0,
            "new_sales_amount" => 8550,
            "has_advance_charges" => false,
            "currency_code" => "GBP",
            "base_currency_code" => "GBP",
            "generated_at" => 1752656640,
            "is_gifted" => false,
            "term_finalized" => true,
            "channel" => "web",
            "tax" => 0,
            
            "sub_total" => 8550,
           
                ]
            ]
        ];

        return $this->simulateWebhook($webhookData);
    }

    public function testPaymentFailed()
    {
        $webhookData = [
            'event_type' => 'payment_failed',
            'content' => [
                'transaction' => [
                    'id' => 'test_txn_' . uniqid(),
                    'customer_id' => 'test_customer_123',
                    'subscription_id' => 'test_sub_123',
                    'amount' => 2999,
                    'currency_code' => 'USD',
                    'status' => 'failed',
                    'type' => 'payment',
                    'date' => time(),
                    'failure_reason' => 'Card declined',
                ]
            ]
        ];

        return $this->simulateWebhook($webhookData);
    }

    public function testInvoiceGenerated()
    {
        Log::info('Testing invoice generated webhook');
        $webhookData = [
            'event_type' => 'invoice_generated',
            'content' => [
                'invoice' => [
                    'id' => '144',
                    'invoice_number' => '144',
                    'customer_id' => 'Sba9IKD4CxH1LaI70RCFXvtAaL8NA6xV',
                    'subscription_id' => 'test_sub_123',
                    'amount' => 2999, // $29.99 in cents
                    'currency_code' => 'USD',
                    'status' => 'paid',
                    'due_date' => time() + (30 * 24 * 60 * 60), // 30 days from now
                    'created_at' => time(),
                    // 'invoice_url' => 'https://chargebee.com/invoices/test_invoice_' . uniqid(),
                    // 'download_url' => 'https://chargebee.com/invoices/test_invoice_' . uniqid() . '/download',
                    'line_items' => [
                        [
                            'description' => 'Basic Plan - Monthly Subscription',
                            'amount' => 2999,
                            'quantity' => 1
                        ]
                    ],
                    'tax' => 0,
                    'billing_address' => '123 Main Street, Test City, TC 12345',
                    'customer' => [
                        'id' => 'Sba9IKD4CxH1LaI70RCFXvtAaL8NA6xV',
                        'first_name' => 'John',
                        'last_name' => 'Doe',
                        'email' => 'john.doe@example.com',
                        'company' => 'Test Company Inc.'
                    ]
                ]
            ]
        ];

        return $this->simulateWebhook($webhookData);
    }

    private function simulateWebhook($webhookData)
    {
        $payload = json_encode($webhookData);
        $secret = config('services.chargebee.webhook_secret') ?: 'test_secret';
        $signature = hash_hmac('sha256', $payload, $secret);

        $request = Request::create('/webhook/chargebee', 'POST', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_CHARGEBEE_SIGNATURE' => $signature,
            'HTTP_X_CHARGEBEE_WEBHOOK_ID' => 'test_webhook_' . uniqid(),
        ], $payload);

        $controller = new ChargebeeWebhookController();
        
        try {
            $response = $controller->handle($request);
            return response()->json([
                'status' => 'success',
                'webhook_status' => $response->getStatusCode(),
                'webhook_response' => $response->getContent(),
                'test_data' => $webhookData
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'test_data' => $webhookData
            ], 500);
        }
    }
}