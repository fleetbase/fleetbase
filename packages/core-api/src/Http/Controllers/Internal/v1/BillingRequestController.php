<?php

namespace Fleetbase\Http\Controllers\Internal\v1;

use Exception;
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
                    'currency' => $request->currency ?? config('services.gocardless.currency'),
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
                $metadata['payment_id'] = (string) $payment->id;
                // Limit to 3 metadata fields
                $metadata = array_slice($metadata, 0, 3, true);
                
                if (!empty($metadata)) {
                    $billingRequestData['metadata'] = $metadata;
                }

                // Create checkout session instead of billing request flow for better customization
                // $response = $this->goCardlessService->createCheckoutSession([
                //     'amount' => $totalAmount,
                //     'currency' => $request->currency ?? 'GBP',
                //     'customer' => $billingRequestData['customer'],
                //     'description' => $request->description ?? 'Payment',
                //     'success_redirect_url' => $request->success_url,
                //     'cancel_redirect_url' => $request->exit_uri ?? $request->success_url,
                //     'metadata' => $metadata ?? []
                // ]);
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
                    'currency' => $request->currency ?? config('services.gocardless.currency'),
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
            // 'session_id' => $sessionId,
            'company_plan_id' => $companyPlanRelation->id,
            'company_uuid' => $data['company_uuid'],
            'user_uuid' => $data['user_uuid'],
            'plan_id' => $planPricing->plan_id,
            'total_amount' => $totalAmount,
            // 'transaction_id' => $sessionId,
            'status' => 'pending',
            'amount' => $totalAmount,
            'currency' => $planPricing->currency,
            'payment_gateway_id' => $paymentGateway->id,
            'next_payment_date' => $this->calculateNextBillingDate($planPricing->billing_cycle),
            'payment_method' => 'direct_debit',
            'success_url' => $data['success_url'],
            'cancel_url' => $data['cancel_url'],
            'expires_at' => $expiresAt,
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
       
        // $billingRequestFlowId = $request->query('billing_request_flow_id');
        $billingRequestFlowId = "BRF00057Y0055CKYYWHYPFZM6AWYSRDP";
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

            // $responseData = [
            //     'billing_request_id' => $billingRequestId,
            //     'payment_id' => $paymentId,
            //     'mandate_id' => $mandateId,
            //     'customer_id' => $customerId,
            //     // 'customer_email' => $customerEmail,
            //     'amount' => $billingRequest['payment_request']['amount'] / 100, // Convert back to pounds
            //     'currency' => $billingRequest['payment_request']['currency'],
            //     'description' => $billingRequest['payment_request']['description'],
            //     'status' => $billingRequest['status']
            // ];

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
                    'error' => 'Invalid billing request ID format fgdfgfd'
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
                    'error' => 'Invalid billing request ID format aaaa'
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
     /**
     * Create recurring billing request with subscription
     */
    public function createRecurringBillingRequest(Request $request)
    {
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
            
            // Recurring payment specific fields
            'start_date' => 'nullable|date|after:today',
            'end_date' => 'nullable|date|after:start_date',
            
        ], [
            // Custom error messages (keeping existing ones and adding new)
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
            
            'start_date.after' => 'Start date must be in the future.',
            'end_date.after' => 'End date must be after start date.',
        ]);

        // Check if validation fails
        if ($validator->fails()) {
            \Log::warning('Recurring billing request validation failed', [
                'errors' => $validator->errors()->toArray(),
                'request_data' => $request->except(['customer.email'])
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
            if (!$planPricing) {
                // If plan_pricing_id doesn't exist, get the latest record
                $planPricing = PlanPricingRelation::with('plan')->latest()->first();
                
                if (!$planPricing) {
                    return response()->json(['error' => 'No plan pricing records found'], 404);
                }
            }
            // Calculate total amount based on users
            $totalAmount = $planPricing->calculateTotalPrice(
                $request->no_of_web_users, 
                $request->no_of_app_users
            );
            
            $companyPlanRelation = $this->createCompanyPlanRelation($request, $planPricing, $totalAmount, 'pending');
                
            // Create payment record for recurring subscription
            $payment = $this->createRecurringPaymentRecord($request, $planPricing, $totalAmount, $companyPlanRelation);
            $customerData = [
                'given_name' => $request->input('customer.given_name'),
                'family_name' => $request->input('customer.family_name'),
                'email' => $request->input('customer.email'),
            ];
            Log::info('Creating GoCardless customer', [
                'customer_data' => $customerData
            ]);
            // Add optional address fields to customer
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
            
            
            $customer = $this->billingRequestService->createCustomer($customerData);
            // Log::info('GoCardless customer created successfully', ['customer' => $customer]);
            
            if ($customer) {
                Log::info('GoCardless customer created', ['customer' => $customer]);
            } else {
                Log::warning('Customer creation failed, customer data is null');
            }
            Log::info('GoCardless customer created', [
                'customer_id' => $customer['id'],
                'email' => $customer['email']
            ]);
            try {
                // Create billing request for mandate setup first
                $billingRequestData = [
                    'currency' => $request->currency ?? config('services.gocardless.currency'),
                    // 'customer' => [
                    //     'given_name' => $request->input('customer.given_name'),
                    //     'family_name' => $request->input('customer.family_name'),
                    //     'email' => $request->input('customer.email'),
                    // ],
                    'links' => [
                        'customer' => $customer['id']
                    ],
                    'success_redirect_url' => $this->addPaymentIdToSuccessUrl($request->success_url, $payment->id),
                    'exit_uri' => $request->exit_uri,
                    'language' => 'en',
                   
                    // Subscription data for later use
                    'subscription_request' => [
                        'amount' => $totalAmount * 100, // Convert to pence
                        'currency' => $request->currency ?? config('services.gocardless.currency'),
                        'name' => $planPricing->plan->name ?? 'Subscription Plan',
                        'interval_unit' => $this->billingRequestService->mapBillingCycleToInterval($planPricing->billing_cycle),
                        'interval' => $this->billingRequestService->calculateIntervalCount($planPricing->billing_cycle),
                        'day_of_month' => $this->billingRequestService->calculateDayOfMonth($request->start_date),
                        'start_date' => $request->start_date ? $request->start_date : $this->calculateStartDate($planPricing->billing_cycle),
                        'end_date' => $request->end_date ?? null,
                        'metadata' => $this->buildSubscriptionMetadata($request, $planPricing, $companyPlanRelation)
                    ]
                ];
    
               
    
                // Build general metadata
                $metadata = [];
                if ($request->order_id) {
                    $metadata['order_id'] = (string) $request->order_id;
                }
                if (auth()->check() && auth()->id()) {
                    $metadata['user_id'] = (string) auth()->id();
                }
                $metadata['payment_id'] = (string) $payment->id;
                if ($request->convert_to_subscription) {
                    $metadata['convert_sub'] = 'true';
                }
                if ($request->has('customer_reference')) {
                    $metadata['customer_ref'] = (string) $request->customer_reference;
                }
                
                $metadata = array_slice($metadata, 0, 3, true);
                if (!empty($metadata)) {
                    $billingRequestData['metadata'] = $metadata;
                }
    
                // Create billing request (mandate setup only)
                $response = $this->billingRequestService->createBillingRequestWithSubscription($billingRequestData);
                
                // Update payment record with billing request details
                $this->updatePaymentWithBillingRequestData($payment, $response);
                
                // Store session data including subscription details for later
                session([
                    'gocardless_billing_request_id' => $response['billing_request']['id'],
                    'gocardless_billing_request_flow_id' => $response['billing_request_flow']['id'],
                    'gocardless_subscription_data' => $response['subscription_data'], // Store subscription data
                    'gocardless_customer_email' => $request->input('customer.email'),
                    'is_recurring' => true,
                    'payment_id' => $payment->id // Store payment ID for later update
                ]);
    
                return response()->json([
                    'success' => true,
                    'redirect_url' => $response['redirect_url'],
                    'billing_request_id' => $response['billing_request']['id'],
                    'billing_request_flow_id' => $response['billing_request_flow']['id'],
                    'subscription_amount' => $totalAmount,
                    'currency' => $request->currency ?? config('services.gocardless.currency'),
                    'billing_cycle' => $planPricing->billing_cycle,
                    'start_date' => $billingRequestData['subscription_request']['start_date'],
                    'is_recurring' => true,
                    'message' => 'Mandate setup initiated. Subscription will be created after mandate approval.'
                ]);
    
            } catch (Exception $e) {
                \Log::error('GoCardless Recurring Billing Request Error: ' . $e->getMessage());
                
                return response()->json([
                    'success' => false,
                    'error' => $e->getMessage()
                ], 500);
            }
            
        } catch (Exception $e) {
            // ... (keep existing error handling) ...
        }
    }
    /**
     * Build subscription metadata
     */
    private function buildSubscriptionMetadata($request, $planPricing, $companyPlanRelation)
    {
        return [
            'plan_id' => (string) $planPricing->plan_id,
            'plan_pricing_id' => (string) $planPricing->id,
            'company_plan_id' => (string) $companyPlanRelation->id,
            'no_of_web_users' => (string) $request->no_of_web_users,
            'no_of_app_users' => (string) $request->no_of_app_users,
            'billing_cycle' => $planPricing->billing_cycle,
        ];
    }
    /**
     * Create recurring payment record
     */
    private function createRecurringPaymentRecord($data, $planPricing, $totalAmount, $companyPlanRelation)
    {
        $gateway = env('PAYMENT_GATEWAY', 'gocardless');
        $paymentGateway = PaymentGateway::where('name', $gateway)->first();
        
        if (!$paymentGateway) {
            $paymentGateway = PaymentGateway::create([
                'name' => ucfirst($gateway),
                'created_by_id' => 1,
                'updated_by_id' => 1
            ]);
        }
        
        $sessionId = 'recurring_' . Str::uuid();
        $expiresAt = now()->addHour(); // 1 hour expiry for setup
        $checkoutData = [
            'type' => 'recurring_subscription_checkout',
            'plan_pricing_id' => $data->plan_pricing_id,
            'no_of_web_users' => $data->no_of_web_users,
            'no_of_app_users' => $data->no_of_app_users,
            'plan_name' => $planPricing->plan->name ?? 'Unknown Plan',
            'billing_cycle' => $planPricing->billing_cycle,
            'price_per_user' => $planPricing->price_per_user,
            'price_per_driver' => $planPricing->price_per_driver,
            'customer_data' => $data->customer ?? [],
            'metadata' => $data->metadata ?? [],
            'start_date' => $data->start_date ?: $this->calculateStartDate($planPricing->billing_cycle),
            'end_date' => $data->end_date ?? null,
            
            // IMPORTANT: Store conversion intent and subscription details
            'convert_to_subscription' => $data->convert_to_subscription ?? true, // Default true for recurring
            'subscription_start_date' => $data->start_date,
            'subscription_end_date' => $data->end_date,
            'is_recurring_request' => true,
            'created_at' => now()->toISOString()
        ];
        return Payment::create([
            // 'session_id' => $sessionId,
            'company_plan_id' => $companyPlanRelation->id,
            'company_uuid' => $data['company_uuid'],
            'user_uuid' => $data['user_uuid'],
            'plan_id' => $planPricing->plan_id,
            'total_amount' => $totalAmount,
            // 'transaction_id' => $sessionId,
            'status' => 'pending',
            'amount' => $totalAmount,
            
            // 'currency' => $planPricing->currency,
            'payment_gateway_id' => $paymentGateway->id,
            'payment_method' => 'direct_debit',
            'is_recurring' => true,
            // 'success_url' => $data['success_url'],
            // 'cancel_url' => $data['cancel_url'] ?? $data['exit_uri'],
            // 'expires_at' => $expiresAt,
            // 'is_recurring' => true, // Add this field to your payments table
            // 'billing_cycle' => $planPricing->billing_cycle,
            'next_payment_date' => $this->calculateNextBillingDate($planPricing->billing_cycle),
            
            'checkout_data' => $checkoutData,
            'created_by_id' => 1,
            'updated_by_id' => 1
        ]);
    }
    /**
     * Calculate next billing date
     */
    private function calculateNextBillingDate($billingCycle)
    {
        return match($billingCycle) {
            'monthly' => now()->addMonth(),
            'quarterly' => now()->addMonths(3),
            'annual' => now()->addYear(),
            default => now()->addMonth(),
        };
    }
    /**
     * Map billing cycle to GoCardless interval unit
     */
   
    /**
     * Calculate start date for subscription
     */
    private function calculateStartDate($billingCycle)
    {
        // Start subscription tomorrow or next business day
        $startDate = now()->addDay();
        
        // If it's weekend, move to next Monday
        if ($startDate->isWeekend()) {
            $startDate = $startDate->next('Monday');
        }
        
        return $startDate->format('Y-m-d');
    }
    /**
     * Handle successful return from GoCardless recurring billing request
     * Creates the ongoing subscription after first payment is successful
     */
    /**
 * Updated handleRecurringBillingSuccess - Payment ID focused approach
 */
public function handleRecurringBillingSuccess(Request $request)
{
    // Get payment_id from query parameters (most reliable method)
    $paymentId = $request->query('payment_id');
    $billingRequestFlowId = $request->query('billing_request_flow_id');
    
    Log::info('handleRecurringBillingSuccess called', [
        'payment_id_from_url' => $paymentId,
        'billing_request_flow_id' => $billingRequestFlowId,
        'all_query_params' => $request->query(),
        'user_agent' => $request->userAgent()
    ]);

    try {
        // Step 1: Find payment record using payment_id (primary method)
        $payment = null;
        
        if ($paymentId) {
            $payment = Payment::find($paymentId);
            Log::info('Payment lookup by ID', [
                'payment_id' => $paymentId,
                'found' => !!$payment
            ]);
        }

        // Step 2: Fallback methods if no payment_id provided
        if (!$payment) {
            Log::info('No payment_id provided, trying fallback methods');
            
            // Try session data (for backward compatibility)
            $sessionBillingRequestId = session('gocardless_billing_request_id');
            $sessionPaymentId = session('payment_id');
            
            if ($sessionPaymentId) {
                $payment = Payment::find($sessionPaymentId);
                Log::info('Found payment by session payment_id', ['found' => !!$payment]);
            } elseif ($sessionBillingRequestId) {
                $payment = Payment::where('checkout_session_id', $sessionBillingRequestId)->first();
                Log::info('Found payment by session billing_request_id', ['found' => !!$payment]);
            }
        }

        // Step 3: Last resort - find latest recurring payment with conversion intent
        if (!$payment) {
            $payment = Payment::where('is_recurring', true)
                            ->whereJsonContains('checkout_data->convert_to_subscription', true)
                            ->whereIn('status', ['processing', 'pending'])
                            ->latest()
                            ->first();
            Log::info('Found payment by latest recurring conversion intent', ['found' => !!$payment]);
        }

        if (!$payment) {
            Log::error('No payment found for recurring billing success');
            return response()->json([
                'success' => false,
                'error' => 'Payment record not found',
                'message' => 'Cannot process payment completion - payment record not found',
                'debug' => [
                    'payment_id_from_url' => $paymentId,
                    'billing_request_flow_id' => $billingRequestFlowId,
                    'session_payment_id' => session('payment_id'),
                    'session_billing_request_id' => session('gocardless_billing_request_id')
                ],
                'suggestion' => 'Ensure payment_id is included in success URL: ?payment_id=123'
            ], 404);
        }

        Log::info('Processing recurring billing success for payment', [
            'payment_id' => $payment->id,
            'billing_request_id' => $payment->checkout_session_id,
            'current_status' => $payment->status,
            'is_recurring' => $payment->is_recurring
        ]);

        // Step 4: Complete billing request flow if flow_id provided
        if ($billingRequestFlowId && method_exists($this->billingRequestService, 'completeBillingRequestFlow')) {
            try {
                Log::info('Completing billing request flow', ['flow_id' => $billingRequestFlowId]);
                $flowResponse = $this->billingRequestService->completeBillingRequestFlow($billingRequestFlowId);
                Log::info('Billing request flow completed successfully');
            } catch (Exception $e) {
                Log::warning('Failed to complete billing request flow - continuing anyway', [
                    'error' => $e->getMessage(),
                    'flow_id' => $billingRequestFlowId
                ]);
                // Continue processing even if flow completion fails
            }
        }

        // Step 5: Get billing request details from GoCardless
        $billingRequestId = $payment->checkout_session_id;
        
        if (!$billingRequestId) {
            throw new Exception('No billing request ID found in payment record');
        }

        $billingRequest = $this->billingRequestService->getBillingRequest($billingRequestId);
        
        if (!$billingRequest) {
            throw new Exception('Could not retrieve billing request details from GoCardless');
        }

        Log::info('Retrieved billing request details', [
            'billing_request_id' => $billingRequestId,
            'status' => $billingRequest['status']
        ]);

        // Extract created resources
        $paymentId = $billingRequest['payment_request']['links']['payment'] ?? null;
        $mandateId = $billingRequest['mandate_request']['links']['mandate'] ?? null;
        $customerId = $billingRequest['mandate_request']['links']['customer'] ?? null;

        // $responseData = [
        //     'billing_request_id' => $billingRequestId,
        //     'payment_id' => $paymentId,
        //     'mandate_id' => $mandateId,
        //     'customer_id' => $customerId,
        //     'customer_email' => $customerEmail,
        //     'amount' => $billingRequest['payment_request']['amount'] / 100, // Convert back to pounds
        //     'currency' => $billingRequest['payment_request']['currency'],
        //     'description' => $billingRequest['payment_request']['description'],
        //     'status' => $billingRequest['status']
        // ];
        
        $companyPlanRelation = CompanyPlanRelation::where('id', $payment->company_plan_id)->first();
        $planPricing = PlanPricingRelation::where('id', $companyPlanRelation->plan_pricing_id)->first();
        $calculatedStartDate = $this->calculateStartDate($planPricing->billing_cycle);
        $endDate = $this->calculateEndDate($planPricing->billing_cycle, $calculatedStartDate);
        $subscriptionData = [
            'amount' => $payment->amount * 100, // Convert to pence
            'currency' => $payment->currency,
            'name' => $planPricing->plan->name . ' Subscription',
            'interval_unit' => $this->billingRequestService->mapBillingCycleToInterval($planPricing->billing_cycle),
            'interval' => $this->billingRequestService->calculateIntervalCount($planPricing->billing_cycle),
            'day_of_month' => $this->billingRequestService->calculateDayOfMonth($calculatedStartDate),
            'start_date' => $calculatedStartDate,
            'end_date' => $endDate,
            'metadata' => [
                'payment_id' => (string) $payment->id,
                'plan_id' => (string) $planPricing->plan_id,
                'created_from' => 'payment_conversion'
            ]
        ];
        $this->billingRequestService->createSubscription($mandateId, $subscriptionData, $payment);

        // Step 13: Build response data
        $responseData = [
            'success' => true,
            // 'message' => $subscription ? 'Payment completed and subscription created successfully!' : 'Payment completed successfully!',
            // 'payment_id' => $payment->id,
            // 'billing_request_id' => $billingRequestId,
            // 'first_payment_id' => $firstPaymentId,
            // 'mandate_id' => $mandateId,
            // 'customer_id' => $customerId,
            // 'customer_email' => $sessionCustomerEmail,
            // 'first_payment_amount' => $billingRequest['payment_request']['amount'] / 100,
            // 'currency' => $billingRequest['payment_request']['currency'],
            // 'conversion_intent' => $conversionIntent,
            // 'subscription_created' => !!$subscription,
            'is_recurring' => true
        ];

        // if ($subscription) {
        //     $responseData['subscription_data'] = [
        //         'subscription_id' => $subscription['id'],
        //         'subscription_status' => $subscription['status'],
        //         'recurring_amount' => $subscription['amount'] / 100,
        //         'currency' => $subscription['currency'],
        //         'interval_unit' => $subscription['interval_unit'],
        //         'next_charge_date' => $subscription['upcoming_payments'][0]['charge_date'] ?? null
        //     ];
        // }

        // Step 14: Clear session data
        session()->forget([
            'gocardless_billing_request_id',
            'gocardless_billing_request_flow_id',
            'gocardless_subscription_data',
            'gocardless_customer_email',
            'is_recurring',
            'payment_id',
            'conversion_intent',
            'subscription_start_date',
            'subscription_end_date'
        ]);

        Log::info('Recurring billing success completed successfully', $responseData);

        // Return JSON response (better for APIs than redirects)
        return response()->json($responseData);

    } catch (Exception $e) {
        Log::error('Recurring billing success processing failed', [
            'payment_id' => $paymentId,
            'billing_request_flow_id' => $billingRequestFlowId,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'success' => false,
            'error' => 'Failed to process recurring billing success',
            'message' => $e->getMessage(),
            'payment_id' => $paymentId,
            'billing_request_flow_id' => $billingRequestFlowId
        ], 500);
    }
}
protected function calculateEndDate($billingCycle, $startDate)
{
    $date = \Carbon\Carbon::parse($startDate);

    switch ($billingCycle) {
        case 'monthly':
            return $date->addMonth()->toDateString();
        case 'quarterly':
            return $date->addMonths(3)->toDateString();
        case 'annual':
            return $date->addYear()->toDateString();
        default:
            return $date->addMonth()->toDateString();
    }
}

/**
 * Remove the handleBillingSuccessWithBillingRequestId method reference
 * or create a simple version that redirects to the main handler
 */
private function handleBillingSuccessWithBillingRequestId($request, $billingRequestId)
{
    Log::info('Redirecting to main success handler', [
        'billing_request_id' => $billingRequestId
    ]);

    // Find payment by billing request ID
    $payment = Payment::where('checkout_session_id', $billingRequestId)->first();
    
    if ($payment) {
        // Add payment_id to request and call main handler
        $request->merge(['payment_id' => $payment->id]);
        return $this->handleRecurringBillingSuccess($request);
    }

    return response()->json([
        'success' => false,
        'error' => 'Payment not found for billing request',
        'billing_request_id' => $billingRequestId
    ], 404);
}


    /**
     * Update payment record with subscription data including first payment
     */
    private function updatePaymentWithSubscriptionData($paymentId, $subscriptionId, $mandateId, $firstPaymentId = null)
    {
        $payment = Payment::find($paymentId);
        
        if ($payment) {
            $updateData = [
                'gocardless_subscription_id' => $subscriptionId,
                'gocardless_mandate_id' => $mandateId,
                'status' => 'active',
                'is_recurring' => true
            ];
            
            // Add first payment ID if available
            if ($firstPaymentId) {
                $updateData['gocardless_payment_id'] = $firstPaymentId;
            }
            
            $payment->update($updateData);
            
            Log::info('Payment updated with subscription and first payment details', [
                'payment_id' => $paymentId,
                'subscription_id' => $subscriptionId,
                'mandate_id' => $mandateId,
                'first_payment_id' => $firstPaymentId
            ]);
        }
    }

    /**
     * Activate company plan subscription
     */
    private function activateCompanyPlanSubscription($billingRequestId)
    {
        try {
            $payment = Payment::where('checkout_session_id', $billingRequestId)->first();
            
            if ($payment && $payment->companyPlanRelation) {
                $payment->companyPlanRelation->update([
                    'status' => 'active',
                    'activated_at' => now()
                ]);
                
                Log::info('Company plan relation activated', [
                    'company_plan_relation_id' => $payment->companyPlanRelation->id,
                    'billing_request_id' => $billingRequestId
                ]);
            }
        } catch (Exception $e) {
            Log::error('Failed to activate company plan relation', [
                'billing_request_id' => $billingRequestId,
                'error' => $e->getMessage()
            ]);
        }
    }


// Debug methods to find out why subscription wasn't created

/**
 * Debug endpoint to check what happened with your billing request
 */
public function debugBillingRequest($billingRequestId = 'BRQ000AZ4TAXQ02')
{
    try {
        Log::info('Starting debug for billing request', ['billing_request_id' => $billingRequestId]);

        // 1. Check if payment record exists in your database
        $payment = Payment::where('checkout_session_id', $billingRequestId)->first();
        
        if (!$payment) {
            return response()->json([
                'error' => 'Payment record not found in database',
                'billing_request_id' => $billingRequestId,
                'suggestion' => 'Check if payment was created correctly'
            ]);
        }

        // 2. Check payment checkout_data for conversion intent
        $checkoutData = $payment->checkout_data ?? [];
        $conversionIntent = $checkoutData['convert_to_subscription'] ?? false;

        // 3. Get GoCardless billing request details
        $billingRequest = $this->billingRequestService->getBillingRequest($billingRequestId);
        
        // 4. Extract mandate and payment IDs
        $mandateId = $billingRequest['mandate_request']['links']['mandate'] ?? null;
        $gocardlessPaymentId = $billingRequest['payment_request']['links']['payment'] ?? null;

        // 5. Check if success handler was called
        $successHandlerCalled = $payment->status === 'completed' && 
                               $payment->gocardless_payment_id && 
                               $payment->gocardless_mandate_id;

        $debugInfo = [
            'billing_request_id' => $billingRequestId,
            'database_payment' => [
                'id' => $payment->id,
                'status' => $payment->status,
                'gocardless_payment_id' => $payment->gocardless_payment_id,
                'gocardless_mandate_id' => $payment->gocardless_mandate_id,
                'gocardless_subscription_id' => $payment->gocardless_subscription_id ?? null,
                'is_recurring' => $payment->is_recurring ?? false,
                'checkout_data' => $checkoutData
            ],
            'gocardless_billing_request' => [
                'id' => $billingRequest['id'],
                'status' => $billingRequest['status'],
                'mandate_id' => $mandateId,
                'payment_id' => $gocardlessPaymentId,
                'metadata' => $billingRequest['metadata'] ?? []
            ],
            'conversion_analysis' => [
                'conversion_intent_in_checkout_data' => $conversionIntent,
                'has_mandate_id' => !empty($mandateId),
                'success_handler_called' => $successHandlerCalled,
                'subscription_start_date' => $checkoutData['subscription_start_date'] ?? null,
                'subscription_end_date' => $checkoutData['subscription_end_date'] ?? null
            ],
            'next_steps' => []
        ];

        // Determine what went wrong
        if (!$conversionIntent) {
            $debugInfo['next_steps'][] = 'conversion_intent is false - check if convert_to_subscription was properly stored';
        }

        if (!$mandateId) {
            $debugInfo['next_steps'][] = 'No mandate ID found - mandate creation failed';
        }

        if (!$successHandlerCalled) {
            $debugInfo['next_steps'][] = 'Success handler was not called - check if GoCardless redirected to success URL';
        }

        if ($conversionIntent && $mandateId && $successHandlerCalled) {
            $debugInfo['next_steps'][] = 'All conditions met but subscription not created - check autoConvertToSubscription method';
        }

        return response()->json($debugInfo);

    } catch (Exception $e) {
        return response()->json([
            'error' => 'Debug failed',
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
    }
}

/**
 * Manual conversion trigger for testing
 */
public function manualConversion($billingRequestId = 'BRQ000AZ4TAXQ02')
{
    try {
        Log::info('Starting manual conversion', ['billing_request_id' => $billingRequestId]);

        $payment = Payment::where('checkout_session_id', $billingRequestId)->first();
        
        if (!$payment) {
            return response()->json([
                'error' => 'Payment not found',
                'billing_request_id' => $billingRequestId
            ], 404);
        }

        // Get billing request details to get mandate ID
        $billingRequest = $this->billingRequestService->getBillingRequest($billingRequestId);
        $mandateId = $billingRequest['mandate_request']['links']['mandate'] ?? null;
        $gocardlessPaymentId = $billingRequest['payment_request']['links']['payment'] ?? null;

        // Update payment record if not already updated
        if (!$payment->gocardless_mandate_id || !$payment->gocardless_payment_id) {
            $payment->update([
                'gocardless_payment_id' => $gocardlessPaymentId,
                'gocardless_mandate_id' => $mandateId,
                'status' => 'completed'
            ]);
            
            Log::info('Updated payment record', [
                'payment_id' => $payment->id,
                'mandate_id' => $mandateId,
                'gocardless_payment_id' => $gocardlessPaymentId
            ]);
        }

        // Get conversion data from checkout_data
        $checkoutData = $payment->checkout_data ?? [];
        $subscriptionStartDate = $checkoutData['subscription_start_date'] ?? null;
        $subscriptionEndDate = $checkoutData['subscription_end_date'] ?? null;

        if (!$mandateId) {
            return response()->json([
                'error' => 'No mandate ID available',
                'payment_id' => $payment->id
            ], 400);
        }

        Log::info('Attempting manual conversion', [
            'payment_id' => $payment->id,
            'mandate_id' => $mandateId,
            'start_date' => $subscriptionStartDate,
            'end_date' => $subscriptionEndDate
        ]);

        // Attempt conversion
        $conversionResult = $this->autoConvertToSubscription($payment, $subscriptionStartDate, $subscriptionEndDate);

        if ($conversionResult) {
            return response()->json([
                'success' => true,
                'message' => 'Subscription created successfully!',
                'payment_id' => $payment->id,
                'conversion_result' => $conversionResult
            ]);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Conversion failed - check logs for details',
                'payment_id' => $payment->id
            ], 500);
        }

    } catch (Exception $e) {
        Log::error('Manual conversion failed', [
            'error' => $e->getMessage(),
            'billing_request_id' => $billingRequestId
        ]);

        return response()->json([
            'success' => false,
            'error' => 'Manual conversion failed',
            'message' => $e->getMessage()
        ], 500);
    }
}

/**
 * Enhanced autoConvertToSubscription with better error handling
 */
private function autoConvertToSubscription($payment, $startDate = null, $endDate = null)
{
    try {
        Log::info('Starting auto-conversion to subscription', [
            'payment_id' => $payment->id,
            'mandate_id' => $payment->gocardless_mandate_id,
            'start_date' => $startDate,
            'end_date' => $endDate
        ]);

        if (!$payment->gocardless_mandate_id) {
            Log::warning('Cannot auto-convert to subscription: No mandate available', [
                'payment_id' => $payment->id
            ]);
            return false;
        }

        // Load the plan pricing relationship
        $payment->load('companyPlanRelation.planPricing.plan');
        $planPricing = $payment->companyPlanRelation->planPricing;
        
        if (!$planPricing) {
            Log::error('Cannot convert: Plan pricing not found', [
                'payment_id' => $payment->id,
                'company_plan_id' => $payment->company_plan_id
            ]);
            return false;
        }

        // Ensure start date is properly formatted and in the future
        $calculatedStartDate = $startDate ?: $this->calculateStartDate($planPricing->billing_cycle);
        if ($startDate && $startDate <= date('Y-m-d')) {
            $calculatedStartDate = date('Y-m-d', strtotime('+1 day'));
        }

        $subscriptionData = [
            'amount' => $payment->amount * 100, // Convert to pence
            'currency' => $payment->currency,
            'name' => $planPricing->plan->name . ' Subscription',
            'interval_unit' => $this->billingRequestService->mapBillingCycleToInterval($planPricing->billing_cycle),
            'interval' => $this->billingRequestService->calculateIntervalCount($planPricing->billing_cycle),
            'day_of_month' => $this->billingRequestService->calculateDayOfMonth($calculatedStartDate),
            'start_date' => $calculatedStartDate,
            'end_date' => $endDate,
            'metadata' => $this->buildSubscriptionMetadataFromPayment($payment)
        ];

        Log::info('Creating subscription with data', [
            'payment_id' => $payment->id,
            'subscription_data' => $subscriptionData
        ]);

        // Check if createSubscription method exists
        if (!method_exists($this->billingRequestService, 'createSubscription')) {
            Log::error('createSubscription method not found in billing request service');
            throw new Exception('createSubscription method not implemented in GoCardlessBillingRequestService');
        }

        $subscription = $this->billingRequestService->createSubscription(
            $payment->gocardless_mandate_id, 
            $subscriptionData, $payment
        );

        Log::info('Subscription created successfully', [
            'payment_id' => $payment->id,
            'subscription_id' => $subscription['id'],
            'subscription_status' => $subscription['status'],
            'subscription_amount' => $subscription['amount']
        ]);

        $this->updatePaymentToSubscription($payment, $subscription);
        $this->updateCompanyPlanForSubscription($payment->companyPlanRelation, $subscription);

        return [
            'subscription_id' => $subscription['id'],
            'next_charge_date' => $subscription['upcoming_payments'][0]['charge_date'] ?? null,
            'status' => $subscription['status'],
            'amount' => $subscription['amount'] / 100
        ];

    } catch (Exception $e) {
        Log::error('Failed to auto-convert payment to subscription', [
            'payment_id' => $payment->id,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return false;
    }
}
private function addPaymentIdToSuccessUrl($successUrl, $paymentId)
{
    // Check if URL already has query parameters
    $separator = str_contains($successUrl, '?') ? '&' : '?';
    $enhancedUrl = $successUrl . $separator . 'payment_id=' . $paymentId;
    
    Log::info('Enhanced success URL with payment_id', [
        'original_url' => $successUrl,
        'enhanced_url' => $enhancedUrl,
        'payment_id' => $paymentId
    ]);
    
    return $enhancedUrl;
}

public function testCreateSubscription(Request $request)
{
    try {
        // Get test data from request or use defaults
        $paymentId = $request->input('payment_id', 160); // Use your existing payment ID
        $mandateId = $request->input('mandate_id', 'MD123TEST'); // Use a test mandate ID
        $startDate = $request->input('start_date', null);
        $endDate = $request->input('end_date', null);
        
        // Find the payment
        $payment = Payment::find($paymentId);
        
        if (!$payment) {
            return response()->json([
                'success' => false,
                'error' => 'Payment not found',
                'payment_id' => $paymentId
            ], 404);
        }
        
        Log::info('Testing subscription creation', [
            'payment_id' => $paymentId,
            'mandate_id' => $mandateId,
            'payment_data' => $payment->toArray()
        ]);
        
        // Call your method
        $subscription = $this->billingRequestService->createSubscriptionFromPayment($payment, $mandateId, $startDate, $endDate);
        
        if ($subscription) {
            return response()->json([
                'success' => true,
                'message' => 'Subscription created successfully',
                'subscription' => $subscription,
                'payment_id' => $paymentId
            ]);
        } else {
            return response()->json([
                'success' => false,
                'error' => 'Subscription creation returned null',
                'payment_id' => $paymentId
            ], 500);
        }
        
    } catch (Exception $e) {
        Log::error('Test subscription creation failed', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
            'payment_id' => $request->input('payment_id')
        ], 500);
    }
}
}

