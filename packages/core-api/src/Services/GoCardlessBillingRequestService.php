<?php

namespace Fleetbase\Services;
// use GuzzleHttp\Client;
use GoCardlessPro\Client;
use GoCardlessPro\Environment;
use Fleetbase\Models\Payment;
use Fleetbase\Models\PaymentGateway;
use Fleetbase\Models\Plan;
use Fleetbase\Models\PlanPricingRelation;
use Fleetbase\Models\CompanyPlanRelation;
use Fleetbase\Models\Subscription;
use GoCardlessPro\Core\Exception\GoCardlessProException;
use GoCardlessPro\Core\Exception\InvalidApiUsageException;
use GoCardlessPro\Core\Exception\InvalidStateException;
use GoCardlessPro\Core\Exception\ValidationFailedException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Carbon;

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
    public function collectCustomerDetails($billingRequestId, $customerData)
{
    try {
        $response = $this->client->billingRequests()->actions()->collectCustomerDetails(
            $billingRequestId,
            $customerData
        );
        
        return $response;
    } catch (Exception $e) {
        Log::error('Failed to collect customer details', [
            'billing_request_id' => $billingRequestId,
            'error' => $e->getMessage()
        ]);
        throw $e;
    }
}
    public function createCustomer(array $data): array
{
    try {
        Log::info('Creating customer in GoCardless', [
            'customer_data' => $data
        ]);
        
        $email = $data['email'] ?? null;
        
        // Validate required fields
        if (!$email) {
            throw new \InvalidArgumentException('Customer email is required');
        }
        
        if (empty($data['given_name']) || empty($data['family_name'])) {
            throw new \InvalidArgumentException('Customer given_name and family_name are required');
        }
        
        // Check for existing customer
        $existingCustomer = $this->findCustomerByEmail($email);
        
        if ($existingCustomer) {
            Log::info('Found existing customer', ['customer_id' => $existingCustomer['id']]);
            return $existingCustomer;
        }
        
        // Prepare customer data
        $customerData = [
            'given_name' => trim($data['given_name']),
            'family_name' => trim($data['family_name']),
            'email' => trim($email),
        ];
        
        // Add optional fields if provided
        $optionalFields = [
            'company_name',
            'address_line1',
            'address_line2', 
            'city',
            'region',
            'postal_code',
            'country_code',
            'phone_number'
        ];
        
        foreach ($optionalFields as $field) {
            if (!empty($data[$field])) {
                $customerData[$field] = trim($data[$field]);
            }
        }
        
        // Set default country code if not provided
        if (empty($customerData['country_code'])) {
            $customerData['country_code'] = 'GB';
        }
        
        Log::info('Creating new GoCardless customer', [
            'email' => $customerData['email'],
            'given_name' => $customerData['given_name'],
            'family_name' => $customerData['family_name']
        ]);
        
        // Create customer in GoCardless
        $customer = $this->client->customers()->create([
            'params' => $customerData
        ]);
        
        Log::info('GoCardless customer created successfully', [
            'customer_id' => $customer->id,
            'email' => $customer->email
        ]);
        
        // Return customer data as array
        return [
            'id' => $customer->id,
            'given_name' => $customer->given_name,
            'family_name' => $customer->family_name,
            'email' => $customer->email,
            'company_name' => $customer->company_name ?? null,
            'address_line1' => $customer->address_line1 ?? null,
            'address_line2' => $customer->address_line2 ?? null,
            'city' => $customer->city ?? null,
            'region' => $customer->region ?? null,
            'postal_code' => $customer->postal_code ?? null,
            'country_code' => $customer->country_code ?? null,
            'phone_number' => $customer->phone_number ?? null,
            'created_at' => $customer->created_at,
        ];
        
    } catch (\GoCardlessPro\Exception\InvalidApiUsageException $e) {
        Log::error('GoCardless API error creating customer', [
            'error' => $e->getMessage(),
            'email' => $email ?? 'unknown',
            'errors' => $e->getErrors()
        ]);
        
        throw new \Exception('Failed to create customer: ' . $e->getMessage());
        
    } catch (\GoCardlessPro\Exception\ValidationFailedException $e) {
        Log::error('GoCardless validation error creating customer', [
            'error' => $e->getMessage(),
            'email' => $email ?? 'unknown',
            'errors' => $e->getErrors()
        ]);
        
        throw new \Exception('Customer validation failed: ' . $e->getMessage());
        
    } catch (\Exception $e) {
        Log::error('Unexpected error creating customer', [
            'error' => $e->getMessage(),
            'email' => $email ?? 'unknown'
        ]);
        
        throw new \Exception('Failed to create customer: ' . $e->getMessage());
    }
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
                ],
                // Limited customization options
                'language' => $data['language'] ?? 'en'
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
        // Step 1: Validate the flow ID format
        Log::info('Starting billing request flow completion', [
            'flow_id' => $billingRequestFlowId,
            'flow_id_length' => strlen($billingRequestFlowId),
            'base_url' => $this->baseUrl
        ]);

        // Check if flow ID looks valid (GoCardless flow IDs start with BRF)
        if (!preg_match('/^BRF[A-Z0-9]{10,}$/', $billingRequestFlowId)) {
            Log::warning('Invalid billing request flow ID format', [
                'flow_id' => $billingRequestFlowId,
                'expected_format' => 'BRF followed by alphanumeric characters'
            ]);
        }

        // Step 2: First check if the flow exists and get its current status
        Log::info('Checking billing request flow status before completion');
        
        $statusUrl = $this->baseUrl . '/billing_request_flows/' . $billingRequestFlowId;
        Log::info('Checking flow status at URL', ['url' => $statusUrl]);
        
        $statusResponse = Http::withHeaders($this->headers)
            ->get($statusUrl);
            
        Log::info('Status check response', [
            'status_code' => $statusResponse->status(),
            'response_body' => $statusResponse->body(),
            'response_headers' => $statusResponse->headers()
        ]);
            
        if (!$statusResponse->successful()) {
            $errorDetails = [
                'status_code' => $statusResponse->status(),
                'response_body' => $statusResponse->body(),
                'url' => $statusUrl,
                'headers_sent' => $this->headers
            ];
            
            Log::error('Billing request flow does not exist or is inaccessible', $errorDetails);
            
            if ($statusResponse->status() === 404) {
                throw new Exception('Billing request flow not found. The flow ID may be invalid, expired, or from a different environment. Flow ID: ' . $billingRequestFlowId);
            } else {
                throw new Exception('Failed to access billing request flow: ' . $statusResponse->status() . ' - ' . $statusResponse->body());
            }
        }
        
        $flowData = $statusResponse->json();
        Log::info('Current flow status retrieved', [
            'flow_data' => $flowData,
            'completed_at' => $flowData['billing_request_flows']['completed_at'] ?? 'null'
        ]);
        
        // Step 3: Check if already completed
        if (isset($flowData['billing_request_flows']['completed_at']) && 
            $flowData['billing_request_flows']['completed_at'] !== null) {
            Log::info('Billing request flow already completed', [
                'flow_id' => $billingRequestFlowId,
                'completed_at' => $flowData['billing_request_flows']['completed_at']
            ]);
            return $flowData['billing_request_flows'];
        }
        
        // Step 4: Attempt to complete the flow
        $completeUrl = $this->baseUrl . '/billing_request_flows/' . $billingRequestFlowId . '/actions/complete';
        Log::info('Attempting to complete billing request flow', [
            'complete_url' => $completeUrl,
            'headers' => $this->headers
        ]);
        
        $response = Http::withHeaders($this->headers)
            ->post($completeUrl);
        
        // Log the complete response details
        Log::info('Completion attempt response', [
            'status_code' => $response->status(),
            'response_body' => $response->body(),
            'response_headers' => $response->headers(),
            'url' => $completeUrl
        ]);
        
        if ($response->successful()) {
            Log::info('Billing request flow completed successfully', [
                'flow_id' => $billingRequestFlowId
            ]);
            return $response->json();
        }
        
        // Enhanced error reporting
        $errorDetails = [
            'flow_id' => $billingRequestFlowId,
            'status_code' => $response->status(),
            'response_body' => $response->body(),
            'complete_url' => $completeUrl,
            'headers_sent' => $this->headers,
            'flow_current_status' => $flowData['billing_request_flows']['completed_at'] ?? 'not_completed'
        ];
        
        Log::error('Failed to complete billing request flow', $errorDetails);
        
        // Provide specific error messages based on status code
        switch ($response->status()) {
            case 404:
                throw new Exception('Billing request flow not found for completion. This usually means the flow ID is invalid, expired, or the flow cannot be completed in its current state. Flow ID: ' . $billingRequestFlowId);
            case 400:
                throw new Exception('Bad request when completing flow. The flow may already be completed or in an invalid state: ' . $response->body());
            case 422:
                throw new Exception('Unprocessable entity - the flow cannot be completed: ' . $response->body());
            default:
                throw new Exception('Failed to complete billing request flow: ' . $response->status() . ' - ' . $response->body());
        }
        
    } catch (Exception $e) {
        Log::error('GoCardless Complete Billing Request Flow Error', [
            'flow_id' => $billingRequestFlowId,
            'error_message' => $e->getMessage(),
            'error_trace' => $e->getTraceAsString(),
            'base_url' => $this->baseUrl ?? 'not_set',
            'headers' => $this->headers ?? 'not_set'
        ]);
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
            Log::info('Searching for customer by email', ['email' => $email]);
            
            $date = now()->subYears(2)->toIso8601String();
            $pageCount = 0;
            $maxPages = 50; // Increased limit or make configurable
            
            // Initialize query params BEFORE the loop
            $queryParams = [
                'created_at[gt]' => $date,
                'limit' => 50
            ];
            
            do {
                $pageCount++;
                Log::info("Fetching customers page {$pageCount}", [
                    'date_filter' => $date,
                    'searching_for_email' => $email,
                    'query_params' => $queryParams // Log current params
                ]);
                
                $response = Http::withHeaders($this->headers)
                    ->get($this->baseUrl . '/customers', $queryParams);

                if (!$response->successful()) {
                    Log::error('Failed to fetch customers from GoCardless', [
                        'status_code' => $response->status(),
                        'response' => $response->body()
                    ]);
                    return null;
                }

                $data = $response->json();
                $customers = $data['customers'] ?? [];
                
                Log::info("Retrieved customers from page {$pageCount}", [
                    'customer_count' => count($customers),
                    'searching_for_email' => $email
                ]);
                
                // Search for the specific email in this batch
                foreach ($customers as $customer) {
                    if (strtolower(trim($customer['email'])) === strtolower(trim($email))) {
                        Log::info('Found matching customer', [
                            'customer_id' => $customer['id'],
                            'email' => $customer['email'],
                            'found_on_page' => $pageCount
                        ]);
                        return $customer;
                    }
                }
                
                // Check if there are more pages
                $meta = $data['meta'] ?? [];
                $cursors = $meta['cursors'] ?? [];
                $afterCursor = $cursors['after'] ?? null;
                
                // Simplified condition (removed redundant check)
                if ($afterCursor) {
                    $queryParams['after'] = $afterCursor;
                } else {
                    break; // No more pages
                }
                
            } while ($pageCount < $maxPages);
            
            Log::info('Customer not found after searching all pages', [
                'email' => $email,
                'pages_searched' => $pageCount
            ]);
            
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

        /**
     * Create billing request with subscription (recurring payments)
     * 
     * @param array $data
     * @return array
     * @throws Exception
     */
    public function createBillingRequestWithSubscription(array $data)
    {
        
        try {
            Log::info('Creating billing request with subscription', $data);
            // Step 1: Create billing request for mandate only (no subscription_request)
            $payload = [
                'billing_requests' => [
                    'mandate_request' => [
                        'currency' => $data['currency'] ?? config('services.gocardless.currency'), // Force EUR
                        'scheme' => $this->getSchemeForCurrency($data['currency'] ?? config('services.gocardless.currency')),
                        // 'currency' => 'EUR',
                        // 'scheme' => 'sepa_core',
                    ],
                    // 'subscription_request' => [
                    //     'amount' => (int) $data['subscription_request']['amount'],
                    //     'currency' => "EUR",
                    //     "name" => "My Subscription",
                    //     "interval_unit" => "monthly",
                    //     "interval" => 1,
                    //     "start_date" => now()->toDateString()
                    // ]
                    // 'payment_request' => [
                    //     'amount' => (int) $data['subscription_request']['amount'], // First payment amount
                    //     'currency' => $data['subscription_request']['currency'],
                    //     'description' => $data['subscription_request']['name'] . ' - First Payment',
                    // ]
                ]
            ];
            Log::info('Payload', $payload); 
            // Add billing request metadata if provided
            if (isset($data['metadata']) && !empty($data['metadata'])) {
                $metadata = [];
                $count = 0;
                foreach ($data['metadata'] as $key => $value) {
                    if ($count >= 3) break;
                    $metadata[$key] = (string) $value;
                    $count++;
                }
                if (!empty($metadata)) {
                    $payload['billing_requests']['metadata'] = $metadata;
                }
            }

            Log::info('Creating GoCardless billing request for mandate setup', [
                'currency' => $data['currency'],
                'scheme' => $payload['billing_requests']['mandate_request']['scheme'],
                'payload' => $payload
            ]);
            
            // Create the billing request
            $response = Http::withHeaders($this->headers)
                ->post($this->baseUrl . '/billing_requests', $payload);

            if (!$response->successful()) {
                $error = $response->json();
                Log::error('GoCardless billing request creation failed', [
                    'status' => $response->status(),
                    'error' => $error,
                    'payload' => $payload
                ]);
                
                $errorMessage = $this->extractErrorMessage($error);
                throw new Exception('Failed to create billing request: ' . $errorMessage);
            }

            $billingRequest = $response->json()['billing_requests'];

            Log::info('GoCardless billing request created successfully', [
                'billing_request_id' => $billingRequest['id'],
                'status' => $billingRequest['status']
            ]);

            // Step 2: Create the billing request flow for the redirect URL
            $flowResponse = $this->createBillingRequestFlow($billingRequest['id'], $data);

            // Store subscription data for later use (after mandate is set up)
            $subscriptionData = [
                'amount' => (int) $data['subscription_request']['amount'],
                'currency' => $data['subscription_request']['currency'],
                'name' => $data['subscription_request']['name'],
                'interval_unit' => $data['subscription_request']['interval_unit'],
                'interval' => (int) ($data['subscription_request']['interval'] ?? 1),
                'day_of_month' => (int) $data['subscription_request']['day_of_month'],
                'start_date' => $data['subscription_request']['start_date'],
                'metadata' => $data['subscription_request']['metadata'] ?? []
            ];

            if (isset($data['subscription_request']['end_date'])) {
                $subscriptionData['end_date'] = $data['subscription_request']['end_date'];
            }

            return [
                'billing_request' => $billingRequest,
                'billing_request_flow' => $flowResponse['billing_request_flows'],
                'redirect_url' => $flowResponse['billing_request_flows']['authorisation_url'],
                'subscription_data' => $subscriptionData // Store for later
            ];

        } catch (Exception $e) {
            Log::error('GoCardless subscription billing request error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Get appropriate scheme for currency
     * 
     * @param string $currency
     * @return string
     */
    private function getSchemeForCurrency(string $currency): string
    {
        return match(strtoupper($currency)) {
            'GBP' => 'bacs',
            'EUR' => 'sepa_core',
            'USD' => 'ach',
            'CAD' => 'pad',
            'AUD' => 'becs',
            'NZD' => 'becs_nz',
            'SEK' => 'autogiro',
            'DKK' => 'betalingsservice',
            default => 'bacs' // Default to BACS
        };
    }

    /**
     * Extract error message from GoCardless response
     * 
     * @param array $error
     * @return string
     */
    private function extractErrorMessage(array $error): string
    {
        if (isset($error['error']['message'])) {
            return $error['error']['message'];
        }
        
        if (isset($error['error']['errors'])) {
            $errors = [];
            foreach ($error['error']['errors'] as $err) {
                $errors[] = $err['message'] ?? 'Unknown error';
            }
            return implode(', ', $errors);
        }
        
        return 'Unknown error occurred';
    }
    /**
 * Create subscription from payment with conversion intent
 */
public function createSubscriptionFromPayment($payment, $mandateId, $startDate = null, $endDate = null)
{
    try {
        // Load plan pricing relationship
        // $payment->load('companyPlanRelation.planPricing.plan');
        $payment->load(['companyPlan', 'plan']);
        
        if (!$payment->companyPlan) {
            throw new Exception('Payment has no company plan relation');
        }
        
        if (!$payment->plan) {
            throw new Exception('Payment has no plan');
        }
        
        // Get plan pricing based on the plan_id and billing cycle
        $plan = $payment->plan;
        $companyPlan = $payment->companyPlan;
        
        // You'll need to determine the billing cycle from somewhere
        // This could be from the payment, company plan, or default to monthly
        $billingCycle = $companyPlan->billing_cycle ?? 'monthly'; // Adjust this field name as needed
        
        // Get the pricing for this plan and billing cycle
        $planPricing = PlanPricingRelation::where('plan_id', $plan->id)
            ->where('billing_cycle', $billingCycle)
            ->first();
        
        if (!$planPricing) {
            throw new Exception("No pricing found for plan {$plan->id} with billing cycle {$billingCycle}");
        }
        

        // Calculate start date
        $calculatedStartDate = $startDate ?: date('Y-m-d', strtotime('+5 day'));
        if ($startDate && $startDate <= date('Y-m-d')) {
            $calculatedStartDate = date('Y-m-d', strtotime('+5 day'));
        }
        $validStartDate = $this->calculateValidStartDate($mandateId, $startDate);
        $mandate = $this->client->mandates()->get($mandateId);
        $scheme = $mandate->scheme;

        switch ($scheme) {
            case 'sepa_core':
                $currency = 'EUR';
                break;
            case 'bacs':
                $currency = 'GBP';
                break;
            // ... other schemes
            default:
                $currency = config('services.gocardless.currency');
        }
        // Build subscription data
        $subscriptionData = [
            'amount' => $payment->amount * 100, // Convert to pence
            'currency' => $currency,
            'name' => $planPricing->plan->name . ' Subscription',
            'interval_unit' => $this->mapBillingCycleToInterval($planPricing->billing_cycle),
            'interval' => $this->calculateIntervalCount($planPricing->billing_cycle),
            // 'day_of_month' => $this->calculateDayOfMonth($calculatedStartDate),
            'start_date' => $validStartDate,
            'end_date' => $endDate,
            'metadata' => [
                'payment_id' => (string) $payment->id,
                'plan_id' => (string) $planPricing->plan_id,
                'created_from' => 'payment_conversion'
            ]
        ];

        Log::info('Creating subscription from payment conversion', [
            'payment_id' => $payment->id,
            'mandate_id' => $mandateId,
            'subscription_data' => $subscriptionData
        ]);

        return $this->createSubscription($mandateId, $subscriptionData, $payment);

    } catch (Exception $e) {
        Log::error('Failed to create subscription from payment', [
            'payment_id' => $payment->id,
            'mandate_id' => $mandateId,
            'error' => $e->getMessage()
        ]);
        return null;
    }
}
public function mapBillingCycleToInterval($billingCycle)
{
    return match($billingCycle) {
        'monthly' => 'monthly',
        'quarterly' => 'monthly', // Will use interval of 3 for quarterly
        'annual' => 'yearly',
        default => 'monthly'
    };
}

/**
 * Calculate interval count for subscription
 */
public function calculateIntervalCount($billingCycle)
{
    return match($billingCycle) {
        'monthly' => 1,
        'quarterly' => 3,
        'annual' => 1,
        default => 1
    };
}

/**
 * Calculate day of month for subscription
 */
public function calculateDayOfMonth($startDate = null)
{
    if (!$startDate) {
        $startDate = now()->toDateString();
    }
    
    $dayOfMonth = (int) Carbon::parse($startDate)->day;
    
    // GoCardless validation: day_of_month must be -1 or between 1 and 28
    if ($dayOfMonth > 28) {
        // For days 29, 30, 31 -> use -1 (last day of month)
        $validatedDay = -1;
        
        Log::info("Day of month adjusted for GoCardless validation", [
            'original_day' => $dayOfMonth,
            'adjusted_day' => $validatedDay,
            'reason' => 'GoCardless only allows 1-28 or -1 (last day)'
        ]);
        
        return $validatedDay;
    }
    
    return $dayOfMonth;
}
    public function createSubscription($mandateId, $subscriptionData, $payment)
    {
        try {
            Log::info('Creating GoCardless subscription', [
                'mandate_id' => $mandateId,
                'subscription_data' => $subscriptionData
            ]);
            $validStartDate = null;
            if (isset($subscriptionData['start_date'])) {
                $validStartDate = $this->calculateValidStartDate($mandateId, $subscriptionData['start_date']);
                Log::info('GoCardless subscription start date calculated', [
                    'original_start_date' => $subscriptionData['start_date'],
                    'valid_start_date' => $validStartDate
                ]);
            }
            // Prepare subscription parameters for GoCardless API
            $params = [
                'amount' => $subscriptionData['amount'], // Amount in pence
                'currency' => $subscriptionData['currency'] ?? 'GBP',
                'name' => $subscriptionData['name'] ?? 'Subscription',
                'interval_unit' => $subscriptionData['interval_unit'] ?? 'monthly',
                // 'interval_unit' =>"weekly",
                'interval' => $subscriptionData['interval'] ?? 1,
                'links' => [
                    'mandate' => $mandateId
                ]
            ];

            // Add optional parameters
            // if (isset($subscriptionData['day_of_month'])) {
            //     $params['day_of_month'] = $subscriptionData['day_of_month'];
            // }

            if (isset($subscriptionData['start_date'])) {
                $params['start_date'] = $validStartDate;
            }

            if (isset($subscriptionData['end_date'])) {
                $params['end_date'] = $subscriptionData['end_date'];
            }

            if (isset($subscriptionData['metadata'])) {
                $params['metadata'] = $subscriptionData['metadata'];
            }

            Log::info('GoCardless subscription parameters', $params);

            // Create subscription via GoCardless API
            $subscription = $this->client->subscriptions()->create([
                'params' => $params
            ]);
            Log::info("message");
            Log::info('GoCardless subscription created successfully', [
                'subscription_id' => $subscription->id,
                'status' => 'active',
                'amount' => $subscription->amount,
                'currency' => $subscription->currency
            ]);
            // $companyPlan = CompanyPlanRelation::where('id', $payment->company_plan_id)
            //     ->where('deleted', 0) // If you have soft deletes
            //     ->firstOrFail();
            // $createdSubscription =Subscription::create([
            //     'company_uuid' => $companyPlan->company_uuid,
            //     'user_uuid' => $companyPlan->user_uuid,
            //     'gocardless_mandate_id' => $mandateId,
            //     'gocardless_subscription_id' => $subscription->id,
            //     'payment_id' => $payment->id,
            //     'status' => 'active',
            //     'interval_unit' => $subscription->interval_unit,
            //     'interval' => $subscription->interval,
            //     'day_of_month' => $subscription->day_of_month,      
            //     'start_date' => $validStartDate,
            //     'end_date' => $subscription->end_date,
            //     'billing_request_id'=> $payment->checkout_session_id,
            //     'billing_request_flow_id' => $payment->checkout_session_id,
            //     // 'upcoming_payments_count' => $subscription->upcoming_payments_count,
            //     // 'payment_reference' => $subscription->payment_reference,
            //     'metadata' => $subscription->metadata,

            // ]);
            // $payment->update([
            //     'subscription_id' => $createdSubscription->id,
            // ]);
            // if ($payment->companyPlanRelation) {
            //     $payment->companyPlanRelation->update([
            //         'status' => 'active',
            //         'expires_at' => $subscription->end_date,
            //         'updated_at' => now()
            //     ]);
            // }
            // Return subscription data as array
            return [
                'id' => $subscription->id,
                'status' => $subscription->status,
                'amount' => $subscription->amount,
                'currency' => $subscription->currency,
                'interval_unit' => $subscription->interval_unit,
                'interval' => $subscription->interval,
                'name' => $subscription->name,
                'start_date' => $validStartDate,
                'end_date' => $subscription->end_date,
                'day_of_month' => $subscription->day_of_month,
                'upcoming_payments' => $subscription->upcoming_payments,
                'metadata' => $subscription->metadata,
                'created_at' => $subscription->created_at,
                'links' => $subscription->links
            ];

        } catch (\GoCardlessPro\Core\Exception\ApiException $e) {
            Log::error('GoCardless API error creating subscription', [
                'error' => $e->getMessage(),
                'error_code' => $e->getCode(),
                'mandate_id' => $mandateId,
                'subscription_data' => $subscriptionData
            ]);
            throw new Exception('GoCardless API error: ' . $e->getMessage());

        } catch (Exception $e) {
            Log::error('General error creating subscription', [
                'error' => $e->getMessage(),
                'mandate_id' => $mandateId,
                'subscription_data' => $subscriptionData
            ]);
            throw $e;
        }
        
    }
    private function calculateValidStartDate($mandateId, $requestedStartDate = null)
    {
        try {
            Log::info('Getting mandate details for start date calculation', [
                'mandate_id' => $mandateId
            ]);
            
            // Get mandate details to find next_possible_charge_date
            $mandate = $this->getMandate($mandateId);
            $nextPossibleChargeDate = $mandate['next_possible_charge_date'] ?? null;
            
            Log::info('Mandate next possible charge date', [
                'mandate_id' => $mandateId,
                'next_possible_charge_date' => $nextPossibleChargeDate
            ]);
            $earliestStartDate = Carbon::now()->addDays(3);
            // if ($nextPossibleChargeDate) {
            //     // Use mandate's next possible charge date as minimum
            //     $minimumStartDate = Carbon::parse($nextPossibleChargeDate);
                
            //     // If user requested a specific date, use the later of the two
            //     if ($requestedStartDate) {
            //         $requestedDate = Carbon::parse($requestedStartDate);
            //         $finalStartDate = $requestedDate->greaterThan($minimumStartDate) ? 
            //             $requestedDate : $minimumStartDate;
            //     } else {
            //         $finalStartDate = $minimumStartDate;
            //     }
            // } else {
            //     // Fallback if no next_possible_charge_date
            //     $fallbackDate = Carbon::now()->addWorkingDays(5);
            //     $finalStartDate = $requestedStartDate ? 
            //         Carbon::parse($requestedStartDate)->greaterThan($fallbackDate) ? 
            //             Carbon::parse($requestedStartDate) : $fallbackDate 
            //         : $fallbackDate;
            // }
            if ($nextPossibleChargeDate) {
                // Use mandate's next possible charge date as minimum
                $minimumStartDate = Carbon::parse($nextPossibleChargeDate);
                
                // If user requested a specific date, use the later of the two
                if ($requestedStartDate) {
                    $requestedDate = Carbon::parse($requestedStartDate);
                    
                    // If requested date is within 7 days of mandate date, use requested date
                    if ($requestedDate->diffInDays($minimumStartDate, false) <= 7) {
                        $finalStartDate = $requestedDate;  // Use July 2nd instead of July 8th
                    } else {
                        $finalStartDate = $minimumStartDate;  // Only fall back if dates are far apart
                    }
                } else {
                    $finalStartDate = $minimumStartDate;
                }
                Log::info('Calculated valid start date new', [
                    'mandate_id' => $mandateId,
                    'next_possible_charge_date' => $nextPossibleChargeDate,
                    'requested_start_date' => $requestedStartDate,
                    'calculated_start_date' => $finalStartDate
                ]);
            }
            
            $calculatedStartDate = $finalStartDate->toDateString();
            
            Log::info('Calculated valid start date', [
                'mandate_id' => $mandateId,
                'next_possible_charge_date' => $nextPossibleChargeDate,
                'requested_start_date' => $requestedStartDate,
                'calculated_start_date' => $calculatedStartDate
            ]);
            
            return $calculatedStartDate;
            
        } catch (Exception $e) {
            Log::warning('Could not get mandate details for start date, using safe fallback', [
                'mandate_id' => $mandateId,
                'error' => $e->getMessage()
            ]);
            
            // Safe fallback: 5 working days from now
            $fallbackDate = Carbon::now()->addWorkingDays(5)->toDateString();
            
            if ($requestedStartDate) {
                $requestedDate = Carbon::parse($requestedStartDate);
                $safeDate = Carbon::parse($fallbackDate);
                return $requestedDate->greaterThan($safeDate) ? 
                    $requestedDate->toDateString() : $fallbackDate;
            }
            
            return $fallbackDate;
        }
    }
    public function getMandate($mandateId)
    {
        try {
            Log::info('Fetching mandate details from GoCardless', ['mandate_id' => $mandateId]);
            
            $mandate = $this->client->mandates()->get($mandateId);
            
            $mandateData = [
                'id' => $mandate->id,
                'status' => $mandate->status,
                'next_possible_charge_date' => $mandate->next_possible_charge_date,
                'created_at' => $mandate->created_at,
                'metadata' => $mandate->metadata,
                'links' => $mandate->links
            ];
            
            Log::info('Mandate details retrieved', [
                'mandate_id' => $mandateId,
                'status' => $mandate->status,
                'next_possible_charge_date' => $mandate->next_possible_charge_date
            ]);
            
            return $mandateData;
            
        } catch (\GoCardlessPro\Core\Exception\ApiException $e) {
            Log::error('GoCardless API error getting mandate', [
                'error' => $e->getMessage(),
                'mandate_id' => $mandateId
            ]);
            throw new Exception('GoCardless API error: ' . $e->getMessage());
        }
    }
    public function getSubscription($subscriptionId)
    {
        try {
            return $this->client->subscriptions()->get($subscriptionId);
        } catch (\Exception $e) {
            \Log::error('Failed to get subscription from GoCardless', [
                'subscription_id' => $subscriptionId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    public function getPayment($paymentId)
    {
        try {
            return $this->client->payments()->get($paymentId);
        } catch (\Exception $e) {
            \Log::error('Failed to get payment from GoCardless', [
                'payment_id' => $paymentId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    public function getPaymentDetailsFromGoCardless(string $paymentId): ?array
    {
        try {
            // Cache key for payment details (cache for 5 minutes)
            // $cacheKey = "gocardless_payment_{$paymentId}";
            
            // Check cache first
            // if (Cache::has($cacheKey)) {
            //     Log::info("Payment details retrieved from cache", ['payment_id' => $paymentId]);
            //     return Cache::get($cacheKey);
            // }

            $response = Http::withHeaders($this->headers)
            ->get($this->baseUrl . '/payments/' . $paymentId);
            
            // Check if request was successful
            if (!$response->successful()) {
                Log::error("GoCardless API request failed", [
                    'payment_id' => $paymentId,
                    'status' => $response->status(),
                    'response' => $response->body(),
                ]);
                
                if ($response->status() === 404) {
                    throw new Exception("Payment not found in GoCardless: {$paymentId}");
                }
                
                throw new Exception("GoCardless API error: " . $response->status() . " - " . $response->body());
            }

            $responseData = $response->json();
            
            // Validate response structure
            if (!isset($responseData['payments'])) {
                throw new Exception("Invalid response structure from GoCardless API");
            }

            $paymentDetails = $responseData['payments'];
            
            Log::info("Payment details successfully retrieved", [
                'payment_id' => $paymentId,
                'amount' => $paymentDetails['amount'] ?? null,
                'currency' => $paymentDetails['currency'] ?? null,
                'status' => $paymentDetails['status'] ?? null,
            ]);

            // Cache the result for 5 minutes
            // Cache::put($cacheKey, $paymentDetails, now()->addMinutes(5));

            return $paymentDetails;

        } catch (Exception $e) {
            Log::error("Error fetching payment details from GoCardless", [
                'payment_id' => $paymentId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            throw $e;
        }
    }
    public function getSubscriptionDetailsFromGoCardless($subscriptionId)
    {
        try {
            $subscription = $this->client->subscriptions()->get($subscriptionId);
            
            return [
                'id' => $subscription->id,
                'status' => $subscription->status,
                'amount' => $subscription->amount,
                'currency' => $subscription->currency,
                'start_date' => $subscription->start_date,
                'end_date' => $subscription->end_date,
                'upcoming_payments' => $subscription->upcoming_payments,
                'metadata' => $subscription->metadata,
                'links' => $subscription->links
            ];
        } catch (\GoCardlessPro\Core\Exception\ApiException $e) {
            Log::error('GoCardless API error getting subscription details', [
                'subscription_id' => $subscriptionId,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

        
}