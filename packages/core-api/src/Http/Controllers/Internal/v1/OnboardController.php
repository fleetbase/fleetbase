<?php

namespace Fleetbase\Http\Controllers\Internal\v1;

use Fleetbase\Events\AccountCreated;
use Fleetbase\Http\Controllers\Controller;
use Fleetbase\Http\Requests\OnboardRequest;
use Fleetbase\Models\Company;
use Fleetbase\Models\User;
use Fleetbase\Models\VerificationCode;
use App\Models\CompanyPlanRelation;
use App\Models\PlanPricingRelation;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class OnboardController extends Controller
{
    /**
     * Checks to see if this is the first time Fleetbase is being used by checking if any organizations exists.
     *
     * @return \Illuminate\Http\Response
     */
    public function shouldOnboard()
    {
        return response()->json(
            [
                'should_onboard' => Company::doesntExist(),
            ]
        );
    }

    /**
     * Onboard a new account and send send to verify email.
     *
     * @return \Illuminate\Http\Response
     */
    public function createAccount(OnboardRequest $request)
    {
        // if first user make admin
        $isAdmin = !User::exists();
        // Get user properties
        $name        = $request->input('name');
        $email       = $request->input('email');
        $phone       = $request->input('phone');
        $timezone    = $request->input('timezone', date_default_timezone_get());
        $username    = Str::slug($name . '_' . Str::random(4), '_');
        $numberOfDrivers = $request->input('number_of_drivers');
        $numberOfWebUsers = $request->input('number_of_web_users');

        if (empty($numberOfDrivers) || empty($numberOfWebUsers) || empty($name) || empty($email) || empty($phone)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Please fill the required fields'
            ], 422);
        }
        // Prepare user attributes
        $attributes = User::applyUserInfoFromRequest($request, [
            'name'       => $name,
            'email'      => $email,
            'phone'      => $phone,
            'username'   => $username,
            'ip_address' => $request->ip(),
            'timezone'   => $timezone,
            'status'     => 'active',
            'last_login' => $isAdmin ? now() : null,
        ]);

        // create user account
        $user = User::create($attributes);

        // set the user password
        $user->password = $request->input('password');

        // set the user type
        $user->setUserType($isAdmin ? 'admin' : 'user');

        // create company
        $languageId = $request->input('language_id',1);
        $numberOfDrivers = $request->input('number_of_drivers');
        $numberOfWebUsers = $request->input('number_of_web_users');
        $company = new Company(['name' => $request->input('organization_name'), 'parking_zone_max_distance' => config('services.parking_radius_in_miles'), 'language_id' => $languageId, 'number_of_drivers' => $numberOfDrivers, 'number_of_web_users' => $numberOfWebUsers]);
        $company->setOwner($user)->save();

        // assign user to organization
        $user->assignCompany($company, 'Administrator');

        // assign admin role
        $user->assignSingleRole('Administrator');

        // send account created event

        // create auth token
        $token = $user->createToken($user->uuid);

        return response()->json([
            'status'           => 'success',
            'session'          => base64_encode($user->uuid),
            'token'            => $isAdmin ? $token->plainTextToken : null,
            'skipVerification' => $isAdmin,
            'user_uuid'        => $user->uuid,
            'company_uuid'     => $company->uuid,
        ]);
    }

    /**
     * Send/Resend verification email.
     *
     * @param \\Illuminate\Http\Request $request
     *
     * @return \Illuminate\Http\Response $response
     */
    public function sendVerificationEmail(Request $request)
    {
        $id           = $request->input('session');
        $email        = $request->input('email');
        $decodedId    = base64_decode($id);

        // Get user using id
        $user = User::where('uuid', $decodedId)->first();
        if ($user && $user->email !== $email) {
            return response()->error('Email address provided does not match for this verification session.');
        }

        if ($user) {
            // create verification code
            VerificationCode::generateEmailVerificationFor($user);
        } else {
            return response()->error('No user found with provided email address.');
        }

        return response()->json([
            'status' => 'ok',
        ]);
    }

    /**
     * Send/Resend verification SMS.
     *
     * @param \\Illuminate\Http\Request $request
     *
     * @return \Illuminate\Http\Response $response
     */
    public function sendVerificationSms(Request $request)
    {
        $id           = $request->input('session');
        $phone        = $request->input('phone');
        $decodedId    = base64_decode($id);

        // Get user using id
        $user = User::where('uuid', $decodedId)->first();
        if ($user->phone !== $phone) {
            return response()->error('Phone number provided does not match for this verification session.');
        }

        if ($user) {
            // create verification code
            VerificationCode::generateSmsVerificationFor($user);
        }

        return response()->json([
            'status' => 'ok',
        ]);
    }

    /**
     * Verfiy and validate an email address with code.
     *
     * @param \\Illuminate\Http\Request $request
     *
     * @return \Illuminate\Http\Response $response
     */
    public function verifyEmail(Request $request)
    {
        // users uuid as session
        $session = $request->input('session');
        $code    = $request->input('code');

        // decode session
        if (!Str::isUuid($session)) {
            $session = base64_decode($session);
        }

        // if still not valid check session
        if (!Str::isUuid($session)) {
            $session = session('user');
        }

        // make sure session is found
        if (!$session) {
            return response()->error('No session to verify email for.');
        }

        // get verification code for session
        $verifyCode = VerificationCode::where([
            'subject_uuid' => $session,
            'for'          => 'email_verification',
            'code'         => $code,
        ])->first();

        // check if sms verification
        if (!$verifyCode) {
            $verifyCode = VerificationCode::where([
                'subject_uuid' => $session,
                'for'          => 'phone_verification',
                'code'         => $code,
            ])->first();
        }

        // no verification code found
        if (!$verifyCode) {
            return response()->error('Invalid verification code.');
        }

        // get user
        $user = $request->user();
        if (!$user) {
            $user = User::where('uuid', $session)->first();
        }

        // Handle no user
        if (!$user) {
            return response()->error('No user found using this email.');
        }

        // get verify time
        $verifiedAt = Carbon::now();

        // verify users email address or phone depending
        if ($verifyCode->for === 'email_verification') {
            $user->email_verified_at = $verifiedAt;
        } elseif ($verifyCode->for === 'phone_verification') {
            $user->phone_verified_at = $verifiedAt;
        }

        $user->status = 'active';
        $user->updateLastLogin();
        $token = $user->createToken($user->uuid);

        return response()->json([
            'status'      => 'ok',
            'verified_at' => $verifiedAt,
            'token'       => $token->plainTextToken,
        ]);
    }

    /**
     * Get subscription status for a user and company.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function getSubscriptionStatus(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'user_id' => 'required|string|uuid',
                'company_id' => 'required|string|uuid',
            ]);

            $userId = $request->input('user_id');
            $companyId = $request->input('company_id');

            // Check if user exists
            $user = User::where('uuid', $userId)->first();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found',
                    'data' => null
                ], 404);
            }

            // Check if company exists
            $company = Company::where('uuid', $companyId)->first();
            if (!$company) {
                return response()->json([
                    'success' => false,
                    'message' => 'Company not found',
                    'data' => null
                ], 404);
            }

            // Check for existing subscription
            $subscription = CompanyPlanRelation::where('user_uuid', $userId)
                ->where('company_uuid', $companyId)
                ->where('deleted', 0)
                ->first();

            if ($subscription) {
                return response()->json([
                    'success' => true,
                    'message' => 'Subscription found',
                    'data' => [
                        'subscription' => $subscription,
                        'status' => $subscription->status,
                        'verification_pending' => !$user->email_verified_at,
                        'user_verified' => $user->email_verified_at ? true : false,
                    ]
                ], 200);
            }

            // No subscription found
            return response()->json([
                'success' => true,
                'message' => 'No subscription found',
                'data' => null
            ], 200);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to check subscription status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a subscription for a user and company with comprehensive billing details.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function createSubscription(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'plan_pricing_id' => 'required|integer|exists:plan_pricing_relation,id',
                'company_uuid' => 'required|string|uuid',
                'user_uuid' => 'required|string|uuid',
                'no_of_web_users' => 'required|integer|min:1',
                'no_of_app_users' => 'required|integer|min:0',
                'description' => 'nullable|string',
                'success_url' => 'required|url',
                'exit_uri' => 'required|url',
                'customer' => 'required|array',
                'customer.given_name' => 'required|string',
                'customer.family_name' => 'required|string',
                'customer.email' => 'required|email',
                'convert_to_subscription' => 'boolean',
                'subscription_start_date' => 'nullable|date',
                'subscription_end_date' => 'nullable|date',
            ]);

            $planPricingId = $request->input('plan_pricing_id');
            $companyUuid = $request->input('company_uuid');
            $userUuid = $request->input('user_uuid');
            $noOfWebUsers = $request->input('no_of_web_users');
            $noOfAppUsers = $request->input('no_of_app_users');
            $description = $request->input('description');
            $successUrl = $request->input('success_url');
            $exitUri = $request->input('exit_uri');
            $customer = $request->input('customer');
            $convertToSubscription = $request->input('convert_to_subscription', true);
            $subscriptionStartDate = $request->input('subscription_start_date');
            $subscriptionEndDate = $request->input('subscription_end_date');

            // Check if user exists
            $user = User::where('uuid', $userUuid)->first();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found',
                    'data' => null
                ], 404);
            }

            // Check if company exists
            $company = Company::where('uuid', $companyUuid)->first();
            if (!$company) {
                return response()->json([
                    'success' => false,
                    'message' => 'Company not found',
                    'data' => null
                ], 404);
            }

            // Check if plan pricing exists
            $planPricing = PlanPricingRelation::where('id', $planPricingId)
                ->where('deleted', 0)
                ->where('record_status', 1)
                ->first();

            if (!$planPricing) {
                return response()->json([
                    'success' => false,
                    'message' => 'Plan pricing not found',
                    'data' => null
                ], 404);
            }

            // Check if subscription already exists
            $existingSubscription = CompanyPlanRelation::where('user_uuid', $userUuid)
                ->where('company_uuid', $companyUuid)
                ->where('deleted', 0)
                ->first();

            if ($existingSubscription) {
                return response()->json([
                    'success' => true,
                    'message' => 'Subscription already exists',
                    'data' => [
                        'subscription' => $existingSubscription,
                        'status' => $existingSubscription->status,
                        'verification_pending' => !$user->email_verified_at,
                    ]
                ], 200);
            }

            // Calculate total amount based on plan pricing and user counts
            $totalAmount = ($planPricing->price_per_user * $noOfWebUsers) + 
                          ($planPricing->price_per_driver * $noOfAppUsers);

            // Set subscription dates
            $startDate = $subscriptionStartDate ? Carbon::parse($subscriptionStartDate) : now();
            $endDate = $subscriptionEndDate ? Carbon::parse($subscriptionEndDate) : $startDate->copy()->addMonth();

            // Create subscription
            $subscription = CompanyPlanRelation::create([
                'company_uuid' => $companyUuid,
                'user_uuid' => $userUuid,
                'plan_pricing_id' => $planPricingId,
                'no_of_web_users' => $noOfWebUsers,
                'no_of_app_users' => $noOfAppUsers,
                'total_amount' => $totalAmount,
                'status' => 'pending',
                'auto_renew' => $convertToSubscription,
                'expires_at' => $endDate,
                'created_by_id' => $user->id,
                'updated_by_id' => $user->id,
            ]);

            // Update company user counts
            $company->update([
                'number_of_web_users' => $noOfWebUsers,
                'number_of_drivers' => $noOfAppUsers,
            ]);

            // Create billing request for payment
            try {
                $billingRequestData = [
                    'plan_pricing_id' => $planPricingId,
                    'company_uuid' => $companyUuid,
                    'user_uuid' => $userUuid,
                    'no_of_web_users' => $noOfWebUsers,
                    'no_of_app_users' => $noOfAppUsers,
                    'description' => $description,
                    'success_url' => $successUrl,
                    'exit_uri' => $exitUri,
                    'customer' => $customer,
                    'convert_to_subscription' => $convertToSubscription,
                    'subscription_start_date' => $subscriptionStartDate,
                    'subscription_end_date' => $subscriptionEndDate,
                ];

                // Call billing request controller to create payment flow
                $billingRequestController = new \Fleetbase\Http\Controllers\Internal\v1\BillingRequestController();
                $billingRequest = $billingRequestController->createBillingRequest(new \Illuminate\Http\Request($billingRequestData));

                if ($billingRequest && isset($billingRequest->getData()->redirect_url)) {
                    $paymentUrl = $billingRequest->getData()->redirect_url;
                    
                    return response()->json([
                        'success' => true,
                        'message' => 'Subscription created, payment required',
                        'data' => [
                            'subscription' => $subscription,
                            'plan_details' => [
                                'plan_id' => $planPricing->plan->id ?? null,
                                'plan_name' => $planPricing->plan->name ?? null,
                                'billing_cycle' => $planPricing->billing_cycle,
                                'price_per_user' => $planPricing->price_per_user,
                                'price_per_driver' => $planPricing->price_per_driver,
                                'currency' => $planPricing->currency,
                                'total_amount' => $totalAmount,
                            ],
                            'payment_url' => $paymentUrl,
                            'billing_request_id' => $billingRequest->getData()->billing_request_id ?? null,
                            // Don't set verification_pending here - verification happens after payment
                        ]
                    ], 200);
                }
            } catch (\Exception $e) {
                \Log::error('Failed to create billing request: ' . $e->getMessage());
            }

            // Check if user needs verification
            $verificationPending = !$user->email_verified_at;

            if ($verificationPending) {
                // Create verification session
                $session = base64_encode($user->uuid);
                VerificationCode::generateEmailVerificationFor($user);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Subscription created, verification required',
                    'data' => [
                        'subscription' => $subscription,
                        'plan_details' => [
                            'plan_id' => $planPricing->plan->id ?? null,
                            'plan_name' => $planPricing->plan->name ?? null,
                            'billing_cycle' => $planPricing->billing_cycle,
                            'price_per_user' => $planPricing->price_per_user,
                            'price_per_driver' => $planPricing->price_per_driver,
                            'currency' => $planPricing->currency,
                            'total_amount' => $totalAmount,
                        ],
                        'verification_pending' => true,
                        'requires_verification' => true,
                        'token' => $session,
                        'session' => $session,
                    ]
                ], 200);
            }

            return response()->json([
                'success' => true,
                'message' => 'Subscription created successfully',
                'data' => [
                    'subscription' => $subscription,
                    'plan_details' => [
                        'plan_id' => $planPricing->plan->id ?? null,
                        'plan_name' => $planPricing->plan->name ?? null,
                        'billing_cycle' => $planPricing->billing_cycle,
                        'price_per_user' => $planPricing->price_per_user,
                        'price_per_driver' => $planPricing->price_per_driver,
                        'currency' => $planPricing->currency,
                        'total_amount' => $totalAmount,
                    ],
                    'verification_pending' => false,
                    'requires_verification' => false,
                ]
            ], 200);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create subscription',
                'error' => $e->getMessage()
            ], 500);
        }
    }
    public function handleBillingSuccess(Request $request)
    {
        try {
            $sessionToken = $request->input('session');
            $subscriptionId = $request->input('subscription_id');
            $customerId = $request->input('customer_id');
            $invoiceId = $request->input('invoice_id');
            $paymentStatus = $request->input('payment_status');
            $userUuid = $request->input('user_uuid');
            $companyUuid = $request->input('company_uuid');
            
            // if (!$sessionToken) {
            //     return response()->json(['error' => 'Session token required'], 400);
            // }

            // Find user by session token (adjust this logic based on your session handling)
            $user = User::where('uuid', $userUuid)->first();
            
            if (!$user) {
                return response()->json(['error' => 'User not found'], 404);
            }

            // Update user with Chargebee details
            $user->update([
                'chargebee_subscription_id' => $subscriptionId,
                'chargebee_customer_id' => $customerId,
                'subscription_status' => 'active',
                'subscribed_at' => now()
            ]);
            // send account created event
            event(new AccountCreated($user, $user->company));
            return response()->json([
                'success' => true,
                'message' => 'Billing information updated successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Billing success handling failed: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to update billing information'], 500);
        }
    }
}
