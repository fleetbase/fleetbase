<?php

namespace App\Http\Controllers\Api\v1;

use Illuminate\Http\Request;
use Fleetbase\Http\Controllers\Controller;
use App\Models\Language;

class LanguageController extends Controller
{
    public function index()
    {
       // Fetch all languages where deleted = 0, record_status = 1 and sort by sort_order
        $languages = Language::where('deleted', 0)
            ->where('record_status', 1)
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $languages,
            'total' => $languages->count(),
        ]);
    }
}
