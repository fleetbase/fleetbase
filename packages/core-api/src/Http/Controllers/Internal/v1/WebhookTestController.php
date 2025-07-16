<?php

namespace Fleetbase\Http\Controllers\Internal\v1;
use Illuminate\Routing\Controller;
use Illuminate\Http\Request;
use Fleetbase\Http\Controllers\Internal\v1\ChargebeeWebhookController;

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