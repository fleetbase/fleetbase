<?php

namespace Fleetbase\Http\Controllers\Internal\v1;

use Illuminate\Routing\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    /**
     * Get all payments with optional filtering
     * GET /int/v1/payments
     */
    public function index(Request $request)
    {
        try {
            $query = DB::table('payments')
                ->leftJoin('company_plan_relation', 'company_plan_relation.id', '=', 'payments.company_plan_id')
                ->leftJoin('plan', 'payments.plan_id', '=', 'plan.id')
                ->leftJoin('company_plan_relation', 'payments.company_plan_id', '=', 'company_plan_relation.id')
                ->where('payments.deleted', 0)
                ->where('payments.record_status', 1);

            // Apply filters
            if ($request->filled('status')) {
                $query->where('payments.status', $request->status);
            }

            if ($request->filled('payment_type')) {
                $query->where('payments.payment_type', $request->payment_type);
            }

            if ($request->filled('payment_method')) {
                $query->where('payments.payment_method', $request->payment_method);
            }

            if ($request->filled('company_plan_id')) {
                $query->where('payments.company_plan_id', $request->company_plan_id);
            }

            if ($request->filled('gocardless_customer_id')) {
                $query->where('payments.gocardless_customer_id', $request->gocardless_customer_id);
            }

            if ($request->filled('date_from')) {
                $query->where('payments.created_at', '>=', $request->date_from);
            }

            if ($request->filled('date_to')) {
                $query->where('payments.created_at', '<=', $request->date_to);
            }

            // Select fields
            $query->select([
                'payments.*',
                'plan.name as plan_name',
                'plan.description as plan_description',
                'company_plan_relation.company_id'
            ]);

            // Pagination
            $perPage = $request->get('per_page', 15);
            $page = $request->get('page', 1);
            $offset = ($page - 1) * $perPage;

            $total = $query->count();
            $payments = $query->orderBy('payments.created_at', 'desc')
                ->offset($offset)
                ->limit($perPage)
                ->get();

            return response()->json([
                'success' => true,
                'data' => $payments,
                'meta' => [
                    'total' => $total,
                    'per_page' => $perPage,
                    'current_page' => $page,
                    'last_page' => ceil($total / $perPage)
                ]
            ]);

        } catch (Exception $e) {
            Log::error('Error fetching payments: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payments',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get payment by ID
     * GET /int/v1/payments/{id}
     */
    public function show($id)
    {
        try {
            $payment = DB::table('payments')
                ->leftJoin('plan', 'payments.plan_id', '=', 'plan.id')
                ->leftJoin('company_plan_relation', 'payments.company_plan_id', '=', 'company_plan_relation.id')
                ->where('payments.id', $id)
                ->where('payments.deleted', 0)
                ->select([
                    'payments.*',
                    'plan.name as plan_name',
                    'plan.description as plan_description',
                    'company_plan_relation.company_id'
                ])
                ->first();

            if (!$payment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment not found'
                ], 404);
            }

            // Get payment events
            $events = DB::table('payment_events_relation')
                ->where('payment_id', $id)
                ->where('deleted', 0)
                ->orderBy('created_at', 'desc')
                ->get();

            $payment->events = $events;

            return response()->json([
                'success' => true,
                'data' => $payment
            ]);

        } catch (Exception $e) {
            Log::error('Error fetching payment: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payment',
                'error' => $e->getMessage()
            ], 500);
        }
    }

   
    /**
     * Get payment events for a specific payment
     * GET /int/v1/payments/{id}/events
     */
    public function events($id)
    {
        try {
            $payment = DB::table('payments')
                ->where('id', $id)
                ->where('deleted', 0)
                ->first();

            if (!$payment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment not found'
                ], 404);
            }

            $events = DB::table('payment_events_relation')
                ->where('payment_id', $id)
                ->where('deleted', 0)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $events
            ]);

        } catch (Exception $e) {
            Log::error('Error fetching payment events: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payment events',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get payment statistics
     * GET /int/v1/payments/stats
     */
    public function stats(Request $request)
    {
        try {
            $query = DB::table('payments')
                ->where('deleted', 0)
                ->where('record_status', 1);

            // Apply date filter if provided
            if ($request->filled('date_from')) {
                $query->where('created_at', '>=', $request->date_from);
            }
            if ($request->filled('date_to')) {
                $query->where('created_at', '<=', $request->date_to);
            }

            $stats = [
                'total_payments' => $query->count(),
                'total_amount' => $query->sum('total_amount'),
                'status_breakdown' => $query->groupBy('status')
                    ->selectRaw('status, count(*) as count, sum(total_amount) as amount')
                    ->get(),
                'payment_type_breakdown' => $query->groupBy('payment_type')
                    ->selectRaw('payment_type, count(*) as count, sum(total_amount) as amount')
                    ->get(),
                'payment_method_breakdown' => $query->groupBy('payment_method')
                    ->selectRaw('payment_method, count(*) as count, sum(total_amount) as amount')
                    ->get()
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);

        } catch (Exception $e) {
            Log::error('Error fetching payment stats: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payment statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }

   
}

