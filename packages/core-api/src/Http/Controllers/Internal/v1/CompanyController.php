<?php

namespace Fleetbase\Http\Controllers\Internal\v1;

use Fleetbase\Exports\CompanyExport;
use Fleetbase\Http\Controllers\FleetbaseController;
use Fleetbase\Http\Requests\ExportRequest;
use Fleetbase\Http\Resources\Organization;
use Fleetbase\Http\Resources\User as UserResource;
use Fleetbase\Models\Company;
use Fleetbase\Models\CompanyUser;
use Fleetbase\Models\Invite;
use Fleetbase\Models\User;
use Fleetbase\Support\Auth;
use Fleetbase\Support\TwoFactorAuth;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;

class CompanyController extends FleetbaseController
{
    /**
     * The resource to query.
     *
     * @var string
     */
    public $resource = 'company';

    /**
     * Find company by public_id or invitation code.
     *
     * @return \Illuminate\Http\Response
     */
    public function findCompany(string $id)
    {
        $id         = trim($id);
        $isPublicId = Str::startsWith($id, ['company_']);

        if ($isPublicId) {
            $company = Company::where('public_id', $id)->first();
        } else {
            $invite = Invite::where(['uri' => $id, 'reason' => 'join_company'])->with(['subject'])->first();

            if ($invite) {
                $company = $invite->subject;
            }
        }

        return new Organization($company);
    }

    /**
     * Get the current organization's two factor authentication settings.
     *
     * @return \Illuminate\Http\Response
     */
    public function getTwoFactorSettings()
    {
        $company = Auth::getCompany();

        if (!$company) {
            return response()->error('No company session found', 401);
        }

        $twoFaSettings = TwoFactorAuth::getTwoFaSettingsForCompany($company);

        return response()->json($twoFaSettings->value);
    }

    /**
     * Save the two factor authentication settings for the current company.
     *
     * @param Request $request the HTTP request
     *
     * @return \Illuminate\Http\Response
     */
    public function saveTwoFactorSettings(Request $request)
    {
        $twoFaSettings = $request->array('twoFaSettings');
        $company       = Auth::getCompany();

        if (!$company) {
            return response()->error('No company session found', 401);
        }
        if (isset($twoFaSettings['enabled']) && $twoFaSettings['enabled'] === false) {
            $twoFaSettings['enforced'] = false;
        }
        TwoFactorAuth::saveTwoFaSettingsForCompany($company, $twoFaSettings);

        return response()->json(['message' => 'Two-Factor Authentication saved successfully']);
    }

    /**
     * Get all users for a company.
     *
     * @param string $id The company id
     *
     * @return \Illuminate\Http\Response
     */
    public function users(string $id, Request $request)
    {
        $searchQuery = $request->searchQuery();
        $limit       = $request->input(['limit', 'nestedLimit'], 20);
        $paginate    = $request->boolean('paginate');
        $exclude     = $request->array('exclude');

        // Start user query
        $usersQuery = CompanyUser::whereHas('company',
            function ($query) use ($id) {
                $query->where('public_id', $id);
                $query->orWhere('uuid', $id);
            }
        )
        ->whereHas('user')
        ->whereNotIn('user_uuid', $exclude)
        ->with(['user']);

        // Search query
        if ($searchQuery) {
            $usersQuery->whereHas('user', function ($query) use ($searchQuery) {
                $query->search($searchQuery);
            });
        }

        // Sort query
        $usersQuery->applySortFromRequest($request);

        // paginate results
        if ($paginate) {
            $users = $usersQuery->fastPaginate($limit);

            // fix results
            $transformedItems = $users->getCollection()->map(function ($companyUser) {
                return $companyUser->user;
            });

            // replace in pagination
            $users->setCollection($transformedItems);

            return response()->json([
                'users' => UserResource::collection($users->getCollection()),
                'meta'  => [
                    'current_page' => $users->currentPage(),
                    'from'         => $users->firstItem(),
                    'last_page'    => $users->lastPage(),
                    'path'         => $users->path(),
                    'per_page'     => $users->perPage(),
                    'to'           => $users->lastItem(),
                    'total'        => $users->total(),
                ],
            ]);
        }

        // get users
        $users = $usersQuery->get();

        // fix results
        $users = $users->map(function ($companyUser) {
            $companyUser->loadMissing('user');

            return $companyUser->user;
        });

        return UserResource::collection($users);
    }

    /**
     * Export the users to excel or csv.
     *
     * @return \Illuminate\Http\Response
     */
    public function export(ExportRequest $request)
    {
        $format       = $request->input('format', 'xlsx');
        $selections   = $request->array('selections');
        $fileName     = trim(Str::slug('company-' . date('Y-m-d-H:i')) . '.' . $format);

        return Excel::download(new CompanyExport($selections), $fileName);
    }

    /**
     * Transfer ownership of company to another member, and make them the Administrator.
     *
     * @return \Illuminate\Http\Response
     */
    public function transferOwnership(Request $request)
    {
        $companyId      = $request->input('company');
        $newOwnerId     = $request->input('newOwner');
        $leave          = $request->boolean('leave');

        // Get and validate organization
        $company = Company::where('uuid', $companyId)->first();
        if (!$company) {
            return response()->error('No organization found to transfer ownership for.');
        }

        // Get and validate the new owner
        $newOwner = $company->getCompanyUser($newOwnerId);
        if (!$newOwner) {
            return response()->error('The new owner provided could not be found for transfer of ownership.');
        }

        // Change the company owner
        $company->assignOwner($newOwner);

        // If the current user has opted to leave, remove them from the organization
        if ($leave) {
            $currentUser = $request->user();
            if ($currentUser) {
                $currentCompanyUser = $company->getCompanyUserPivot($currentUser);
                if ($currentCompanyUser) {
                    $currentCompanyUser->delete();
                }
                // Switch organization
                $nextOrganization = $currentUser->companies()->where('companies.uuid', '!=', $company->uuid)->first();
                if ($nextOrganization) {
                    $currentUser->setCompany($nextOrganization);
                }
            }
        }

        return response()->json([
            'status'          => 'ok',
            'newOwner'        => $newOwner,
            'currentUserLeft' => $leave,
        ]);
    }

    /**
     * Remove the current user, or user selected via request param from an organization.
     *
     * @return \Illuminate\Http\Response
     */
    public function leaveOrganization(Request $request)
    {
        $companyId        = $request->input('company');
        $currentUserId    = $request->input('user');
        $currentUser      = Str::isUuid($currentUserId) ? User::where('uuid', $currentUserId)->first() : Auth::getUserFromSession($request);

        // If not current user - error
        if (!$currentUser) {
            return response()->error('Unable to leave organization.');
        }

        // Get and validate organization
        $company = Company::where('uuid', $companyId)->first();
        if (!$company) {
            return response()->error('No organization found for user to leave.');
        }

        $currentCompanyUser = $company->getCompanyUserPivot($currentUser);
        if (!$currentCompanyUser) {
            return response()->error('User selected to leave organization is not a member of this organization.');
        }

        // Remove user from organization
        $currentCompanyUser->delete();

        // Switch organization
        $nextOrganization = $currentUser->companies()->where('companies.uuid', '!=', $company->uuid)->first();
        if ($nextOrganization) {
            $currentUser->setCompany($nextOrganization);
        }

        return response()->json([
            'status' => 'ok',
        ]);
    }
}
