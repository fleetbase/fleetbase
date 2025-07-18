<?php

namespace App\Http\Controllers\Api\v1;

use Illuminate\Http\Request;
use Fleetbase\Http\Controllers\Controller;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\LaravelMysqlSpatial\Types\Point;
use App\Models\ServiceArea;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Fleetbase\Support\Auth;
use Fleetbase\Http\Controllers\Internal\v1\SettingController;

class ParkingAreaController extends Controller
{

    /**
     * Cache duration in minutes
     */
    protected $cacheDuration = 300;

    /**
     * Get all parking areas from SNAP API
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function insert(Request $request)
    {
        set_time_limit(120);
        try {
            // Try to get from cache first
            $apiUrl = config('services.snap_api.url');
            $parkingAreas = Cache::remember('snap_parking_areas', $this->cacheDuration, function () use ($apiUrl) {
                $response = Http::withOptions(['verify' => false])->get($apiUrl);

                if (!$response->successful()) {
                    throw new \Exception('Failed to fetch data from SNAP API');
                }

                return $this->transformParkingAreas($response->json());
            });
            $createdCount = 0;
            $updatedCount = 0;
            $errors = [];
            foreach ($parkingAreas as $area) {
                try {
                    // Skip if required data is missing
                    if (empty($area['location']['latitude']) || empty($area['location']['longitude'])) {
                        continue;
                    }
                    $company = $request->has('company') ? Auth::getCompanyFromRequest($request) : Auth::getCompany();
                    $company_uuid = null;
                    if($company){
                        $company_uuid = $company->uuid;
                    }
                    // Create coordinates array for border
                    $lat = $area['location']['latitude'];
                    $lng = $area['location']['longitude'];
                    $serviceAreaData = [
                        'company_uuid' => $company_uuid,
                        'name' => $area['name'],
                        // 'description' => 'Parking Area with capacity: ' . ($area['snapCapacity'] ?? 'N/A'),
                        'status' => 'active',
                        'color' => '#FF0000', // Default red color
                        'stroke_color' => '#000000', // Default black stroke
                        'location' => new Point($lat, $lng),
                        'type' => 'parking',
                        'country' => $area['country'],
                        'address' => json_encode($area['address']),
                        'telephone' => $area['phone'],
                    ];
                    // Try to find existing service area by location and name
                    $existingArea = ServiceArea::where('name', $serviceAreaData['name'])
                        ->where('company_uuid', $company_uuid)
                        ->first();

                    if ($existingArea) {
                        $existingArea->update($serviceAreaData);
                        $updatedCount++;
                    } else {
                        ServiceArea::create($serviceAreaData);
                        $createdCount++;
                    }
                } catch (\Exception $e) {
                    $errors[] = [
                        'area' => $area['locationName'] ?? 'Unknown',
                        'error' => $e->getMessage()
                    ];
                    Log::error('Error processing parking area: ' . $e->getMessage(), [
                        'area' => $area,
                        'error' => $e->getMessage()
                    ]);
                }
            }
            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => "Sync completed. Created: $createdCount, Updated: $updatedCount areas",
                'data' => [
                    'created' => $createdCount,
                    'updated' => $updatedCount,
                    'errors' => $errors
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'trace' => config('app.debug') ? $e->getTrace() : null
            ], 500);
        }

    }

    /**
     * Find nearest parking areas within radius
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function nearest(Request $request)
    {
        try {
            $latitude = floatval($request->input('latitude'));
            $longitude = floatval($request->input('longitude'));
            //$radius = floatval( config('services.parking_radius_meter')); 
            if (!$latitude || !$longitude) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Latitude and longitude are required'
                ], 422);
            }

            $currentLocation = new Point($latitude, $longitude);
            $company = $request->has('company') ? Auth::getCompanyFromRequest($request) : Auth::getCompany();
            $company_uuid = null;
            if($company && $company->parking_zone_max_distance){
                $company_uuid = $company->uuid;
                $radiusInMiles = $company->parking_zone_max_distance;
            }
            else{
                $radiusInMiles = config('services.parking_radius_meter');
            }
            $radius = SettingController::convertMilesToMeters($radiusInMiles);//convert miles into meters
            // Get the parking areas from the service_areas table now company uuid removed
            $parkingAreas = ServiceArea::where('type', 'parking')
                ->distanceSphere('location', $currentLocation, $radius) // Convert km to meters
                ->orderByDistanceSphere('location', $currentLocation)
                ->get();

            return response()->json([
                'status' => 'success',
                'data' => $parkingAreas,
                 'total' => $parkingAreas->count(),
                    'radius' => $radius,
                    'center' => [
                        'latitude' => $latitude,
                        'longitude' => $longitude
                    ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error finding nearest parking areas: ' . $e->getMessage(), [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'trace' => config('app.debug') ? $e->getTrace() : null
            ], 500);
        }
    }

    /**
     * Transform parking areas data
     * 
     * @param array $areas
     * @return array
     */
    protected function transformParkingAreas($areas)
    {

        return collect($areas)->map(function ($area) {
            return [
                'id' => $area['id'],
                'name' => $area['locationName'],
                'reference' => $area['locationRef'],
                'address' =>  $area['address'],
                'country' => $area['address']['country'],
                'location' => [
                    'latitude' => $area['lat'],
                    'longitude' => $area['long']
                ],
                'capacity' => $area['snapCapacity'],
                'phone' => $area['telephone'],
                'status' => $area['state']
            ];
        })->toArray();
    }

    /**
     * List all parking service areas with pagination
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function list(Request $request)
    {
        try {
            $perPage = $request->input('per_page', 500);
            $company = $request->has('company') ? Auth::getCompanyFromRequest($request) : Auth::getCompany();
            $company_uuid = $company ? $company->uuid : null;
            $radius = $request->input('radius', 500);
            $query = ServiceArea::where('company_uuid', $company_uuid)
                ->where('type', 'parking');

            $serviceAreas = $query->paginate($perPage);

            // Transform the paginated results
            $transformed = $serviceAreas->through(function ($area) {
                return [
                    'id' => $area->id,
                    'uuid' => $area->uuid,
                    'public_id' => $area->public_id,
                    'name' => $area->name,
                    'type' => $area->type,
                    'center' => [
                        'type' => 'Point',
                        'coordinates' => [
                            $area->location->getLng(),
                            $area->location->getLat()
                        ]
                    ],
                    'border' => $area->border,
                    'zones' => $area->zones ?? [],
                    'status' => $area->status,
                    'updated_at' => $area->updated_at,
                    'created_at' => $area->created_at
                ];
            });

            return response()->json([
                'service_areas' => $transformed->items(),
                'meta' => [
                    'total' => $transformed->total(),
                    'per_page' => $transformed->perPage(),
                    'current_page' => $transformed->currentPage(),
                    'last_page' => $transformed->lastPage(),
                    'from' => $transformed->firstItem(),
                    'to' => $transformed->lastItem(),
                    'time' => round(microtime(true) * 1000),
                    'radius' => floatval( config('services.parking_radius_meter'))
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'trace' => config('app.debug') ? $e->getTrace() : null
            ], 500);
        }
    }
}
