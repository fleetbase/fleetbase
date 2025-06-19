<?php

namespace Fleetbase\Services;
// use GuzzleHttp\Client;
use GoCardlessPro\Client;
use GoCardlessPro\Environment;
use GoCardlessPro\Models\Payout;
use GoCardlessPro\Models\BankAccount;
use GoCardlessPro\Models\Payment;
use GoCardlessPro\Core\Exception\GoCardlessProException;
use GoCardlessPro\Core\Exception\InvalidApiUsageException;
use GoCardlessPro\Core\Exception\InvalidStateException;
use GoCardlessPro\Core\Exception\ValidationFailedException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Exception;

class GoCardlessBillingRequestService
{
    protected Client $client;
    protected string $environment;
    protected $apiUrl;
    protected $accessToken;
    private $baseUrl;
    private $headers;

    public function __construct()
    {
        $this->environment = config('services.gocardless.environment') === 'live' 
            ? Environment::LIVE 
            : Environment::SANDBOX;

        $this->accessToken = config('services.gocardless.access_token');

        if (!$this->accessToken) {
            Log::error('GoCardless access token is not set in config.');
            throw new Exception('GoCardless access token is not configured.');
        }
        $this->baseUrl = config('gocardless.environment') === 'live' 
            ? 'https://api.gocardless.com' 
            : 'https://api-sandbox.gocardless.com';

        // Initialize the GoCardless client
        $this->client = new Client([
            'access_token' => $this->accessToken,
            'environment' => $this->environment,
            'timeout' => 60, // Set HTTP timeout to 60 seconds
        ]);
        $this->headers = [
            'Authorization' => 'Bearer ' . $this->accessToken,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
            'GoCardless-Version' => '2015-07-06'
        ];
    }

