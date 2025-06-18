<?php

namespace App\Services;

use GoCardlessPro\Client;
use GoCardlessPro\Environment;
use GoCardlessPro\Core\Exception\GoCardlessProException;
use GoCardlessPro\Core\Exception\InvalidApiUsageException;
use GoCardlessPro\Core\Exception\InvalidStateException;
use GoCardlessPro\Core\Exception\ValidationFailedException;
use Illuminate\Support\Facades\Log;
use Exception;

class GoCardlessService
{
    protected Client $client;
    protected string $environment;

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
     * 
     * @param array $customerData Customer data for creation
     * @return object GoCardless customer object
     * @throws GoCardlessProException When GoCardless API errors occur
     * @throws Exception For any other unexpected errors
     */
    public function createCustomer(array $customerData): object
    {
        try {
            $customer = $this->client->customers()->create([
                'params' => $customerData
            ]);

            Log::info('GoCardless customer created', ['customer_id' => $customer->id]);
            return $customer;
        } catch (ValidationFailedException $e) {
            Log::error('GoCardless customer creation failed - validation error', [
                'error' => $e->getMessage(),
                'errors' => $e->getErrors()
            ]);
            throw $e;
        } catch (InvalidApiUsageException $e) {
            Log::error('GoCardless customer creation failed - invalid API usage', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        } catch (GoCardlessProException $e) {
            Log::error('GoCardless customer creation failed - API error', [
                'error' => $e->getMessage(),
                'request_id' => $e->getRequestId() ?? 'unknown'
            ]);
            throw $e;
        } catch (Exception $e) {
            Log::error('GoCardless customer creation failed - unexpected error', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Create a customer bank account
     * 
     * @param array $bankAccountData Bank account data for creation
     * @return object GoCardless bank account object
     * @throws GoCardlessProException When GoCardless API errors occur
     * @throws Exception For any other unexpected errors
     */
    public function createCustomerBankAccount(array $bankAccountData): object
    {
        try {
            $bankAccount = $this->client->customer_bank_accounts()->create([
                'params' => $bankAccountData
            ]);

            Log::info('GoCardless bank account created', ['bank_account_id' => $bankAccount->id]);
            return $bankAccount;
        } catch (ValidationFailedException $e) {
            Log::error('GoCardless bank account creation failed - validation error', [
                'error' => $e->getMessage(),
                'errors' => $e->getErrors()
            ]);
            throw $e;
        } catch (InvalidApiUsageException $e) {
            Log::error('GoCardless bank account creation failed - invalid API usage', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        } catch (GoCardlessProException $e) {
            Log::error('GoCardless bank account creation failed - API error', [
                'error' => $e->getMessage(),
                'request_id' => $e->getRequestId() ?? 'unknown'
            ]);
            throw $e;
        } catch (Exception $e) {
            Log::error('GoCardless bank account creation failed - unexpected error', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Create a mandate
     * 
     * @param array $mandateData Mandate data for creation
     * @return object GoCardless mandate object
     * @throws GoCardlessProException When GoCardless API errors occur
     * @throws Exception For any other unexpected errors
     */
    public function createMandate(array $mandateData): object
    {
        try {
            $mandate = $this->client->mandates()->create([
                'params' => $mandateData
            ]);

            Log::info('GoCardless mandate created', ['mandate_id' => $mandate->id]);
            return $mandate;
        } catch (ValidationFailedException $e) {
            Log::error('GoCardless mandate creation failed - validation error', [
                'error' => $e->getMessage(),
                'errors' => $e->getErrors()
            ]);
            throw $e;
        } catch (InvalidStateException $e) {
            Log::error('GoCardless mandate creation failed - invalid state', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        } catch (GoCardlessProException $e) {
            Log::error('GoCardless mandate creation failed - API error', [
                'error' => $e->getMessage(),
                'request_id' => $e->getRequestId() ?? 'unknown'
            ]);
            throw $e;
        } catch (Exception $e) {
            Log::error('GoCardless mandate creation failed - unexpected error', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Create a payment
     * 
     * @param array $paymentData Payment data for creation
     * @return object GoCardless payment object
     * @throws GoCardlessProException When GoCardless API errors occur
     * @throws Exception For any other unexpected errors
     */
    public function createPayment(array $paymentData): object
    {
        try {
            $payment = $this->client->payments()->create([
                'params' => $paymentData
            ]);

            Log::info('GoCardless payment created', ['payment_id' => $payment->id]);
            return $payment;
        } catch (ValidationFailedException $e) {
            Log::error('GoCardless payment creation failed - validation error', [
                'error' => $e->getMessage(),
                'errors' => $e->getErrors()
            ]);
            throw $e;
        } catch (InvalidStateException $e) {
            Log::error('GoCardless payment creation failed - invalid state', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        } catch (GoCardlessProException $e) {
            Log::error('GoCardless payment creation failed - API error', [
                'error' => $e->getMessage(),
                'request_id' => $e->getRequestId() ?? 'unknown'
            ]);
            throw $e;
        } catch (Exception $e) {
            Log::error('GoCardless payment creation failed - unexpected error', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Get a payment by ID
     * 
     * @param string $paymentId The payment ID to retrieve
     * @return object GoCardless payment object
     * @throws GoCardlessProException When GoCardless API errors occur
     * @throws Exception For any other unexpected errors
     */
    public function getPayment(string $paymentId): object
    {
        try {
            return $this->client->payments()->get($paymentId);
        } catch (GoCardlessProException $e) {
            Log::error('GoCardless payment retrieval failed - API error', [
                'payment_id' => $paymentId,
                'error' => $e->getMessage(),
                'request_id' => $e->getRequestId() ?? 'unknown'
            ]);
            throw $e;
        } catch (Exception $e) {
            Log::error('GoCardless payment retrieval failed - unexpected error', [
                'payment_id' => $paymentId, 
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Get all payments with optional filters
     * 
     * @param array $params Optional filter parameters
     * @return object GoCardless payments list object
     * @throws GoCardlessProException When GoCardless API errors occur
     * @throws Exception For any other unexpected errors
     */
    public function getPayments(array $params = []): object
    {
        try {
            return $this->client->payments()->list(['params' => $params]);
        } catch (InvalidApiUsageException $e) {
            Log::error('GoCardless payments list failed - invalid API usage', [
                'error' => $e->getMessage(),
                'params' => $params
            ]);
            throw $e;
        } catch (GoCardlessProException $e) {
            Log::error('GoCardless payments list failed - API error', [
                'error' => $e->getMessage(),
                'request_id' => $e->getRequestId() ?? 'unknown'
            ]);
            throw $e;
        } catch (Exception $e) {
            Log::error('GoCardless payments list failed - unexpected error', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Cancel a payment
     * 
     * @param string $paymentId The payment ID to cancel
     * @return object GoCardless payment object
     * @throws GoCardlessProException When GoCardless API errors occur
     * @throws Exception For any other unexpected errors
     */
    public function cancelPayment(string $paymentId): object
    {
        try {
            $payment = $this->client->payments()->cancel($paymentId);
            Log::info('GoCardless payment cancelled', ['payment_id' => $paymentId]);
            return $payment;
        } catch (InvalidStateException $e) {
            Log::error('GoCardless payment cancellation failed - invalid state', [
                'payment_id' => $paymentId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        } catch (GoCardlessProException $e) {
            Log::error('GoCardless payment cancellation failed - API error', [
                'payment_id' => $paymentId,
                'error' => $e->getMessage(),
                'request_id' => $e->getRequestId() ?? 'unknown'
            ]);
            throw $e;
        } catch (Exception $e) {
            Log::error('GoCardless payment cancellation failed - unexpected error', [
                'payment_id' => $paymentId, 
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Create a subscription
     * 
     * @param array $subscriptionData Subscription data for creation
     * @return object GoCardless subscription object
     * @throws GoCardlessProException When GoCardless API errors occur
     * @throws Exception For any other unexpected errors
     */
    public function createSubscription(array $subscriptionData): object
    {
        try {
            $subscription = $this->client->subscriptions()->create([
                'params' => $subscriptionData
            ]);

            Log::info('GoCardless subscription created', ['subscription_id' => $subscription->id]);
            return $subscription;
        } catch (ValidationFailedException $e) {
            Log::error('GoCardless subscription creation failed - validation error', [
                'error' => $e->getMessage(),
                'errors' => $e->getErrors()
            ]);
            throw $e;
        } catch (InvalidStateException $e) {
            Log::error('GoCardless subscription creation failed - invalid state', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        } catch (GoCardlessProException $e) {
            Log::error('GoCardless subscription creation failed - API error', [
                'error' => $e->getMessage(),
                'request_id' => $e->getRequestId() ?? 'unknown'
            ]);
            throw $e;
        } catch (Exception $e) {
            Log::error('GoCardless subscription creation failed - unexpected error', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Verify webhook signature
     * 
     * @param string $requestBody The raw request body
     * @param string $signature The webhook signature to verify
     * @return bool True if signature is valid, false otherwise
     * @throws Exception For configuration or unexpected errors
     */
    public function verifyWebhook(string $requestBody, string $signature): bool
    {
        try {
            $webhookSecret = config('services.gocardless.webhook_secret');
            
            if (empty($webhookSecret)) {
                throw new Exception('GoCardless webhook secret not configured');
            }
            
            $expectedSignature = hash_hmac('sha256', $requestBody, $webhookSecret);
            
            return hash_equals($expectedSignature, $signature);
        } catch (Exception $e) {
            Log::error('GoCardless webhook verification failed', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Get the GoCardless client instance
     * 
     * @return Client The GoCardless client instance
     */
    public function getClient():  \GoCardlessPro\Client
    {
        return $this->client;
    }
}