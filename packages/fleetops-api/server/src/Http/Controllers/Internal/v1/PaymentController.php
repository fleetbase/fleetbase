<?php

namespace Fleetbase\FleetOps\Http\Controllers\Internal\v1;

use Fleetbase\FleetOps\Models\PurchaseRate;
use Fleetbase\FleetOps\Support\Payment;
use Fleetbase\Http\Controllers\Controller;
use Fleetbase\Http\Resources\FleetbaseResource;
use Fleetbase\Support\Auth;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    /**
     * Checks if the currently authenticated company has an associated Stripe Connect account.
     *
     * This method verifies if the authenticated company has a Stripe Connect ID that starts with 'acct_'.
     *
     * @return \Illuminate\Http\JsonResponse returns a JSON response indicating the presence of a Stripe Connect account
     */
    public function hasStripeConnectAccount()
    {
        $company = Auth::getCompany();
        if ($company) {
            return response()->json([
                'hasStripeConnectAccount' => !empty($company->stripe_connect_id) && Str::startsWith($company->stripe_connect_id, 'acct_'),
            ]);
        }

        return response()->json([
            'hasStripeConnectAccount' => false,
        ]);
    }

    /**
     * Creates a new Stripe account for the currently authenticated company and stores the account ID.
     *
     * This method utilizes the Fleetbase utility class to create a Stripe Express account and saves the
     * Stripe account ID to the current company's profile. In case of failure, it returns an error.
     *
     * @return \Illuminate\Http\JsonResponse returns the Stripe account ID or an error message in JSON format
     */
    public function getStripeAccount()
    {
        $stripe = Payment::getStripeClient();

        try {
            $account = $stripe->accounts->create([
                'controller' => [
                    'stripe_dashboard' => [
                        'type' => 'express',
                    ],
                    'fees' => [
                        'payer' => 'application',
                    ],
                    'losses' => [
                        'payments' => 'application',
                    ],
                ],
            ]);

            // Save account ID to current company session
            $company = Auth::getCompany();
            if ($company) {
                $company->update(['stripe_connect_id' => $account->id]);
            }

            return response()->json(['account' => $account->id]);
        } catch (\Exception $e) {
            return response()->error($e->getMessage());
        }
    }

    /**
     * Creates a Stripe account session for account onboarding or management.
     *
     * This method creates a session for the current company's Stripe account, allowing for onboarding or management activities.
     * It accepts an 'account' parameter from the request, defaulting to the company's stored Stripe Connect ID if not provided.
     *
     * @param Request $request the incoming HTTP request containing optional 'account' parameter
     *
     * @return \Illuminate\Http\JsonResponse returns a JSON response with the session's client secret or an error message
     */
    public function getStripeAccountSession(Request $request)
    {
        $stripe  = Payment::getStripeClient();
        $company = Auth::getCompany();

        try {
            $accountSession = $stripe->accountSessions->create([
                'account'    => $request->input('account', $company->stripe_connect_id),
                'components' => [
                    'account_onboarding' => [
                        'enabled' => true,
                    ],
                ],
            ]);

            return response()->json([
                'clientSecret' => $accountSession->client_secret,
            ]);
        } catch (\Exception $e) {
            return response()->error($e->getMessage());
        }
    }

    /**
     * Get the total amount a company has received in purchase rates.
     *
     * @return \Illuminate\Http\Response
     */
    public function getCompanyReceivedPayments(Request $request)
    {
        $limit     = $request->input('limit', 30);
        $query     = PurchaseRate::select(
            [
                'uuid',
                'public_id',
                'company_uuid',
                'customer_uuid',
                'customer_type',
                'service_quote_uuid',
                'transaction_uuid',
                'status',
                'meta',
                'created_at',
            ]
        )
        ->where('company_uuid', session('company'))
        ->whereHas('serviceQuote',
            function ($query) {
                $query->select(['uuid', 'public_id', 'amount', 'currency', 'meta']);
                $query->without(['payload', 'serviceRate']);
            }
        )
        ->whereHas('order',
            function ($query) {
                $query->whereNull('deleted_at');
            }
        )
        ->without(['company', 'payload'])
        ->with(
            [
                'serviceQuote',
                'customer',
                'transaction' => function ($query) {
                    $query->select(['uuid', 'public_id']);
                },
                'order' => function ($query) {
                    $query->select(['uuid', 'public_id', 'purchase_rate_uuid']);
                },
            ]
        );

        // Handle sorting
        app(PurchaseRate::class)->applySorts($request, $query);

        $payments                   = $query->fastPaginate($limit);
        $paymentsCollection         = $query->get();

        // Calculate totals grouped by currency
        $totals = [];
        foreach ($paymentsCollection as $payment) {
            $currency = $payment->serviceQuote->currency;
            $amount   = $payment->serviceQuote->amount;
            if (!isset($totals[$currency])) {
                $totals[$currency] = 0;
            }

            $totals[$currency] += $amount;
        }

        return FleetbaseResource::collection($payments)->additional(['amount_totals' => $totals]);
    }
}
