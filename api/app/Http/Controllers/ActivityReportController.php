<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ActivityReportController extends Controller
{
    /**
     * Get activity reports aggregated by section.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function reportsBySection(Request $request)
    {
        $startDate = $request->input('start_date') ? Carbon::parse($request->input('start_date')) : Carbon::now()->subDays(7);
        $endDate = $request->input('end_date') ? Carbon::parse($request->input('end_date')) : Carbon::now();
        $sections = $request->input('sections', []);

        $query = DB::table('activity')
            ->select(
                'log_name as section',
                DB::raw('COUNT(*) as total'),
                DB::raw('MAX(created_at) as last_activity')
            )
            ->whereBetween('created_at', [$startDate, $endDate]);

        if (!empty($sections)) {
            $query->whereIn('log_name', $sections);
        }

        $results = $query->groupBy('log_name')
            ->orderBy('total', 'desc')
            ->get();

        $formattedSections = $results->map(function ($item) use ($startDate, $endDate) {
            // Get actions breakdown for this section
            $actions = DB::table('activity')
                ->select('description', DB::raw('count(*) as count'))
                ->where('log_name', $item->section)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->groupBy('description')
                ->pluck('count', 'description');

            // Calculate trend
            // Use total seconds to get accurate period length, then convert to days
            // This ensures we get at least 1 day even for periods < 24 hours
            $periodLengthInSeconds = $startDate->diffInSeconds($endDate);
            $periodLengthInDays = max(1, round($periodLengthInSeconds / 86400)); // At least 1 day
            
            $prevStartDate = $startDate->copy()->subDays($periodLengthInDays);
            $prevEndDate = $startDate->copy();
            
            $prevTotal = DB::table('activity')
                ->where('log_name', $item->section)
                ->whereBetween('created_at', [$prevStartDate, $prevEndDate])
                ->count();
                
            $trend = 0;
            if ($prevTotal > 0) {
                $trend = (($item->total - $prevTotal) / $prevTotal) * 100;
            } else if ($item->total > 0) {
                $trend = 100;
            }
            
            $trendDirection = $trend > 0 ? 'up' : ($trend < 0 ? 'down' : 'neutral');

            return [
                'name' => $item->section,
                'total_activities' => $item->total,
                'actions' => $actions,
                'trend' => round($trend, 1),
                'trend_direction' => $trendDirection,
                'last_activity' => $item->last_activity
            ];
        });

        return response()->json([
            'sections' => $formattedSections
        ]);
    }
}

