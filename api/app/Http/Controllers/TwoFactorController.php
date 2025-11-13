<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TwoFactorController extends Controller
{
    /**
     * Check if two-factor authentication is enabled for a user
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function check(Request $request): JsonResponse
    {
        // Siempre devolver que 2FA está deshabilitado
        return response()->json([
            'isTwoFaEnabled' => false,
            'twoFaSession' => null
        ]);
    }
}

