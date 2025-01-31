<?php

namespace Fleetbase\FleetOps\Http\Controllers\Internal\v1;

use Fleetbase\FleetOps\Http\Filter\ContactFilter;
use Fleetbase\FleetOps\Http\Filter\VendorFilter;
use Fleetbase\FleetOps\Http\Resources\v1\Contact as ContactResource;
use Fleetbase\FleetOps\Http\Resources\v1\Vendor as VendorResource;
use Fleetbase\FleetOps\Models\Contact;
use Fleetbase\FleetOps\Models\IntegratedVendor;
use Fleetbase\FleetOps\Models\Vendor;
use Fleetbase\FleetOps\Support\Utils;
use Fleetbase\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class MorphController extends Controller
{
    /**
     * Search facilitators or customers which is a comibined query on contacts or vendor resources.
     *
     * @return \Illuminate\Http\Response
     */
    public function queryCustomersOrFacilitators(Request $request)
    {
        $query          = $request->input('query');
        $limit          = $request->input('limit', 12);
        $page           = $request->input('page', 1);
        $single         = $request->boolean('single');
        $type           = Str::lower($request->segment(4));
        $resourceType   = Str::lower(Utils::singularize($type));

        $contactsQuery = Contact::select('*')
            ->searchWhere('name', $query)
            ->where('type', $resourceType === 'customer' ? '=' : '!=', 'customer')
            ->where('company_uuid', session('company'))
            ->applyDirectivesForPermissions('fleet-ops list contact')
            ->filter(new ContactFilter($request));

        $vendorsQuery = Vendor::select('*')
            ->searchWhere('name', $query)
            ->where('company_uuid', session('company'))
            ->applyDirectivesForPermissions('fleet-ops list vendor')
            ->filter(new VendorFilter($request));

        // Get total count for pagination
        $totalContacts = $contactsQuery->count();
        $totalVendors  = $vendorsQuery->count();
        $total         = $totalContacts + $totalVendors;

        // Get paginated items
        $contacts = $contactsQuery->limit($limit)->get();
        $vendors  = $vendorsQuery->limit($limit)->get();

        $results = collect([...$contacts, ...$vendors])
            ->sortBy('name')
            ->map(
                function ($resource) use ($type) {
                    $resource->setAttribute(Utils::singularize($type) . '_type', Str::lower(Utils::classBasename($resource)));

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

        // if requesting single resource
        if ($single === true) {
            return response()->json($results->first());
        }

        // set resource type
        $results = $results->map(
            function ($item) use ($resourceType) {
                $item['type'] = $resourceType;

                return $item;
            }
        );

        // Create a LengthAwarePaginator instance
        $results = new LengthAwarePaginator(
            $results->forPage($page, $limit),
            $total,
            $limit,
            $page,
            ['path' => URL::current()]
        );

        // Manually structure the response
        $response = [
            $type  => $results->items(),
            'meta' => [
                'total'         => $results->total(),
                'per_page'      => $results->perPage(),
                'current_page'  => $results->currentPage(),
                'last_page'     => $results->lastPage(),
                'next_page_url' => $results->nextPageUrl(),
                'prev_page_url' => $results->previousPageUrl(),
                'from'          => $results->firstItem(),
                'to'            => $results->lastItem(),
            ],
        ];

        return response()->json($response);
    }

    public function queryCustomers(Request $request)
    {
        $query           = $request->input('query');
        $limit           = $request->input('limit', 12);
        $single          = $request->boolean('single');
        $columns         = $request->array('columns');
        $type            = $request->input('type', 'contact');

        if ($type === 'vendor') {
            $builder = Vendor::select('*')
                ->searchWhere('name', $query)
                ->where(['type' => 'customer', 'company_uuid' => session('company')])
                ->applyDirectivesForPermissions('fleet-ops list vendor')
                ->filter(new VendorFilter($request));
        } else {
            $builder = Contact::select('*')
                ->where(['type' => 'customer', 'company_uuid' => session('company')])
                ->applyDirectivesForPermissions('fleet-ops list contact')
                ->filter(new ContactFilter($request));

            if ($request->has('user_uuid') || $request->has('user')) {
                $userId = $request->or(['user_uuid', 'user']);
                if ($userId) {
                    $builder->where('user_uuid', $userId);
                }
            }

            if ($query) {
                $builder->searchWhere('name', $query);
            }
        }

        // Get paginated items
        $results = $builder->fastPaginate($limit, $columns);
        $results->setCollection($results->getCollection()->map(function ($customer) use ($type) {
            $customer->customer_type = $type === 'vendor' ? 'vendor' : 'contact';

            return $customer;
        }));

        if ($single) {
            return $type === 'vendor' ? new VendorResource($results->first()) : new ContactResource($results->first());
        }

        return $type === 'vendor' ? VendorResource::collection($results) : ContactResource::collection($results);
    }

    public function queryFacilitators(Request $request)
    {
        $query           = $request->input('query');
        $limit           = $request->input('limit', 12);
        $single          = $request->boolean('single');
        $columns         = $request->array('columns');
        $type            = $request->input('type', 'vendor');

        if ($type === 'contact') {
            $builder = Contact::select('*')
                ->searchWhere('name', $query)
                ->where(['type' => 'facilitator', 'company_uuid' => session('company')])
                ->applyDirectivesForPermissions('fleet-ops list contact')
                ->filter(new ContactFilter($request));
        } else {
            $builder = Vendor::select('*')
                ->searchWhere('name', $query)
                ->where(['type' => 'facilitator', 'company_uuid' => session('company')])
                ->applyDirectivesForPermissions('fleet-ops list vendor')
                ->filter(new VendorFilter($request));
        }

        // Get paginated items
        $results = $builder->fastPaginate($limit, $columns);
        $results->setCollection($results->getCollection()->map(function ($facilitator) use ($type) {
            $facilitator->facilitator_type = $type === 'contact' ? 'contact' : 'vendor';

            return $facilitator;
        }));

        if ($single) {
            return $type === 'contact' ? new ContactResource($results->first()) : new VendorResource($results->first());
        }

        return $type === 'contact' ? ContactResource::collection($results) : VendorResource::collection($results);
    }
}
