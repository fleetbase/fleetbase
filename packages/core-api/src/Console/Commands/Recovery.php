<?php

namespace Fleetbase\Console\Commands;

use Fleetbase\Mail\UserCredentialsMail;
use Fleetbase\Models\Company;
use Fleetbase\Models\Role;
use Fleetbase\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Class Recovery.
 *
 * The Recovery command provides a suite of recovery actions to fix issues related to user roles,
 * company assignments, and ownership within the Fleetbase application. It allows organization
 * owners to perform critical administrative tasks via the command line interface.
 *
 * **Available Actions:**
 * 1. Set Role for User
 * 2. Assign User to Company
 * 3. Assign Owner to Company
 *
 * **Usage Example:**
 * ```bash
 * php artisan fleetbase:recovery
 * ```
 *
 * Upon execution, the command will prompt the user to select one of the available recovery actions
 * and guide them through the necessary steps to complete the chosen action.
 *
 * @see Command
 */
class Recovery extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fleetbase:recovery';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recovery actions to fix issues.';

    /**
     * Execute the console command.
     *
     * This method handles the execution of the Recovery command. It presents a list of available
     * recovery actions to the user and invokes the corresponding method based on the user's selection.
     *
     * **Available Recovery Actions:**
     * - Set Role for User
     * - Assign User to Company
     * - Assign Owner to Company
     *
     * **Usage Example:**
     * ```bash
     * php artisan fleetbase:recovery
     * ```
     *
     * @return int Exit status code. Returns Command::SUCCESS on success.
     *
     * @throws \Exception if an unexpected error occurs during command execution
     */
    public function handle()
    {
        $actions = [
            'Set Role for User',
            'Assign User to Company',
            'Assign Owner to Company',
            'Reset User Password',
            'Set User as System Admin',
        ];

        $action   = $this->choice('Which recovery option would you like to perform?', $actions);
        $actionFn = Str::camel($action);

        $this->alert('Recovery Action: ' . $action);
        try {
            $this->{$actionFn}();
        } catch (\Throwable $e) {
            $this->error($e->getMessage());
        }

        return Command::SUCCESS;
    }

    /**
     * Sets a specific role for a user within a company.
     *
     * This method allows the organization owner to assign a predefined role to a user for a particular company.
     * If the user is not already associated with the company, it prompts the owner to assign the user to the company first.
     *
     * **Workflow:**
     * 1. Prompt for the user if not provided.
     * 2. Prompt for the company associated with the user if not provided.
     * 3. Retrieve the company-user pivot record.
     * 4. If the user is not a member of the company, offer to assign the user to the company.
     * 5. Prompt for the role to assign.
     * 6. Confirm the assignment with the organization owner.
     * 7. Assign the role and provide feedback.
     *
     * **Usage Example:**
     * ```bash
     * php artisan fleetbase:recovery
     * ```
     *
     * @param \Fleetbase\Models\User|null    $user    The user instance. Defaults to null, prompting the owner to select a user.
     * @param \Fleetbase\Models\Company|null $company The company instance. Defaults to null, prompting the owner to select a company.
     *
     * @return void
     *
     * @throws \Exception if an error occurs while assigning the role
     *
     * @see User
     * @see Company
     * @see Role
     */
    public function setRoleForUser(?User $user = null, ?Company $company = null)
    {
        $user = $user ? $user : $this->promptForUser();
        if (!$user) {
            return $this->error('No user selected to set role for.');
        }

        $company = $company ? $company : $this->promptForUserCompany($user, 'Select the which company to assign the role for');
        if (!$company) {
            return $this->error('No company selected to set role for.');
        }

        // Get the company user
        $companyUser = $company->getCompanyUserPivot($user);
        if (!$companyUser) {
            $this->error('User is not a member of the selected company.');
            $tryAssign =  $this->confirm('Would you like to try to assign this user to a company?');

            return $tryAssign ? $this->assignUserToCompany($user, $company) : null;
        }

        $roleName = $this->anticipate('Input the role you wish to set for this user', function ($input) {
            $results = Role::where(DB::raw('lower(name)'), 'like', '%' . str_replace('.', '%', str_replace(',', '%', $input)) . '%')->whereNull('company_uuid')->get();

            return $results->map(function ($role) {
                return $role->name;
            })->values()->toArray();
        });
        $confirm = $this->confirm('Assign the role (' . $roleName . ') to user (' . $user->name . ') for the company (' . $company->name . ')?');

        if ($confirm) {
            try {
                $companyUser->assignSingleRole($roleName);
                $this->info('Role ' . $roleName . ' assigned to user (' . $user->name . ') for the company (' . $company->name . ')');
            } catch (\Throwable $e) {
                $this->error($e->getMessage());
            }
        }

        $this->info('Done');
    }

    /**
     * Promotes a user to a system administrator.
     *
     * This method assigns system administrator privileges to the specified user, granting them full access
     * to the system, including sensitive configurations and secrets. If no user is provided, the method
     * will prompt the administrator to select a user. A warning is displayed to inform about the implications
     * of this action, and confirmation is required before proceeding.
     *
     * @param User|null $user The user to be promoted to system administrator. If null, the method will prompt for a user.
     *
     * @return void
     *
     * @throws \Exception if an error occurs while setting the user type
     */
    public function setUserAsSystemAdmin(?User $user = null)
    {
        $user = $user ? $user : $this->promptForUser();
        if (!$user) {
            return $this->error('No user selected or found to make system admin.');
        }

        // User name output
        $usernameOutput = $user->name . ' (' . $user->email . ')';

        $this->warn('WARNING: By making a user a system administrator they will gain complete system access rights, including sensitive configurations and secrets. Run this command at your own risk.');
        $confirm = $this->confirm('Are you sure you want to make ' . $usernameOutput . ' a system administrator?');

        if ($confirm) {
            try {
                $user->setType('admin');
                $this->info('User ' . $usernameOutput . ' is now a system administrator.');
            } catch (\Throwable $e) {
                $this->error($e->getMessage());
            }
        }

        $this->info('Done');
    }

    /**
     * Resets the password of a specified user.
     *
     * This method allows an administrator to reset a user's password. If no user is provided, the method
     * will prompt to select one. It ensures that the new password is confirmed correctly and provides
     * options to retry the reset if the passwords do not match. Additionally, it offers the option to
     * send the new password to the user's email address.
     *
     * @param User|null $user The user whose password is to be reset. If null, the method will prompt for a user.
     *
     * @return void
     *
     * @throws \Exception if an error occurs while changing the user's password or sending the email
     */
    public function resetUserPassword(?User $user = null)
    {
        $user = $user ? $user : $this->promptForUser();
        if (!$user) {
            return $this->error('No user selected or found to reset password for.');
        }

        // User name output
        $usernameOutput = $user->name . ' (' . $user->email . ')';

        // Inform
        $this->info('Running password reset for user ' . $usernameOutput);

        // Prompt for user password
        $password        = $this->secret('Enter the a new password');
        $confirmPassword = $this->secret('Confirm the new password');

        // Validate
        if ($password !== $confirmPassword) {
            $this->error('Passwords do not match.');
            $retry = $this->confirm('Would you like to continue password reset for the user ' . $usernameOutput . '?');
            if ($retry) {
                return $this->resetUserPassword($user);
            }

            return;
        }

        $confirm          = $this->confirm('Are you sure you want to reset the password');
        $sendUserPassword = $this->confirm('Would you also like to send the users new password to their email (' . $user->email . ')?');

        if ($confirm) {
            try {
                $user->changePassword($password);
                if ($sendUserPassword) {
                    Mail::to($user)->send(new UserCredentialsMail($password, $user));
                }
                $this->info('User ' . $usernameOutput . ' password was changed.');
            } catch (\Throwable $e) {
                $this->error($e->getMessage());
            }
        }

        $this->info('Done');
    }

    /**
     * Assigns a user to a company with a specified role.
     *
     * This method facilitates the assignment of a user to a company by associating them with a defined role.
     * It ensures that the user and company exist and prompts the organization owner to confirm the assignment.
     *
     * **Workflow:**
     * 1. Prompt for the user if not provided.
     * 2. Prompt for the company if not provided.
     * 3. Prompt for the role to assign.
     * 4. Confirm the assignment with the organization owner.
     * 5. Assign the user to the company with the specified role and provide feedback.
     *
     * **Usage Example:**
     * ```bash
     * php artisan fleetbase:recovery
     * ```
     *
     * @param \Fleetbase\Models\User|null    $user    The user instance. Defaults to null, prompting the owner to select a user.
     * @param \Fleetbase\Models\Company|null $company The company instance. Defaults to null, prompting the owner to select a company.
     *
     * @return void
     *
     * @throws \Exception if an error occurs while assigning the user to the company
     *
     * @see User
     * @see Company
     * @see Role
     */
    public function assignUserToCompany(?User $user = null, ?Company $company = null)
    {
        $user = $user ? $user : $this->promptForUser();
        if (!$user) {
            return $this->error('No user selected to assign to a company.');
        }

        $company = $company ? $company : $this->promptForCompany();
        if (!$company) {
            return $this->error('No company selected to assign user to.');
        }

        $roleName = $this->anticipate('Input the role you wish to set for this user', function ($input) {
            $results = Role::where(DB::raw('lower(name)'), 'like', '%' . str_replace('.', '%', str_replace(',', '%', $input)) . '%')->whereNull('company_uuid')->get();

            return $results->map(function ($role) {
                return $role->name;
            })->values()->toArray();
        });
        $confirm = $this->confirm('Assign the user (' . $user->name . ') with the role (' . $roleName . ') to the company (' . $company->name . ')?');

        if ($confirm) {
            try {
                $user->assignCompany($company, $roleName);
                $user->setCompany($company);
                $this->info('User (' . $user->name . ') assigned to company (' . $company->name . ')');
            } catch (\Throwable $e) {
                $this->error($e->getMessage());
            }
        }

        $this->info('Done');
    }

    /**
     * Assigns a user as the owner of a company.
     *
     * This method designates a user as the administrator or owner of a specific company. It ensures that both
     * the user and the company exist and prompts the organization owner to confirm the ownership assignment.
     *
     * **Workflow:**
     * 1. Prompt for the user if not provided.
     * 2. Prompt for the company if not provided.
     * 3. Confirm the ownership assignment with the organization owner.
     * 4. Assign the user as the owner of the company and provide feedback.
     *
     * **Usage Example:**
     * ```bash
     * php artisan fleetbase:recovery
     * ```
     *
     * @param \Fleetbase\Models\User|null    $user    The user instance. Defaults to null, prompting the owner to select a user.
     * @param \Fleetbase\Models\Company|null $company The company instance. Defaults to null, prompting the owner to select a company.
     *
     * @return void
     *
     * @throws \Exception if an error occurs while assigning the owner to the company
     *
     * @see User
     * @see Company
     * @see Role
     */
    public function assignOwnerToCompany(?User $user = null, ?Company $company = null)
    {
        $user = $user ? $user : $this->promptForUser();
        if (!$user) {
            return $this->error('No user selected to assign as owner of a company.');
        }

        $company = $company ? $company : $this->promptForCompany();
        if (!$company) {
            return $this->error('No company selected to set owner for.');
        }

        $confirm = $this->confirm('Set the user (' . $user->name . ') as the owner of the company (' . $company->name . ')?');
        if ($confirm) {
            try {
                $user->assignCompany($company, 'Administrator');
                $company->setOwner($user);
                $this->info('User (' . $user->name . ') made owner of the company (' . $company->name . ')');
            } catch (\Throwable $e) {
                $this->error($e->getMessage());
            }
        }

        $this->info('Done');
    }

    /**
     * Prompts the organization owner to select a user based on input criteria.
     *
     * This method assists in identifying and selecting a user by allowing the organization owner to search
     * using the user's name, email, username, public ID, or UUID. It presents a list of matching users for
     * selection and returns the selected user instance.
     *
     * **Workflow:**
     * 1. Prompt the owner to input search criteria.
     * 2. Display a list of users matching the criteria.
     * 3. Allow the owner to select a user from the list.
     * 4. Return the selected user instance.
     *
     * **Usage Example:**
     * ```php
     * $user = $this->promptForUser();
     * ```
     *
     * @param string $prompt The prompt message for user input. Defaults to 'Find user by searching for name, email or ID'.
     *
     * @return \Fleetbase\Models\User|null the selected user instance or null if no user is selected
     *
     * @throws \Exception if an error occurs while retrieving the user
     *
     * @see User
     */
    public function promptForUser(string $prompt = 'Find user by searching for name, email or ID')
    {
        $selectedUser = null;
        $identifier   = $this->anticipate($prompt, function ($input) {
            $results = User::where(function ($query) use ($input) {
                $query->where(DB::raw('lower(name)'), 'like', str_replace('.', '%', str_replace(',', '%', $input)) . '%');
                $query->orWhere(DB::raw('lower(email)'), 'like', str_replace('.', '%', str_replace(',', '%', $input)) . '%');
                $query->orWhere(DB::raw('lower(username)'), 'like', str_replace('.', '%', str_replace(',', '%', $input)) . '%');
                $query->orWhere(DB::raw('lower(public_id)'), 'like', str_replace('.', '%', str_replace(',', '%', $input)) . '%');
            })->get();

            return $results->map(function ($user) use ($input) {
                if (Str::startsWith(strtolower($user->name), strtolower($input))) {
                    return $user->name;
                }

                if (Str::startsWith(strtolower($user->username), strtolower($input))) {
                    return $user->username;
                }

                if (Str::startsWith(strtolower($user->public_id), strtolower($input))) {
                    return $user->public_id;
                }

                return $user->email;
            })->values()->toArray();
        });
        $users = User::where(function ($query) use ($identifier) {
            $query->where(DB::raw('lower(name)'), 'like', '%' . str_replace('.', '%', str_replace(',', '%', $identifier)) . '%');
            $query->orWhere(DB::raw('lower(email)'), 'like', '%' . str_replace('.', '%', str_replace(',', '%', $identifier)) . '%');
            $query->orWhere(DB::raw('lower(username)'), 'like', '%' . str_replace('.', '%', str_replace(',', '%', $identifier)) . '%');
            $query->orWhere('public_id', $identifier);
            $query->orWhere('uuid', $identifier);
        })->get();
        $userSelections = $users->map(function ($user) {
            return $user->name . ' - ' . $user->email . ' - ' . $user->public_id;
        })->values()->toArray();

        $selectedUserValue = $this->choice('Found ' . Str::plural('user', $users->count()) . ', select the user below to run action for', $userSelections);
        if ($selectedUserValue) {
            $selectedUserSegments = explode('-', $selectedUserValue);
            $selectedUserId       = trim($selectedUserSegments[2]);
            $selectedUser         = User::where('public_id', $selectedUserId)->first();
        }

        return $selectedUser;
    }

    /**
     * Prompts the organization owner to select a company based on input criteria.
     *
     * This method assists in identifying and selecting a company by allowing the organization owner to search
     * using the company's name, public ID, or UUID. It presents a list of matching companies for selection
     * and returns the selected company instance.
     *
     * **Workflow:**
     * 1. Prompt the owner to input search criteria.
     * 2. Display a list of companies matching the criteria.
     * 3. Allow the owner to select a company from the list.
     * 4. Return the selected company instance.
     *
     * **Usage Example:**
     * ```php
     * $company = $this->promptForCompany();
     * ```
     *
     * @param string $prompt The prompt message for company search. Defaults to 'Find company by searching for name or ID'.
     *
     * @return \Fleetbase\Models\Company|null the selected company instance or null if no company is selected
     *
     * @throws \Exception if an error occurs while retrieving the company
     *
     * @see Company
     */
    public function promptForCompany($prompt = 'Find company by searching for name or ID')
    {
        $selectedCompany = null;
        $identifier      = $this->anticipate($prompt, function ($input) {
            $results = Company::where(function ($query) use ($input) {
                $query->where(DB::raw('lower(name)'), 'like', str_replace('.', '%', str_replace(',', '%', $input)) . '%');
                $query->orWhere(DB::raw('lower(public_id)'), 'like', str_replace('.', '%', str_replace(',', '%', $input)) . '%');
            })->get();

            return $results->map(function ($company) use ($input) {
                if (Str::startsWith(strtolower($company->name), strtolower($input))) {
                    return $company->name;
                }

                return $company->public_id;
            })->values()->toArray();
        });
        $companies = Company::where(function ($query) use ($identifier) {
            $query->where(DB::raw('lower(name)'), 'like', '%' . str_replace('.', '%', str_replace(',', '%', $identifier)) . '%');
            $query->orWhere('public_id', $identifier);
            $query->orWhere('uuid', $identifier);
        })->get();
        $companySelections = $companies->map(function ($company) {
            return $company->name . ' - ' . $company->public_id;
        })->values()->toArray();

        $selectedCompanyValue = $this->choice('Found ' . Str::plural('user', $companies->count()) . ', select the company below:', $companySelections);
        if ($selectedCompanyValue) {
            $selectedCompanySegments = explode('-', $selectedCompanyValue);
            $selectedCompanyId       = trim($selectedCompanySegments[1]);
            $selectedCompany         = Company::where('public_id', $selectedCompanyId)->first();
        }

        return $selectedCompany;
    }

    /**
     * Prompts the organization owner to select a company associated with a specific user.
     *
     * This method is used to select one of the companies that a user is already associated with. It presents
     * a list of the user's companies for selection and returns the chosen company instance.
     *
     * **Workflow:**
     * 1. Retrieve the companies associated with the specified user.
     * 2. Display a list of these companies to the owner.
     * 3. Allow the owner to select a company from the list.
     * 4. Return the selected company instance.
     *
     * **Usage Example:**
     * ```php
     * $company = $this->promptForUserCompany($user);
     * ```
     *
     * @param User   $user   the user instance whose associated companies are to be listed
     * @param string $prompt The prompt message for company selection. Defaults to 'Select the users company'.
     *
     * @return \Fleetbase\Models\Company|null the selected company instance or null if no company is selected
     *
     * @throws \Exception if an error occurs while retrieving the user's companies
     *
     * @see User
     * @see Company
     */
    public function promptForUserCompany(User $user, $prompt = 'Select the users company')
    {
        $selectedCompany = null;
        $user->loadMissing('companies');
        $userCompanies     = $user->companies;
        $companySelections = $userCompanies->map(function ($company) {
            return $company->name . ' - ' . $company->public_id;
        })->values()->toArray();

        $selectedCompanyValue = $this->choice('Found ' . Str::plural('user', $userCompanies->count()) . ', ' . $prompt, $companySelections);
        if ($selectedCompanyValue) {
            $selectedCompanySegments = explode('-', $selectedCompanyValue);
            $selectedCompanyId       = trim($selectedCompanySegments[1]);
            $selectedCompany         = Company::where('public_id', $selectedCompanyId)->first();
        }

        return $selectedCompany;
    }
}
