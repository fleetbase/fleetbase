<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;

class TrackingController extends Controller
{
    public function show(Request $request): View
    {
        $apiBase = rtrim($request->getSchemeAndHttpHost(), '/') . '/api/v1/multi-pickup';

        return view('tracking', [
            'orderId' => $request->query('order_id'),
            'displayId' => $request->query('display_id'),
            'merchant' => $request->query('merchant', 'Your merchant'),
            'multiPickupApiBase' => $apiBase,
        ]);
    }
}
