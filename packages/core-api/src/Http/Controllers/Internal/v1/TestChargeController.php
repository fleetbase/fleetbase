<?php

namespace Fleetbase\Http\Controllers\Internal\v1;

use Illuminate\Http\Request;
use Fleetbase\Models\Subscription;
use Carbon\Carbon;
use Fleetbase\Services\GoCardlessService;
use Exception;
use App\Http\Controllers\Controller;


class TestChargeController extends Controller
{
    
    protected $goCardlessService;


    public function __construct(GoCardlessService $goCardlessService)
    {
        $this->goCardlessService = $goCardlessService;
       
    }

    public function changeChargeDate(Request $request)
    {
        $request->validate([
            'subscription_id' => 'required|string',
            'new_charge_date' => 'required|date|after:today',
        ]);

        try {
            $subscription = Subscription::where('gocardless_subscription_id', $request->subscription_id)->firstOrFail();
            
            // Method 1: Update via GoCardless API
            $updatedSubscription = $this->goCardlessService->updateSubscriptionChargeDate(
                $request->subscription_id,
                $request->new_charge_date
            );

            // Update local database
            $subscription->update([
                'next_payment_date' => Carbon::parse($request->new_charge_date),
                'gocardless_subscription_id' => $updatedSubscription['id'] ?? $request->subscription_id // in case it was recreated
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Charge date updated successfully',
                'old_charge_date' => $subscription->next_payment_date ? $subscription->next_payment_date->format('Y-m-d') : null,
                'new_charge_date' => $request->new_charge_date,
                'subscription_id' => $updatedSubscription['id'] ?? $request->subscription_id
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 400);
        }
    }

    public function createTestPaymentWithDate(Request $request)
    {
        $request->validate([
            'mandate_id' => 'required|string',
            'amount' => 'required|integer|min:100',
            'charge_date' => 'required|date',
        ]);

        try {
            // Create a payment using the mandate
            $payment = $this->goCardlessService->createPayment([
                'amount' => $request->amount,
                'currency' => 'GBP', // or get from subscription
                'charge_date' => $request->charge_date,
                'mandate_id' => $request->mandate_id,
                'description' => 'Test payment'
            ]);

            return response()->json([
                'success' => true,
                'payment_id' => $payment->id,
                'charge_date' => $payment->charge_date ?? $request->charge_date,
                'amount' => $payment->amount,
                'status' => $payment->status
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 400);
        }
    }

    public function schedulePaymentForToday(Request $request)
    {
        $request->validate([
            'subscription_id' => 'required|string',
        ]);

        $subscription = Subscription::where('gocardless_subscription_id', $request->subscription_id)->firstOrFail();
        
        // Create immediate payment for testing
        try {
            $payment = $this->goCardlessService->createPayment([
                'amount' => $subscription->amount ?? 3500, // Default amount if not set
                'currency' => 'GBP', // or get from subscription
                'charge_date' => now()->format('Y-m-d'), // today
                'mandate_id' => $subscription->gocardless_mandate_id, // Use the mandate ID from subscription
                'description' => 'Test payment for today'
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Payment scheduled for today',
                'payment_id' => $payment->id,
                'charge_date' => $payment->charge_date ?? now()->format('Y-m-d')
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 400);
        }
    }
}