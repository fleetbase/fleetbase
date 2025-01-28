<?php

namespace Fleetbase\FleetOps\Http\Controllers\Internal\v1;

use Fleetbase\FleetOps\Models\Contact;
use Fleetbase\FleetOps\Models\IntegratedVendor;
use Fleetbase\FleetOps\Models\Vendor;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class FleetOpsLookupController extends Controller
{
    /**
     * Returns a collection of polymorphic resources as JSON.
     *
     * @param Request $request the HTTP request object
     *
     * @return \Illuminate\Http\Response the JSON response with the polymorphic resources
     */
    public function polymorphs(Request $request)
    {
        $query        = $request->or(['query', 'q']);
        $limit        = $request->input('limit', 16);
        $type         = Str::lower(Arr::last($request->segments()));
        $resourceType = Str::lower(Str::singular($type));

        $contacts = Contact::where('name', 'like', '%' . $query . '%')
            ->where('company_uuid', session('company'))
            ->limit($limit)
            ->get();

        $vendors = Vendor::where('name', 'like', '%' . $query . '%')
            ->where('company_uuid', session('company'))
            ->limit($limit)
            ->get();

        $results = collect([...$contacts, ...$vendors])
            ->sortBy('name')
            ->map(
                function ($resource) use ($type) {
                    $resource->setAttribute(Str::singular($type) . '_type', Str::lower(Utils::classBasename($resource)));

                    return $resource->toArray();
                }
            )
            ->values();

        // insert integrated vendors if user has any
        if ($resourceType === 'facilitator') {
            $integratedVendors = IntegratedVendor::where('company_uuid', session('company'))->get();

            if ($integratedVendors->count()) {
                $integratedVendors->each(
                    function ($integratedVendor) use ($results) {
                        $integratedVendor->setAttribute('facilitator_type', 'integrated-vendor');
                        $results->prepend($integratedVendor);
                    }
                );
            }
        }

        // convert to array
        $results = $results->toArray();

        // set resource type
        $results = array_map(
            function ($attributes) use ($resourceType) {
                $attributes['type'] = $resourceType;

                return $attributes;
            },
            $results
        );

        return response()->json([$type => $results]);
    }
}
