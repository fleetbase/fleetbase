<?php

namespace Fleetbase\FleetOps\Http\Controllers\Api\v1;

use Fleetbase\FleetOps\Http\Requests\CreateContactRequest;
use Fleetbase\FleetOps\Http\Requests\UpdateContactRequest;
use Fleetbase\FleetOps\Http\Resources\v1\Contact as ContactResource;
use Fleetbase\FleetOps\Http\Resources\v1\DeletedResource;
use Fleetbase\FleetOps\Models\Contact;
use Fleetbase\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    /**
     * Creates a new Fleetbase Contact resource.
     *
     * @param \Fleetbase\Http\Requests\CreateContactRequest $request
     *
     * @return \Fleetbase\Http\Resources\Contact
     */
    public function create(CreateContactRequest $request)
    {
        // get request input
        $input = $request->only(['name', 'type', 'title', 'email', 'phone', 'meta']);

        try {
            // create the contact
            $contact = Contact::updateOrCreate(
                [
                    'company_uuid' => session('company'),
                    'name'         => strtoupper($input['name']),
                ],
                $input
            );
        } catch (\Exception $e) {
            return response()->apiError($e->getMessage());
        }

        // response the driver resource
        return new ContactResource($contact);
    }

    /**
     * Updates a Fleetbase Contact resource.
     *
     * @param string                                        $id
     * @param \Fleetbase\Http\Requests\UpdateContactRequest $request
     *
     * @return \Fleetbase\Http\Resources\Contact
     */
    public function update($id, UpdateContactRequest $request)
    {
        // find for the contact
        try {
            $contact = Contact::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Contact resource not found.',
                ],
                404
            );
        }

        // get request input
        $input = $request->only(['name', 'type', 'title', 'email', 'phone', 'meta']);

        // update the contact
        $contact->update($input);
        $contact->flushAttributesCache();

        // response the contact resource
        return new ContactResource($contact);
    }

    /**
     * Query for Fleetbase Contact resources.
     *
     * @return \Fleetbase\Http\Resources\ContactCollection
     */
    public function query(Request $request)
    {
        $results = Contact::queryWithRequest($request);

        return ContactResource::collection($results);
    }

    /**
     * Finds a single Fleetbase Contact resources.
     *
     * @return \Fleetbase\Http\Resources\ContactCollection
     */
    public function find($id)
    {
        // find for the contact
        try {
            $contact = Contact::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->apiError('Contact resource not found.', 404);
        }

        // response the contact resource
        return new ContactResource($contact);
    }

    /**
     * Deletes a Fleetbase Contact resources.
     *
     * @return \Fleetbase\Http\Resources\ContactCollection
     */
    public function delete($id)
    {
        // find for the driver
        try {
            $contact = Contact::findRecordOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $exception) {
            return response()->json(
                [
                    'error' => 'Contact resource not found.',
                ],
                404
            );
        }

        // delete the contact
        $contact->delete();

        // response the contact resource
        return new DeletedResource($contact);
    }
}
