<?php

namespace Fleetbase\FleetOps\Http\Controllers\Api\v1;

use Fleetbase\FleetOps\Http\Requests\CreatePlaceRequest;
use Fleetbase\FleetOps\Http\Requests\UpdatePlaceRequest;
use Fleetbase\FleetOps\Http\Resources\v1\DeletedResource;
use Fleetbase\FleetOps\Http\Resources\v1\Place as PlaceResource;
use Fleetbase\FleetOps\Models\Place;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Http\Controllers\Controller;
use Fleetbase\LaravelMysqlSpatial\Types\Point;
use Geocoder\Laravel\Facades\Geocoder;
use Geocoder\Provider\GoogleMapsPlaces\GoogleMapsPlaces;
use Geocoder\Query\GeocodeQuery;
use Http\Adapter\Guzzle7\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PlaceController extends Controller
{
    /**
     * Creates a new Fleetbase Place resource.
     *
     * @param \Fleetbase\Http\Requests\CreatePlaceRequest $request
     *
     * @return \Fleetbase\Http\Resources\Place
     */
    public function create(CreatePlaceRequest $request)
    {
        // get request input
        $input = $request->only([
            'name',
            'street1',
            'street2',
            'city',
            'location',
            'province',
            'postal_code',
            'neighborhood',
            'district',
            'building',
            'security_access_code',
            'country',
            'phone',
            'type',
            'meta',
        ]);

        // Check is missing key address attributes
        $isNotAddressObject = $request->isNotFilled(['name', 'location', 'latititude', 'longitude', 'city', 'province', 'postal_code']);

        // if address param is sent create from mixed
        if ($isNotAddressObject && $request->isString('address')) {
            $place = Place::createFromGeocodingLookup($request->input('address'));

            if ($place instanceof Place) {
                $input = $place->toArray();
            }
        }

        // if street1 is the only param
        if ($isNotAddressObject && $request->isString('street1')) {
            $place = Place::createFromGeocodingLookup($request->input('street1'));

            if ($place instanceof Place) {
                $input = $place->toArray();
            }
        }

        // if we have only latitude/longitude or location BUT no street1 do a reverse lookup
        $requestHasCoordinates = $request->filled(['latitude', 'longitude']);
        $requestHasLocation    = $request->filled(['location']);
        $requestMissingStreet  = $request->missing('street1');
        if ($requestMissingStreet && ($requestHasCoordinates || $requestHasLocation)) {
            if ($requestHasLocation) {
                $point = Utils::getPointFromMixed($request->input('location'));
            }

            if ($requestHasCoordinates) {
                $point = Utils::getPointFromMixed($request->only(['latitude', 'longitude']));
            }

            if ($point instanceof Point) {
                $place = Place::createFromReverseGeocodingLookup($point);

                if ($place instanceof Place) {
                    $input = $place->toArray();
                }
            }
        }

        // latitude / longitude
        if ($request->has(['latitude', 'longitude'])) {
            $input['location'] = Utils::getPointFromCoordinates($request->only(['latitude', 'longitude']));
        }

        // make sure company is set
        $input['company_uuid'] = session('company');

        // owner assignment
        if ($request->has('owner')) {
            $id = $request->input('owner');

            // check if customer_ based contact
            if (Str::startsWith($id, 'customer')) {
                $id = Str::replaceFirst('customer', 'contact', $id);
            }

            $owner = Utils::getUuid(
                ['contacts', 'vendors'],
                [
                    'public_id'    => $id,
                    'company_uuid' => session('company'),
                ]
            );

            if (is_array($owner)) {
                $input['owner_uuid'] = Utils::get($owner, 'uuid');
                $input['owner_type'] = Utils::getModelClassName(Utils::get($owner, 'table'));
            }
        }

        /** @var \Fleetbase\Models\Place */
        $place = Place::firstOrNew([
            'company_uuid' => session('company'),
            'name'         => strtoupper(Utils::or($input, ['name', 'street1'])),
            'street1'      => strtoupper($input['street1']),
        ]);

        // check if missing location
        // set a default location for creation
        $isMissingLocation = empty($input['location']);
        if ($isMissingLocation) {
            $input['location'] = new Point(0, 0);
        }

        // fill place with attributes
        $place->fill($input);

        // attempt to find and set latitude and longitude
        if ($isMissingLocation || $request->missing(['latitude', 'longitude', 'location']) || empty($place->country)) {
            $geocoded = Geocoder::geocode($place->toAddressString(['name']))
                ->get()
                ->first();

            if ($geocoded) {
                $place->fillWithGoogleAddress($geocoded);
            } elseif (isset($place->location)) {
                $place->location = new Point(0, 0);
            }
        }

        // Save place
        $place->save();

        return new PlaceResource($place);
    }

    /**
     * Updates a Fleetbase Place resource.
     *
     * @param string                                      $id
     * @param \Fleetbase\Http\Requests\UpdatePlaceRequest $request
     *
     * @return \Fleetbase\Http\Resources\Place
     */
    public function update($id, UpdatePlaceRequest $request)
    {
        try {
            $place = Place::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->apiError('Place resource not found.');
        }

        // get request input
        $input = $request->only([
            'name',
            'street1',
            'street2',
            'city',
            'location',
            'province',
            'postal_code',
            'neighborhood',
            'district',
            'building',
            'security_access_code',
            'country',
            'phone',
            'type',
            'meta',
        ]);

        // latitude / longitude
        if ($request->has(['latitude', 'longitude'])) {
            $input['location'] = Utils::getPointFromCoordinates($request->only(['latitude', 'longitude']));
        }

        // owner assignment
        if ($request->has('owner')) {
            $id = $request->input('owner');

            // check if customer_ based contact
            if (Str::startsWith($id, 'customer')) {
                $id = Str::replaceFirst('customer', 'contact', $id);
            }

            $owner = Utils::getUuid(
                ['contacts', 'vendors'],
                [
                    'public_id'    => $id,
                    'company_uuid' => session('company'),
                ]
            );

            if (is_array($owner)) {
                $input['owner_uuid'] = Utils::get($owner, 'uuid');
                $input['owner_type'] = Utils::getModelClassName(Utils::get($owner, 'table'));
            }
        }

        // vendor assignment
        if ($request->has('vendor')) {
            $input['vendor_uuid'] = Utils::getUuid('vendors', [
                'public_id'    => $request->input('vendor'),
                'company_uuid' => session('company'),
            ]);
        }

        // update the place
        $place->update($input);
        $place->flushAttributesCache();

        return new PlaceResource($place);
    }

    /**
     * Query for Fleetbase Place resources.
     *
     * @return \Fleetbase\Http\Resources\PlaceCollection
     */
    public function query(Request $request)
    {
        $results = Place::queryWithRequest($request, function (&$query, $request) {
            if ($request->has('vendor')) {
                $query->whereHas('vendor', function ($q) use ($request) {
                    $q->where('public_id', $request->input('vendor'));
                });
            }
        });

        $results = $results->all();

        return PlaceResource::collection($results);
    }

    /**
     * Search for Fleetbase Place resources.
     *
     * @return \Fleetbase\Http\Resources\PlaceCollection
     */
    public function search(Request $request)
    {
        $searchQuery = strtolower($request->input('query'));
        $limit       = $request->input('limit', 10);
        $geo         = $request->input('geo', false);
        $latitude    = $request->input('latitude', false);
        $longitude   = $request->input('longitude', false);

        $results = DB::table('places')
            ->where('company_uuid', session('company'))
            ->whereNull('deleted_at')
            ->where(function ($q) use ($searchQuery) {
                if (Utils::notEmpty($searchQuery)) {
                    $q->orWhere(DB::raw('lower(name)'), 'like', '%' . $searchQuery . '%');
                    $q->orWhere(DB::raw('lower(street1)'), 'like', '%' . $searchQuery . '%');
                    $q->orWhere(DB::raw('lower(postal_code)'), 'like', '%' . $searchQuery . '%');
                }
            })
            ->limit($limit)
            ->orderBy('name', 'desc')
            ->get()
            ->map(function ($place) {
                $place             = (array) $place;
                $place['location'] = Utils::mysqlPointAsGeometry($place['location']);
                $place             = new Place($place);
                $place->address    = $place->toAddressString();

                return $place;
            })
            ->values();

        if ($geo && Utils::notEmpty($searchQuery)) {
            $httpClient = new Client();
            $provider   = new \Geocoder\Provider\GoogleMaps\GoogleMaps($httpClient, null, env('GOOGLE_MAPS_API_KEY'));
            $geocoder   = new \Geocoder\StatefulGeocoder($provider, 'en');

            if ($latitude && $longitude) {
                $geoResults = $geocoder->geocodeQuery(
                    GeocodeQuery::create($searchQuery)
                        ->withData('mode', GoogleMapsPlaces::GEOCODE_MODE_SEARCH)
                        ->withData('location', "$latitude, $longitude")
                );

                $geoResults = collect($geoResults->all());
            } else {
                $geoResults = Geocoder::geocode($searchQuery)->get();
            }

            $geoResults = $geoResults
                ->map(function ($googleAddress) {
                    return Place::createFromGoogleAddress($googleAddress);
                })
                ->values();

            $results = $results->merge($geoResults);
        }

        $results = $results
            ->sortBy('name')
            ->values()
            ->toArray();

        return PlaceResource::collection($results);
    }

    /**
     * Finds a single Fleetbase Place resources.
     *
     * @return \Fleetbase\Http\Resources\Place
     */
    public function find($id, Request $request)
    {
        // find for the place
        try {
            $place = Place::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->apiError('Place resource not found.');
        }

        return new PlaceResource($place);
    }

    /**
     * Deletes a Fleetbase Place resources.
     *
     * @return \Fleetbase\Http\Resources\Place
     */
    public function delete($id, Request $request)
    {
        try {
            $place = Place::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->apiError('Place resource not found.');
        }

        $place->delete();

        return new DeletedResource($place);
    }
}