    /**
     * Create billing request with payment amount displayed
     *
     * @param array $data
     * @return array
     * @throws Exception
     */
    public function createBillingRequest(array $data): array
    {
        $email = $data['customer']['email'] ?? null;
        $existingCustomer = null;

        // Check for existing customer
        if ($email) {
            $existingCustomer = $this->findCustomerByEmail($email);
        }

        // Build the billing request payload
        $payload = [
            'billing_requests' => [
                'payment_request' => [
                    'description' => $data['description'] ?? 'Payment',
                    'amount' => $data['amount'] * 100, // Convert to pence
                    'currency' => $data['currency'] ?? 'GBP',
                ],
                'mandate_request' => [
                    'scheme' => 'bacs', // or 'sepa_core' for SEPA
                ]
            ]
        ];

        // Add customer details
        if ($existingCustomer) {
            // Use existing customer
            $payload['billing_requests']['mandate_request']['links'] = [
                'customer' => $existingCustomer['id']
            ];
            
            Log::info("Using existing customer for billing request: {$email}");
        } else {
            // Create new customer
            $payload['billing_requests']['mandate_request']['customer'] = [
                'given_name' => $data['customer']['given_name'],
                'family_name' => $data['customer']['family_name'],
                'email' => $data['customer']['email'],
            ];
            
            // Add address if provided
            if (isset($data['customer']['address_line1'])) {
                $payload['billing_requests']['mandate_request']['customer']['address_line1'] = $data['customer']['address_line1'];
            }
            if (isset($data['customer']['city'])) {
                $payload['billing_requests']['mandate_request']['customer']['city'] = $data['customer']['city'];
            }
            if (isset($data['customer']['postal_code'])) {
                $payload['billing_requests']['mandate_request']['customer']['postal_code'] = $data['customer']['postal_code'];
            }
            if (isset($data['customer']['country_code'])) {
                $payload['billing_requests']['mandate_request']['customer']['country_code'] = $data['customer']['country_code'];
            }
            
            Log::info("Creating new customer for billing request: {$email}");
        }

        // Add metadata (max 3 properties)
        if (isset($data['metadata'])) {
            $metadata = array_filter($data['metadata'], function($value) {
                return $value !== null && $value !== '';
            });
            
            $metadata = array_map(function($value) {
                return (string) $value;
            }, $metadata);
            
            // Limit to 3 properties
            $metadata = array_slice($metadata, 0, 3, true);
            
            if (!empty($metadata)) {
                $payload['billing_requests']['metadata'] = $metadata;
            }
        }

        try {
            $response = Http::withHeaders($this->headers)
                ->post($this->baseUrl . '/billing_requests', $payload);

            if ($response->successful()) {
                return $response->json();
            }

            $errorBody = $response->json();
            $errorMessage = 'Failed to create billing request';
            
            if (isset($errorBody['error']['message'])) {
                $errorMessage .= ': ' . $errorBody['error']['message'];
            }

            throw new Exception($errorMessage);

        } catch (Exception $e) {
            Log::error('GoCardless Billing Request Error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Create billing request flow (the hosted page)
     *
     * @param string $billingRequestId
     * @param array $data
     * @return array
     * @throws Exception
     */
    public function createBillingRequestFlow(string $billingRequestId, array $data): array
    {
        $payload = [
            'billing_request_flows' => [
                'redirect_uri' => $data['success_redirect_url'],
                'exit_uri' => $data['exit_uri'] ?? $data['success_redirect_url'],
                'links' => [
                    'billing_request' => $billingRequestId
                ]
            ]
        ];

        // Add language if specified
        if (isset($data['language'])) {
            $payload['billing_request_flows']['language'] = $data['language'];
        }

        try {
            $response = Http::withHeaders($this->headers)
                ->post($this->baseUrl . '/billing_request_flows', $payload);

            if ($response->successful()) {
                return $response->json();
            }

            throw new Exception('Failed to create billing request flow: ' . $response->body());

        } catch (Exception $e) {
            Log::error('GoCardless Billing Request Flow Error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Complete billing request flow
     *
     * @param string $billingRequestFlowId
     * @return array
     * @throws Exception
     */
    public function completeBillingRequestFlow(string $billingRequestFlowId): array
    {
        try {
            $response = Http::withHeaders($this->headers)
                ->post($this->baseUrl . '/billing_request_flows/' . $billingRequestFlowId . '/actions/complete');

            if ($response->successful()) {
                return $response->json();
            }

            throw new Exception('Failed to complete billing request flow: ' . $response->body());

        } catch (Exception $e) {
            Log::error('GoCardless Complete Billing Request Flow Error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get billing request details
     *
     * @param string $billingRequestId
     * @return array|null
     */
    public function getBillingRequest(string $billingRequestId): ?array
    {
        try {
            $response = Http::withHeaders($this->headers)
                ->get($this->baseUrl . '/billing_requests/' . $billingRequestId);

            if ($response->successful()) {
                $data = $response->json();
                return $data['billing_requests'] ?? null;
            }

            return null;
        } catch (Exception $e) {
            Log::error('Error fetching billing request: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Find customer by email
     *
     * @param string $email
     * @return array|null
     */
    public function findCustomerByEmail(string $email): ?array
    {
        try {
            $response = Http::withHeaders($this->headers)
                ->get($this->baseUrl . '/customers', [
                    'email' => $email,
                    'limit' => 1
                ]);

            if ($response->successful()) {
                $data = $response->json();
                return !empty($data['customers']) ? $data['customers'][0] : null;
            }

            return null;
        } catch (Exception $e) {
            Log::error('Error searching customer by email: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Create a complete billing request with flow (one-step method)
     *
     * @param array $data
     * @return array
     * @throws Exception
     */
    public function createBillingRequestWithFlow(array $data): array
    {
        // Step 1: Create billing request
        $billingRequestResponse = $this->createBillingRequest($data);
        $billingRequestId = $billingRequestResponse['billing_requests']['id'];

        // Step 2: Create billing request flow
        $flowData = [
            'success_redirect_url' => $data['success_redirect_url'],
            'exit_uri' => $data['exit_uri'] ?? $data['success_redirect_url'],
            'language' => $data['language'] ?? 'en'
        ];

        $flowResponse = $this->createBillingRequestFlow($billingRequestId, $flowData);

        return [
            'billing_request' => $billingRequestResponse['billing_requests'],
            'billing_request_flow' => $flowResponse['billing_request_flows'],
            'redirect_url' => $flowResponse['billing_request_flows']['authorisation_url']
        ];
    }
}