<?php

namespace App\Services;

use GoCardlessPro\Client;
use GoCardlessPro\Environment;
use Illuminate\Support\Facades\Log;
use Exception;

class GoCardlessService
{
    protected $client;
    protected $environment;

    public function __construct()
    {
        $this->environment = config('services.gocardless.environment') === 'live' 
            ? Environment::LIVE 
            : Environment::SANDBOX;

        $this->client = new Client([
            'access_token' => config('services.gocardless.access_token'),
            'environment' => $this->environment
        ]);
    }

    /**
     * Create a customer
     */
    public function createCustomer($customerData)
    {
        try {
            $customer = $this->client->customers()->create([
                'params' => $customerData
            ]);

            Log::info('GoCardless customer created', ['customer_id' => $customer->id]);
            return $customer;
        } catch (Exception $e) {
            Log::error('GoCardless customer creation failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Create a customer bank account
     */
    public function createCustomerBankAccount($bankAccountData)
    {
        try {
            $bankAccount = $this->client->customer_bank_accounts()->create([
                'params' => $bankAccountData
            ]);

            Log::info('GoCardless bank account created', ['bank_account_id' => $bankAccount->id]);
            return $bankAccount;
        } catch (Exception $e) {
            Log::error('GoCardless bank account creation failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Create a mandate
     */
    public function createMandate($mandateData)
    {
        try {
            $mandate = $this->client->mandates()->create([
                'params' => $mandateData
            ]);

            Log::info('GoCardless mandate created', ['mandate_id' => $mandate->id]);
            return $mandate;
        } catch (Exception $e) {
            Log::error('GoCardless mandate creation failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Create a payment
     */
    public function createPayment($paymentData)
    {
        try {
            $payment = $this->client->payments()->create([
                'params' => $paymentData
            ]);

            Log::info('GoCardless payment created', ['payment_id' => $payment->id]);
            return $payment;
        } catch (Exception $e) {
            Log::error('GoCardless payment creation failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Get a payment by ID
     */
    public function getPayment($paymentId)
    {
        try {
            return $this->client->payments()->get($paymentId);
        } catch (Exception $e) {
            Log::error('GoCardless payment retrieval failed', [
                'payment_id' => $paymentId, 
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Get all payments with optional filters
     */
    public function getPayments($params = [])
    {
        try {
            return $this->client->payments()->list(['params' => $params]);
        } catch (Exception $e) {
            Log::error('GoCardless payments list failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Cancel a payment
     */
    public function cancelPayment($paymentId)
    {
        try {
            $payment = $this->client->payments()->cancel($paymentId);
            Log::info('GoCardless payment cancelled', ['payment_id' => $paymentId]);
            return $payment;
        } catch (Exception $e) {
            Log::error('GoCardless payment cancellation failed', [
                'payment_id' => $paymentId, 
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Create a subscription
     */
    public function createSubscription($subscriptionData)
    {
        try {
            $subscription = $this->client->subscriptions()->create([
                'params' => $subscriptionData
            ]);

            Log::info('GoCardless subscription created', ['subscription_id' => $subscription->id]);
            return $subscription;
        } catch (Exception $e) {
            Log::error('GoCardless subscription creation failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Verify webhook signature
     */
    public function verifyWebhook($requestBody, $signature)
    {
        $webhookSecret = config('services.gocardless.webhook_secret');
        $expectedSignature = hash_hmac('sha256', $requestBody, $webhookSecret);
        
        return hash_equals($expectedSignature, $signature);
    }

    /**
     * Get the GoCardless client instance
     */
    public function getClient()
    {
        return $this->client;
    }
}