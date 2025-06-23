<?php

namespace Fleetbase\Http\Controllers\Internal\v1;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Routing\Controller;
use Fleetbase\Models\Payment;
use Fleetbase\Models\PaymentGateway;
use Fleetbase\Models\Plan;
use Fleetbase\Models\PlanPricingRelation;
use Fleetbase\Models\CompanyPlanRelation;
use Fleetbase\Services\GoCardlessBillingRequestService;
use Illuminate\Validation\ValidationException;

class BillingRequestController extends Controller
{
    protected $billingRequestService;

    public function __construct(GoCardlessBillingRequestService $billingRequestService)
    {
        $this->billingRequestService = $billingRequestService;
    }

    /**
     * Create billing request with amount displayed on payment page
     */
    public function createBillingRequest(Request $request)
    {
        // $request->validate([
        //     'plan_pricing_id' => 'required|exists:plan_pricing_relation,id',
        //     'company_uuid' => 'sometimes|string', // Optional - will be generated if not provided
        //     'user_uuid' => 'sometimes|string', // Optional - will be generated if not provided
        //     'no_of_web_users' => 'required|integer|min:1|max:1000',
        //     'no_of_app_users' => 'required|integer|min:0|max:1000',
        //     'success_url' => 'required|string|max:255',
        //     'exit_uri' => 'required|string',
        //     'customer.given_name' => 'required|string|max:255',
        //     'customer.family_name' => 'required|string|max:255',
        //     'customer.email' => 'required|email',
        // ]);
            $validator = Validator::make($request->all(), [
            // Plan and pricing validation
            'plan_pricing_id' => 'required|exists:plan_pricing_relation,id',
            
            // Company and user validation
            'company_uuid' => 'sometimes|string|max:255',
            'user_uuid' => 'sometimes|string|max:255',
            
            // User count validation
            'no_of_web_users' => 'required|integer|min:1|max:1000',
            'no_of_app_users' => 'required|integer|min:0|max:1000',
            
            // URL validation
            'success_url' => 'required|url|max:500',
            'exit_uri' => 'required|url|max:500',
            
            // Customer information validation
            'customer.given_name' => 'required|string|min:2|max:255',
            'customer.family_name' => 'required|string|min:2|max:255',
            'customer.email' => 'required|email|max:255',
            
            // Optional customer address fields
            'customer.address_line1' => 'nullable|string|max:255',
            'customer.address_line2' => 'nullable|string|max:255',
            'customer.city' => 'nullable|string|max:100',
            'customer.postal_code' => 'nullable|string|max:20',
            'customer.country_code' => 'nullable|string|size:2|regex:/^[A-Z]{2}$/',
            
            // Optional fields
            'description' => 'nullable|string|max:500',
            'currency' => 'nullable|string|in:GBP,EUR,USD',
            'order_id' => 'nullable|string|max:100',
            'customer_reference' => 'nullable|string|max:100',
            
        ], [
            // Custom error messages
            'plan_pricing_id.required' => 'Please select a valid plan.',
            'plan_pricing_id.exists' => 'The selected plan does not exist.',
            
            'no_of_web_users.required' => 'Number of web users is required.',
            'no_of_web_users.min' => 'At least 1 web user is required.',
            'no_of_web_users.max' => 'Maximum 1000 web users allowed.',
            
            'no_of_app_users.required' => 'Number of app users is required.',
            'no_of_app_users.max' => 'Maximum 1000 app users allowed.',
            
            'success_url.required' => 'Success URL is required.',
            'success_url.url' => 'Success URL must be a valid URL.',
            
            'exit_uri.required' => 'Exit URI is required.',
            'exit_uri.url' => 'Exit URI must be a valid URL.',
            
            'customer.given_name.required' => 'Customer first name is required.',
            'customer.given_name.min' => 'Customer first name must be at least 2 characters.',
            
            'customer.family_name.required' => 'Customer last name is required.',
            'customer.family_name.min' => 'Customer last name must be at least 2 characters.',
            
            'customer.email.required' => 'Customer email is required.',
            'customer.email.email' => 'Please provide a valid email address.',
            
            'customer.country_code.size' => 'Country code must be exactly 2 characters.',
            'customer.country_code.regex' => 'Country code must be in ISO format (e.g., GB, US).',
            
            'currency.in' => 'Currency must be one of: GBP, EUR, USD.',
        ]);

        // Check if validation fails
        if ($validator->fails()) {
            \Log::warning('Billing request validation failed', [
                'errors' => $validator->errors()->toArray(),
                'request_data' => $request->except(['customer.email']) // Don't log email for privacy
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Validation failed',
                'errors' => $validator->errors(),
                'message' => 'Please check the required fields and try again.'
            ], 422);
        }

        
        // Get validated data
        $validatedData = $validator->validated();
        try {
            $planPricing = PlanPricingRelation::with('plan')->findOrFail($request->plan_pricing_id);
            // Calculate total amount based on users
            $totalAmount = $planPricing->calculateTotalPrice(
                $request->no_of_web_users, 
                $request->no_of_app_users
            
            );
            $companyPlanRelation = $this->createCompanyPlanRelation($request, $planPricing, $totalAmount, 'pending');
                
            // Create payment record
            $payment = $this->createPaymentRecord($request, $planPricing, $totalAmount, $companyPlanRelation);
                
            try {
                $billingRequestData = [
                    'description' => $request->description,
                    'amount' => $totalAmount, // Will be converted to pence in service
                    'currency' => $request->currency ?? 'GBP',
                    'customer' => [
                        'given_name' => $request->input('customer.given_name'),
                        'family_name' => $request->input('customer.family_name'),
                        'email' => $request->input('customer.email'),
                    ],
                    'success_redirect_url' => $request->success_url,
                    'exit_uri' => $request->exit_uri,
                    'language' => 'en'
                ];

                // Add optional address fields
                if ($request->has('customer.address_line1')) {
                    $billingRequestData['customer']['address_line1'] = $request->input('customer.address_line1');
                }
                if ($request->has('customer.city')) {
                    $billingRequestData['customer']['city'] = $request->input('customer.city');
                }
                if ($request->has('customer.postal_code')) {
                    $billingRequestData['customer']['postal_code'] = $request->input('customer.postal_code');
                }
                if ($request->has('customer.country_code')) {
                    $billingRequestData['customer']['country_code'] = $request->input('customer.country_code');
                }

                // Build metadata (max 3 properties)
                $metadata = [];
                
                if ($request->order_id) {
                    $metadata['order_id'] = (string) $request->order_id;
                }
                
                if (auth()->check() && auth()->id()) {
                    $metadata['user_id'] = (string) auth()->id();
                }
                
                if ($request->has('customer_reference')) {
                    $metadata['customer_ref'] = (string) $request->customer_reference;
                }

                // Limit to 3 metadata fields
                $metadata = array_slice($metadata, 0, 3, true);
                
                if (!empty($metadata)) {
                    $billingRequestData['metadata'] = $metadata;
                }

                // Create billing request with flow
                $response = $this->billingRequestService->createBillingRequestWithFlow($billingRequestData);
                // Update payment record with billing request details
                $this->updatePaymentWithBillingRequestData($payment, $response);
                // Store session data for completion handling
                session([
                    'gocardless_billing_request_id' => $response['billing_request']['id'],
                    'gocardless_billing_request_flow_id' => $response['billing_request_flow']['id'],
                    'gocardless_order_data' => $request->only(['order_id', 'amount', 'description']),
                    'gocardless_customer_email' => $request->input('customer.email')
                ]);

                return response()->json([
                    'success' => true,
                    'redirect_url' => $response['redirect_url'],
                    'billing_request_id' => $response['billing_request']['id'],
                    'billing_request_flow_id' => $response['billing_request_flow']['id'],
                    'amount' => $totalAmount,
                    'currency' => $request->currency ?? 'GBP',
                    'message' => 'Billing request created - amount will be displayed on payment page'
                ]);

            } catch (Exception $e) {
                \Log::error('GoCardless Billing Request Error: ' . $e->getMessage());
                
                return response()->json([
                    'success' => false,
                    'error' => $e->getMessage()
                ], 500);
            }
        }catch (ValidationException $e) {
            \Log::warning('Business validation failed for billing request', [
                'error' => $e->getMessage(),
                'payment_id' => $payment->id ?? null
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Validation error',
                'message' => $e->getMessage()
            ], 422);

        } catch (Exception $e) {
            \Log::error('GoCardless Billing Request Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'payment_id' => $payment->id ?? null,
                'request_data' => $request->except(['customer.email'])
            ]);
            
            // Update payment status to failed if payment was created
            if (isset($payment)) {
                $payment->update([
                    'status' => 'failed',
                    'failure_reason' => $e->getMessage()
                ]);
            }
            
            return response()->json([
                'success' => false,
                'error' => 'Failed to create billing request',
                'message' => 'An error occurred while processing your request. Please try again.',
                'payment_id' => $payment->id ?? null
            ], 500);
        }
    }
    
    /**
     * Check if a company plan relation already exists for today
     */
    private function checkExistingTodayRelation($data)
    {
        return CompanyPlanRelation::where('company_uuid', $data['company_uuid'])
            ->where('user_uuid', $data['user_uuid'])
            ->where('plan_pricing_id', $data['plan_pricing_id'])
            ->whereDate('created_at', today()) // Check for today's date
            ->first();
    }

    /**
     * Create company plan relation before payment
     */
    private function createCompanyPlanRelation($data, $planPricing, $totalAmount, $status = 'pending')
    {
        $expiryDate = $this->calculateExpiryDate($planPricing);
        $existingRelation = $this->checkExistingTodayRelation($data);
    
        if ($existingRelation) {
            return $existingRelation; // Return existing instead of creating new
        }
        $companyPlanRelation = CompanyPlanRelation::create([
            'company_uuid' => $data['company_uuid'],
            'user_uuid' => $data['user_uuid'],
            'plan_pricing_id' => $data['plan_pricing_id'],
            'no_of_web_users' => $data['no_of_web_users'],
            'no_of_app_users' => $data['no_of_app_users'],
            'total_amount' => $totalAmount,
            'auto_renew' => true,
            'expires_at' => $expiryDate,
            'status' => $status, // pending initially, will be activated after successful payment
            'created_by_id' => 1,
            'updated_by_id' => 1
        ]);
        
        Log::info('Company plan relation created', [
            'company_plan_relation_id' => $companyPlanRelation->id,
            'company_uuid' => $data['company_uuid'],
            'status' => $status
        ]);
       
        return $companyPlanRelation;
    }
    /**
     * Create payment record
     */
    private function createPaymentRecord($data, $planPricing, $totalAmount, $companyPlanRelation)
    {
        $gateway = env('PAYMENT_GATEWAY');
        $paymentGateway = PaymentGateway::where('name', $gateway)->first();
        
        if (!$paymentGateway) {
            // Create payment gateway if it doesn't exist
            $paymentGateway = PaymentGateway::create([
                'name' => ucfirst($gateway),
                'created_by_id' => 1,
                'updated_by_id' => 1
            ]);
        }
        
        $sessionId = 'checkout_' . Str::uuid();
        $expiresAt = now()->addHour(); // 1 hour expiry
        
        return Payment::create([
            'session_id' => $sessionId,
            'company_plan_id' => $companyPlanRelation->id,
            'company_uuid' => $data['company_uuid'],
            'user_uuid' => $data['user_uuid'],
            'plan_id' => $planPricing->plan_id,
            'total_amount' => $totalAmount,
            'transaction_id' => $sessionId,
            'status' => 'pending',
            'amount' => $totalAmount,
            'currency' => $planPricing->currency,
            'payment_gateway_id' => $paymentGateway->id,
            'payment_method' => 'direct_debit',
            'success_url' => $data['success_url'],
            'cancel_url' => $data['cancel_url'],
            'expires_at' => $expiresAt,
            'checkout_data' => [
                'type' => 'subscription_checkout',
                'plan_pricing_id' => $data['plan_pricing_id'],
                'no_of_web_users' => $data['no_of_web_users'],
                'no_of_app_users' => $data['no_of_app_users'],
                'plan_name' => $planPricing->plan->name ?? 'Unknown Plan',
                'billing_cycle' => $planPricing->billing_cycle,
                'price_per_user' => $planPricing->price_per_user,
                'price_per_driver' => $planPricing->price_per_driver,
                'customer_data' => $data['customer_data'],
                'metadata' => $data['metadata'] ?? []
            ],
            'created_by_id' => 1,
            'updated_by_id' => 1
        ]);
    }
    /**
     * Update payment record with billing request data
     */
    private function updatePaymentWithBillingRequestData($payment, $goCardlessResponse)
    {
        $customerId = $goCardlessResponse['billing_request']['links']['customer'] ?? null;
    
        // GoCardless billing requests typically expire in 30 minutes
        $billingExpiresAt = now()->addMinutes(30);
        $updateData = [
            'checkout_session_id' => $goCardlessResponse['billing_request']['id'],
            'gocardless_customer_id' => $customerId,
            'checkout_redirect_url' => $goCardlessResponse['redirect_url'],
            'checkout_expires_at' => $billingExpiresAt,
            'billing_request_response' => $goCardlessResponse,
            'status' => 'processing' 
        ];

        $payment->update($updateData);

        \Log::info('Payment record updated with billing request data', [
            'payment_id' => $payment->id,
            'billing_request_id' => $goCardlessResponse['billing_request']['id'],
            'redirect_url' => $goCardlessResponse['redirect_url']
        ]);

        return $payment;
    }
    /**
     * Handle successful return from GoCardless billing request
     */
    public function handleBillingSuccess(Request $request)
    {
        $billingRequestFlowId = $request->query('billing_request_flow_id');
        
        if (!$billingRequestFlowId) {
            return redirect()->route('payment.error')
                ->with('error', 'Invalid billing request flow');
        }

        try {
            // Complete the billing request flow
            $response = $this->billingRequestService->completeBillingRequestFlow($billingRequestFlowId);
            
            $billingRequestId = session('gocardless_billing_request_id');
            $orderData = session('gocardless_order_data');
            $customerEmail = session('gocardless_customer_email');

            // Get full billing request details
            $billingRequest = $this->billingRequestService->getBillingRequest($billingRequestId);
            
            if (!$billingRequest) {
                throw new Exception('Could not retrieve billing request details');
            }

            // Extract created resources
            $paymentId = $billingRequest['payment_request']['links']['payment'] ?? null;
            $mandateId = $billingRequest['mandate_request']['links']['mandate'] ?? null;
            $customerId = $billingRequest['mandate_request']['links']['customer'] ?? null;

            $responseData = [
                'billing_request_id' => $billingRequestId,
                'payment_id' => $paymentId,
                'mandate_id' => $mandateId,
                'customer_id' => $customerId,
                'customer_email' => $customerEmail,
                'amount' => $billingRequest['payment_request']['amount'] / 100, // Convert back to pounds
                'currency' => $billingRequest['payment_request']['currency'],
                'description' => $billingRequest['payment_request']['description'],
                'status' => $billingRequest['status']
            ];

            // Clear session data
            session()->forget([
                'gocardless_billing_request_id',
                'gocardless_billing_request_flow_id',
                'gocardless_order_data',
                'gocardless_customer_email'
            ]);

            // Log successful completion
            \Log::info('GoCardless Billing Request Completed Successfully', $responseData);

            return redirect()->route('payment.success')
                ->with('success', 'Payment completed successfully!')
                ->with('gocardless_data', $responseData);

        } catch (Exception $e) {
            \Log::error('GoCardless Billing Request Completion Error: ' . $e->getMessage());
            
            return redirect()->route('payment.error')
                ->with('error', 'Failed to complete payment: ' . $e->getMessage());
        }
    }
    /**
     * Calculate subscription expiry date
     */
    private function calculateExpiryDate($planPricing)
    {
        return match ($planPricing->billing_cycle) {
            'monthly' => now()->addMonth(),
            'quarterly' => now()->addMonths(3),
            'annual' => now()->addYear(),
            default => now()->addMonth(),
        };
    }
    /**
     * Handle cancelled billing request
     */
    public function handleBillingCancel(Request $request)
    {
        // Clear any session data
        session()->forget([
            'gocardless_billing_request_id',
            'gocardless_billing_request_flow_id',
            'gocardless_order_data',
            'gocardless_customer_email'
        ]);

        return redirect()->route('payment.cancelled')
            ->with('info', 'Payment was cancelled');
    }
    public function getBillingRequest(string $billingRequestId)
    {
        try {
            // Validate billing request ID format (GoCardless format: BRQ followed by alphanumeric)
            if (!preg_match('/^BRQ[0-9A-Z]+$/', $billingRequestId)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Invalid billing request ID format'
                ], 400);
            }

            // Get billing request details from GoCardless
            $billingRequest = $this->billingRequestService->getBillingRequest($billingRequestId);

            if (!$billingRequest) {
                return response()->json([
                    'success' => false,
                    'error' => 'Billing request not found'
                ], 404);
            }

            // Check if user has access to this billing request
            // You can implement additional authorization logic here if needed
            $metadata = $billingRequest['metadata'] ?? [];
            
            // If you store user_id in metadata during creation, verify access
            if (isset($metadata['user_id']) && $metadata['user_id'] !== (string) auth()->id()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Unauthorized access to billing request'
                ], 403);
            }

            // Extract payment and mandate details if available
            $paymentDetails = null;
            $mandateDetails = null;
            $customerDetails = null;

            // Get payment details if payment exists
            if (isset($billingRequest['payment_request']['links']['payment'])) {
                $paymentId = $billingRequest['payment_request']['links']['payment'];
                $paymentDetails = $this->getPaymentDetails($paymentId);
            }

            // Get mandate details if mandate exists
            if (isset($billingRequest['mandate_request']['links']['mandate'])) {
                $mandateId = $billingRequest['mandate_request']['links']['mandate'];
                $mandateDetails = $this->getMandateDetails($mandateId);
            }

            // Get customer details if customer exists
            if (isset($billingRequest['mandate_request']['links']['customer'])) {
                $customerId = $billingRequest['mandate_request']['links']['customer'];
                $customerDetails = $this->getCustomerDetails($customerId);
            }

            // Map GoCardless status to user-friendly status
            $status = $this->mapBillingRequestStatus($billingRequest['status']);

            // Build comprehensive response
            $response = [
                'success' => true,
                'billing_request_id' => $billingRequestId,
                'status' => $status,
                'gocardless_status' => $billingRequest['status'], // Raw GoCardless status
                'created_at' => $billingRequest['created_at'],
                'metadata' => $billingRequest['metadata'] ?? [],
            ];

            // Add payment request details
            if (isset($billingRequest['payment_request'])) {
                $response['payment_request'] = [
                    'amount' => $billingRequest['payment_request']['amount'],
                    'currency' => $billingRequest['payment_request']['currency'],
                    'description' => $billingRequest['payment_request']['description'],
                    'amount_pounds' => $billingRequest['payment_request']['amount'] / 100, // Convert from pence
                ];
            }

            // Add mandate request details
            if (isset($billingRequest['mandate_request'])) {
                $response['mandate_request'] = [
                    'scheme' => $billingRequest['mandate_request']['scheme'] ?? 'bacs',
                    'verify' => $billingRequest['mandate_request']['verify'] ?? null,
                ];
            }

            // Add payment details if available
            if ($paymentDetails) {
                $response['payment'] = [
                    'id' => $paymentDetails['id'],
                    'amount' => $paymentDetails['amount'],
                    'currency' => $paymentDetails['currency'],
                    'status' => $paymentDetails['status'],
                    'charge_date' => $paymentDetails['charge_date'] ?? null,
                    'description' => $paymentDetails['description'],
                    'reference' => $paymentDetails['reference'] ?? null,
                    'amount_pounds' => $paymentDetails['amount'] / 100,
                    'created_at' => $paymentDetails['created_at']
                ];
            }

            // Add mandate details if available
            if ($mandateDetails) {
                $response['mandate'] = [
                    'id' => $mandateDetails['id'],
                    'reference' => $mandateDetails['reference'],
                    'status' => $mandateDetails['status'],
                    'scheme' => $mandateDetails['scheme'],
                    'next_possible_charge_date' => $mandateDetails['next_possible_charge_date'] ?? null,
                    'created_at' => $mandateDetails['created_at']
                ];
            }

            // Add customer details if available
            if ($customerDetails) {
                $response['customer'] = [
                    'id' => $customerDetails['id'],
                    'given_name' => $customerDetails['given_name'],
                    'family_name' => $customerDetails['family_name'],
                    'email' => $customerDetails['email'],
                    'language' => $customerDetails['language'] ?? null,
                    'created_at' => $customerDetails['created_at']
                ];

                // Add address if available
                if (!empty($customerDetails['address_line1'])) {
                    $response['customer']['address'] = [
                        'line1' => $customerDetails['address_line1'],
                        'line2' => $customerDetails['address_line2'] ?? null,
                        'line3' => $customerDetails['address_line3'] ?? null,
                        'city' => $customerDetails['city'] ?? null,
                        'region' => $customerDetails['region'] ?? null,
                        'postal_code' => $customerDetails['postal_code'] ?? null,
                        'country_code' => $customerDetails['country_code'] ?? null,
                    ];
                }
            }

            // Add any available links
            $response['links'] = [];
            if (isset($billingRequest['payment_request']['links']['payment'])) {
                $response['links']['payment'] = $billingRequest['payment_request']['links']['payment'];
            }
            if (isset($billingRequest['mandate_request']['links']['mandate'])) {
                $response['links']['mandate'] = $billingRequest['mandate_request']['links']['mandate'];
            }
            if (isset($billingRequest['mandate_request']['links']['customer'])) {
                $response['links']['customer'] = $billingRequest['mandate_request']['links']['customer'];
            }
            if (isset($billingRequest['mandate_request']['links']['customer_bank_account'])) {
                $response['links']['customer_bank_account'] = $billingRequest['mandate_request']['links']['customer_bank_account'];
            }

            \Log::info('Billing request retrieved successfully', [
                'billing_request_id' => $billingRequestId,
                'user_id' => auth()->id(),
                'status' => $status
            ]);

            return response()->json($response);

        } catch (Exception $e) {
            \Log::error('Failed to retrieve billing request', [
                'billing_request_id' => $billingRequestId,
                'user_id' => auth()->id(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to retrieve billing request',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /checkout/{billing_request_id}/status - Get simplified status only
     * 
     * @param string $billingRequestId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getBillingRequestStatus(string $billingRequestId)
    {
        try {
            // Validate billing request ID format
            if (!preg_match('/^BRQ[0-9A-Z]+$/', $billingRequestId)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Invalid billing request ID format'
                ], 400);
            }

            // Get billing request details from GoCardless
            $billingRequest = $this->billingRequestService->getBillingRequest($billingRequestId);

            if (!$billingRequest) {
                return response()->json([
                    'success' => false,
                    'error' => 'Billing request not found'
                ], 404);
            }

            // Map status
            $status = $this->mapBillingRequestStatus($billingRequest['status']);

            $response = [
                'success' => true,
                'billing_request_id' => $billingRequestId,
                'status' => $status,
                'gocardless_status' => $billingRequest['status'],
                'updated_at' => now()->toISOString()
            ];

            // Add amount if payment request exists
            if (isset($billingRequest['payment_request']['amount'])) {
                $response['amount'] = $billingRequest['payment_request']['amount'];
                $response['amount_pounds'] = $billingRequest['payment_request']['amount'] / 100;
                $response['currency'] = $billingRequest['payment_request']['currency'];
            }

            return response()->json($response);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to retrieve billing request status'
            ], 500);
        }
    }
        /**
     * Get payment details from GoCardless
     */
    private function getPaymentDetails(string $paymentId)
    {
        try {
            $response = Http::withHeaders($this->goCardlessService->headers)
                ->get($this->goCardlessService->baseUrl . '/payments/' . $paymentId);

            if ($response->successful()) {
                $data = $response->json();
                return $data['payments'] ?? null;
            }
        } catch (Exception $e) {
            \Log::error('Failed to get payment details: ' . $e->getMessage());
        }

        return null;
    }

    /**
     * Get mandate details from GoCardless
     */
    private function getMandateDetails(string $mandateId)
    {
        try {
            $response = Http::withHeaders($this->goCardlessService->headers)
                ->get($this->goCardlessService->baseUrl . '/mandates/' . $mandateId);

            if ($response->successful()) {
                $data = $response->json();
                return $data['mandates'] ?? null;
            }
        } catch (Exception $e) {
            \Log::error('Failed to get mandate details: ' . $e->getMessage());
        }

        return null;
    }

    /**
     * Get customer details from GoCardless
     */
    private function getCustomerDetails(string $customerId)
    {
        try {
            $response = Http::withHeaders($this->goCardlessService->headers)
                ->get($this->goCardlessService->baseUrl . '/customers/' . $customerId);

            if ($response->successful()) {
                $data = $response->json();
                return $data['customers'] ?? null;
            }
        } catch (Exception $e) {
            \Log::error('Failed to get customer details: ' . $e->getMessage());
        }

        return null;
    }

    /**
     * Map GoCardless billing request status to user-friendly status
     */
    private function mapBillingRequestStatus(string $gocardlessStatus): string
    {
        return match($gocardlessStatus) {
            'pending' => 'pending',
            'ready_to_fulfil' => 'completed',
            'fulfilling' => 'processing',
            'fulfilled' => 'completed',
            'cancelled' => 'cancelled',
            'customer_approval_denied' => 'cancelled',
            default => 'pending'
        };
    }
    
   
}

