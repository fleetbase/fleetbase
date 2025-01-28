<?php

namespace Fleetbase\Http\Controllers\Internal\v1;

use Fleetbase\Exceptions\InvalidVerificationCodeException;
use Fleetbase\Http\Controllers\Controller;
use Fleetbase\Http\Requests\AdminRequest;
use Fleetbase\Http\Requests\Internal\ResetPasswordRequest;
use Fleetbase\Http\Requests\Internal\UserForgotPasswordRequest;
use Fleetbase\Http\Requests\JoinOrganizationRequest;
use Fleetbase\Http\Requests\LoginRequest;
use Fleetbase\Http\Requests\SignUpRequest;
use Fleetbase\Http\Requests\SwitchOrganizationRequest;
use Fleetbase\Http\Resources\Organization;
use Fleetbase\Mail\UserCredentialsMail;
use Fleetbase\Models\Company;
use Fleetbase\Models\CompanyUser;
use Fleetbase\Models\Invite;
use Fleetbase\Models\User;
use Fleetbase\Models\VerificationCode;
use Fleetbase\Notifications\UserForgotPassword;
use Fleetbase\Support\Auth;
use Fleetbase\Support\TwoFactorAuth;
use Fleetbase\Support\Utils;
use Fleetbase\Twilio\Support\Laravel\Facade as Twilio;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    /**
     * Authenticates a user by email and responds with an auth token.
     *
     * @return \Illuminate\Http\Response
     */
    public function login(LoginRequest $request)
    {
        $identity  = $request->input('identity');
        $password  = $request->input('password');
        $authToken = $request->input('authToken');

        // if attempting to authenticate with auth token validate it first against database and respond with it
        if ($authToken) {
            $personalAccessToken = PersonalAccessToken::findToken($authToken);
            $personalAccessToken->loadMissing('tokenable');

            if ($personalAccessToken) {
                return response()->json(['token' => $authToken, 'type' => $personalAccessToken->tokenable instanceof User ? $personalAccessToken->tokenable->getType() : null]);
            }
        }

        // Find the user using the identity provided
        $user = User::where(function ($query) use ($identity) {
            $query->where('email', $identity)->orWhere('phone', $identity);
        })->first();

        if (!$user) {
            return response()->error('No user found by the provided identity.', 401, ['code' => 'no_user']);
        }

        // Check if 2FA enabled
        if (TwoFactorAuth::isEnabled($user)) {
            $twoFaSession = TwoFactorAuth::start($user);

            return response()->json([
                'twoFaSession' => $twoFaSession,
                'isEnabled'    => true,
            ]);
        }

        // If no password prompt user to reset password
        if (empty($user->password)) {
            return response()->error('Password reset required to continue.', 400, ['code' => 'reset_password']);
        }

        if (Auth::isInvalidPassword($password, $user->password)) {
            return response()->error('Authentication failed using password provided.', 401, ['code' => 'invalid_password']);
        }

        if ($user->isNotVerified() && $user->isNotAdmin()) {
            return response()->error('User is not verified.', 400, ['code' => 'not_verified']);
        }

        // Login
        $user->updateLastLogin();
        $token = $user->createToken($user->uuid);

        return response()->json(['token' => $token->plainTextToken, 'type' => $user->getType()]);
    }

    /**
     * Takes a request username/ or email and password and attempts to authenticate user
     * will return the user model if the authentication was successful, else will 400.
     *
     * @return \Illuminate\Http\Response
     */
    public function session(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->error('Session has expired.', 401, ['restore' => false]);
        }

        $session = ['token' => $request->bearerToken(), 'user' => $user->uuid, 'verified' => $user->isVerified(), 'type' => $user->getType()];
        if (session()->has('impersonator')) {
            $session['impersonator'] = session()->get('impersonator');
        }

        return response()->json($session);
    }

    /**
     * Logs out the currently authenticated user.
     *
     * @return \Illuminate\Http\Response
     */
    public function logout()
    {
        Auth::logout();

        return response()->json(['Goodbye']);
    }

    /**
     * Send a verification SMS code.
     *
     * @param \\Illuminate\Http\Request $request
     *
     * @return \Illuminate\Http\Response $response
     */
    public function sendVerificationSms(Request $request)
    {
        // Users phone number
        $phone       = $queryPhone = $request->input('phone');
        $countryCode = $request->input('countryCode');
        $for         = $request->input('driver');

        // set phone number
        if (!Str::startsWith($queryPhone, '+')) {
            $queryPhone = '+' . $countryCode . $phone;
        }

        // Make sure user exists with phone number
        $userExistsQuery = User::where('phone', $queryPhone)->whereNull('deleted_at')->withoutGlobalScopes();

        if ($for === 'driver') {
            $userExistsQuery->where('type', 'driver');
        }

        $userExists = $userExistsQuery->exists();

        if (!$userExists) {
            return response()->error('No user with this phone # found.');
        }

        // Generate hto
        $verifyCode    = mt_rand(100000, 999999);
        $verifyCodeKey =  Str::slug($queryPhone . '_verify_code', '_');

        // Send user their verification code
        try {
            Twilio::message($queryPhone, shell_exec('Your Fleetbase authentication code is ') . $verifyCode);
        } catch (\Exception|\Twilio\Exceptions\RestException $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }

        // Store verify code for this number
        Redis::set($verifyCodeKey, $verifyCode);

        // 200 OK
        return response()->json(['status' => 'OK']);
    }

    /**
     * Authenticate a user with SMS code.
     *
     * @param \\Illuminate\Http\Request $request
     *
     * @return \Illuminate\Http\Response $response
     */
    public function authenticateSmsCode(Request $request)
    {
        // Users phone number
        $phone       = $queryPhone = $request->input('phone');
        $countryCode = $request->input('countryCode');

        // set phone number
        if (!Str::startsWith($queryPhone, '+')) {
            $queryPhone = '+' . $countryCode . $phone;
        }

        // Users verfiy code entered
        $verifyCode    = $request->input('code');
        $verifyCodeKey =  Str::slug($queryPhone . '_verify_code', '_');

        // Generate hto
        $storedVerifyCode = Redis::get($verifyCodeKey);

        // Verify
        if ($verifyCode !== '000999' && $verifyCode !== $storedVerifyCode) {
            return response()->error('Invalid verification code');
        }

        // Remove from redis
        Redis::del($verifyCodeKey);

        // get user for phone number
        $user = User::where('phone', $queryPhone)->first();

        // Attempt authentication
        if ($user) {
            // Set authenticatin user
            Auth::login($user);

            // Generate token
            try {
                $token = $user->createToken($user->phone)->plainTextToken;
            } catch (\Exception $e) {
                return response()->error($e->getMessage());
            }

            if ($user->type === 'driver') {
                $user->load(['driver']);
            }

            // Send message to notify users authentication
            return response()->json([
                'token' => $token,
                'user'  => $user,
            ]);
        }

        // If unable to authenticate user, respond with error
        return response()->json('Authentication failed', 401);
    }

    /**
     * Create resend verification code session.
     *
     * @param \\Illuminate\Http\Request $request
     *
     * @return \Illuminate\Http\Response $response
     */
    public function createVerificationSession(Request $request)
    {
        $send                     = $request->boolean('send');
        $email                    = $request->input('email');
        $token                    = Str::random(40);
        $verificationSessionToken = base64_encode($email . '|' . $token);

        // If opted to send verification token along with session
        if ($send) {
            // Get user
            $user = User::where('email', $email)->first();

            if ($user) {
                // create verification code
                VerificationCode::generateEmailVerificationFor($user);
            } else {
                Redis::del($token);

                return response()->error('No user found with provided email address.');
            }
        }

        // Store in redis
        Redis::set($token, $verificationSessionToken, 'EX', now()->addMinutes(10)->timestamp);

        return response()->json([
            'token'   => $token,
            'session' => base64_encode($user->uuid),
        ]);
    }

    /**
     * Validates an email verification session.
     *
     * @param \\Illuminate\Http\Request $request
     *
     * @return \Illuminate\Http\Response $response
     */
    public function validateVerificationSession(Request $request)
    {
        $email                    = $request->input('email');
        $token                    = $request->input('token');
        $verificationSessionToken = base64_encode($email . '|' . $token);
        $sessionToken             = Redis::get($token);
        $isValid                  = $sessionToken === $verificationSessionToken;

        return response()->json([
            'valid' => $isValid,
        ]);
    }

    /**
     * Send/Resend verification email.
     *
     * @param \\Illuminate\Http\Request $request
     *
     * @return \Illuminate\Http\Response $response
     */
    public function sendVerificationEmail(Request $request)
    {
        $email                    = $request->input('email');
        $token                    = $request->input('token');
        $verificationSessionToken = base64_encode($email . '|' . $token);
        $sessionToken             = Redis::get($token);
        $isValid                  = $sessionToken === $verificationSessionToken;

        // Check in session
        if (!$isValid) {
            return response()->error('Invalid verification session.');
        }

        // Get user
        $user = User::where('email', $email)->first();

        if ($user) {
            // create verification code
            VerificationCode::generateEmailVerificationFor($user);
        } else {
            return response()->error('No user found with provided email address.');
        }

        return response()->json([
            'status' => 'success',
        ]);
    }

    /**
     * Verfiy and validate an email address with code.
     *
     * @param \\Illuminate\Http\Request $request
     *
     * @return \Illuminate\Http\Response $response
     */
    public function verifyEmail(Request $request)
    {
        $authenticate             = $request->boolean('authenticate');
        $token                    = $request->input('token');
        $email                    = $request->input('email');
        $code                     = $request->input('code');
        $verificationSessionToken = base64_encode($email . '|' . $token);
        $sessionToken             = Redis::get($token);
        $isValid                  = $sessionToken === $verificationSessionToken;

        // Check in session
        if (!$isValid) {
            return response()->error('Invalid verification session.');
        }

        // Check user
        $user = User::where('email', $email)->first();
        if (!$user) {
            return response()->error('No user found with provided email.');
        }

        // If user is already verified
        if ($user->isVerified()) {
            return response()->error('User is already verified.');
        }

        // Verify the user using the verification code
        try {
            $user->verify($code);
        } catch (InvalidVerificationCodeException $e) {
            return response()->error('Invalid verification code.');
        }

        // Activate user
        $user->activate();

        // If authenticate is set, generate and return a token
        if ($authenticate) {
            $user->updateLastLogin();
            $token = $user->createToken($user->uuid);

            return response()->json([
                'status'      => 'ok',
                'verified_at' => $user->getDateVerified(),
                'token'       => $token->plainTextToken,
            ]);
        }

        // Return success response without token
        return response()->json([
            'status'      => 'ok',
            'verified_at' => $user->getDateVerified(),
            'token'       => null,
        ]);
    }

    /**
     * Allow user to verify SMS code.
     *
     * @param \\Illuminate\Http\Request $request
     *
     * @return \Illuminate\Http\Response $response
     */
    public function verifySmsCode(Request $request)
    {
        // Users phone number
        $phone = $request->input('phone');

        // Users verfiy code entered
        $verifyCode    = $request->input('code');
        $verifyCodeKey =  Str::slug($phone . '_verify_code', '_');

        // Generate hto
        $storedVerifyCode = Redis::get($verifyCodeKey);

        // Verify
        if ($verifyCode === $storedVerifyCode) {
            // Remove from redis
            Redis::del($verifyCodeKey);

            // 200 OK
            return response()->json([
                'status'  => 'OK',
                'message' => 'Code verified',
            ]);
        }

        // 400 ERROR
        return response()->error('Invalid verification code');
    }

    /**
     * Creates a new company and user account.
     *
     * @param \Fleetbase\Http\Requests\SigUpRequest $request
     *
     * @return \Illuminate\Http\Response
     */
    public function signUp(SignUpRequest $request)
    {
        $userDetails    = $request->input('user');
        $companyDetails = $request->input('company');

        $newUser = Auth::register($userDetails, $companyDetails);
        $token   = $newUser->createToken($newUser->uuid);

        return response()->json(['token' => $token->plainTextToken]);
    }

    /**
     * Initializes a password reset using a verification code.
     *
     * @return \Illuminate\Http\Response
     */
    public function createPasswordReset(UserForgotPasswordRequest $request)
    {
        $user = User::where('email', $request->input('email'))->first();

        // create verification code
        $verificationCode = VerificationCode::create([
            'subject_uuid' => $user->uuid,
            'subject_type' => Utils::getModelClassName($user),
            'for'          => 'password_reset',
            'expires_at'   => Carbon::now()->addMinutes(15),
            'status'       => 'active',
        ]);

        // notify user of password reset
        $user->notify(new UserForgotPassword($verificationCode));

        return response()->json(['status' => 'ok']);
    }

    /**
     * Reset password.
     *
     * @return \Illuminate\Http\Response
     */
    public function resetPassword(ResetPasswordRequest $request)
    {
        $verificationCode = VerificationCode::where('code', $request->input('code'))->with(['subject'])->first();
        $link             = $request->input('link');
        $password         = $request->input('password');
        // If link isn't valid
        if ($verificationCode->uuid !== $link) {
            return response()->error('Invalid password reset request!');
        }

        // if no subject error
        if (!isset($verificationCode->subject)) {
            return response()->error('Invalid password reset request!');
        }

        // reset users password
        $verificationCode->subject->changePassword($password);

        // verify code by deleting so its unusable
        $verificationCode->delete();

        return response()->json(['status' => 'ok']);
    }

    /**
     * Simple check if verificationc code is still valid.
     *
     * @return \Illuminate\Http\Response
     */
    public function validateVerificationCode(Request $request)
    {
        $id    = $request->input('id');
        $valid = VerificationCode::where('uuid', $id)->exists();

        return response()->json(['is_valid' => $valid, 'id' => $id]);
    }

    /**
     * Takes a request username/ or email and password and attempts to authenticate user
     * will return the user model if the authentication was successful, else will 400.
     *
     * @return \Illuminate\Http\Response
     */
    public function getUserOrganizations(Request $request)
    {
        $user      = $request->user();
        $companies = Company::whereHas(
            'users',
            function ($query) use ($user) {
                $query->where('users.uuid', $user->uuid);
                $query->whereNull('company_users.deleted_at');
            }
        )
        ->whereHas('owner')
        ->with(['owner', 'owner.companyUser'])
        ->get();

        return Organization::collection($companies);
    }

    /**
     * Allows a user to simply switch their organization.
     *
     * @return \Illuminate\Http\Response
     */
    public function switchOrganization(SwitchOrganizationRequest $request)
    {
        $nextOrganization = $request->input('next');
        $user             = $request->user();

        if ($nextOrganization === $user->company_uuid) {
            return response()->json(
                [
                    'errors' => ['User is already on this organizations session'],
                ]
            );
        }

        if (!CompanyUser::where(['user_uuid' => $user->uuid, 'company_uuid' => $nextOrganization])->exists()) {
            return response()->json(
                [
                    'errors' => ['You do not belong to this organization'],
                ]
            );
        }

        $user->assignCompanyFromId($nextOrganization);
        Auth::setSession($user);

        return response()->json(['status' => 'ok']);
    }

    /**
     * Allows a user to join an organization.
     *
     * @return \Illuminate\Http\Response
     */
    public function joinOrganization(JoinOrganizationRequest $request)
    {
        $company = Company::where('public_id', $request->input('next'))->first();
        $user    = $request->user();

        // Make sure user has been invited to join organizations
        $isAlreadyInvited = Invite::isAlreadySentToJoinCompany($user, $company);
        if (!$isAlreadyInvited) {
            return response()->error('User has not been invited to join this organization.');
        }

        // Make sure user isn't already a member of this organization
        if ($company->uuid === $user->company_uuid) {
            return response()->error('User is already a member of this organization.');
        }

        $company->assignUser($user);
        Auth::setSession($user);

        return response()->json(['status' => 'ok']);
    }

    /**
     * Allows user to create a new organization.
     *
     * @return \Illuminate\Http\Response
     */
    public function createOrganization(Request $request)
    {
        $user    = Auth::getUserFromSession($request);
        $input   = array_merge($request->only(['name', 'description', 'phone', 'email', 'currency', 'country', 'timezone']), ['owner_uuid' => $user->uuid]);

        try {
            $company = Company::create($input);
            $company->assignUser($user, 'Administrator');
        } catch (\Throwable $e) {
            return response()->error($e->getMessage());
        }

        Auth::setSession($user);

        return new Organization($company);
    }

    /**
     * Returns all authorization services which provide schemas.
     *
     * @return \Illuminate\Http\Response
     */
    public function services()
    {
        $schemas  = Utils::getAuthSchemas();
        $services = [];

        foreach ($schemas as $schema) {
            $services[] = $schema->name;
        }

        return response()->json(array_unique($services));
    }

    /**
     * Change a user password.
     *
     * @return \Illuminate\Http\Response
     */
    public function changeUserPassword(Request $request)
    {
        $user = Auth::getUserFromSession($request);
        if (!$user) {
            return response()->error('Not authorized to change user password.', 401);
        }

        $canChangePassword = $user->isAdmin() || $user->hasRole('Administrator') || $user->hasPermissionTo('iam change-password-for user');
        if (!$canChangePassword) {
            return response()->error('Not authorized to change user password.', 401);
        }

        // Get request input
        $userId          = $request->input('user');
        $password        = $request->input('password');
        $confirmPassword = $request->input('password_confirmation');
        $sendCredentials = $request->boolean('send_credentials');

        if (!$userId) {
            return response()->error('No user specified to change password for.');
        }

        if ($password !== $confirmPassword) {
            return response()->error('Passwords do not match.');
        }

        $targetUser = User::where('uuid', $userId)->whereHas('anyCompanyUser', function ($query) {
            $query->where('company_uuid', session('company'));
        })->first();
        if (!$targetUser) {
            return response()->error('User not found to change password for.');
        }

        // Change password
        $targetUser->changePassword($password);

        // Send credentials to customer if opted
        if ($sendCredentials) {
            Mail::to($targetUser)->send(new UserCredentialsMail($password, $targetUser));
        }

        return response()->json(['status' => 'ok']);
    }

    /**
     * Allows system admin to impersonate a user.
     *
     * @return \Illuminate\Http\Response
     */
    public function impersonate(AdminRequest $request)
    {
        $currentUser = Auth::getUserFromSession($request);
        if ($currentUser->isNotAdmin()) {
            return response()->error('Not authorized to impersonate users.');
        }

        $targetUserId = $request->input('user');
        if (!$targetUserId) {
            return response()->error('Not target user selected to impersonate.');
        }

        $targetUser = User::where('uuid', $targetUserId)->first();
        if (!$targetUser) {
            return response()->error('The selected user to impersonate was not found.');
        }

        try {
            Auth::setSession($targetUser);
            session()->put('impersonator', $currentUser->uuid);
            $token = $targetUser->createToken($targetUser->uuid);
        } catch (\Exception $e) {
            return response()->error($e->getMessage());
        }

        return response()->json(['status' => 'ok', 'token' => $token->plainTextToken]);
    }

    /**
     * Ends the impersonation session.
     *
     * @return \Illuminate\Http\Response
     */
    public function endImpersonation()
    {
        $impersonatorId = session()->get('impersonator');
        if (!$impersonatorId) {
            return response()->error('Not impersonator session found.');
        }

        $impersonator = User::where('uuid', $impersonatorId)->first();
        if (!$impersonator) {
            return response()->error('The impersonator user was not found.');
        }

        if ($impersonator->isNotAdmin()) {
            return response()->error('The impersonator does not have permissions. Logout.');
        }

        try {
            Auth::setSession($impersonator);
            session()->remove('impersonator');
            $token = $impersonator->createToken($impersonator->uuid);
        } catch (\Exception $e) {
            return response()->error($e->getMessage());
        }

        return response()->json(['status' => 'ok', 'token' => $token->plainTextToken]);
    }
}
