<?php

namespace Fleetbase\Support;

use Fleetbase\Models\Company;
use Fleetbase\Models\Setting;
use Fleetbase\Models\User;
use Fleetbase\Models\VerificationCode;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;

/**
 * Class TwoFactorAuth.
 */
class TwoFactorAuth
{
    /**
     * Save Two-Factor Authentication settings for System wide usage.
     *
     * @param array $twoFaSettings an array containing Two-Factor Authentication settings
     *
     * @return Setting|null the saved Two-Factor Authentication settings, or null on failure
     *
     * @throws \Exception if invalid Two-Factor Authentication settings data is provided
     */
    public static function configureTwoFaSettings(array $twoFaSettings = []): ?Setting
    {
        if (!is_array($twoFaSettings)) {
            throw new \Exception('Invalid 2FA settings data.');
        }

        return Setting::configureSystem('2fa', $twoFaSettings);
    }

    /**
     * Get system wide Two-Factor Authentication settings.
     *
     * @return Setting|null the Two-Factor Authentication settings, or null if not found
     */
    public static function getTwoFaConfiguration(): ?Setting
    {
        $twoFaSettings = Setting::getByKey('system.2fa');

        if (!$twoFaSettings) {
            $twoFaSettings = static::configureTwoFaSettings(['enabled' => false, 'method' => 'email', 'enforced' => false]);
        }

        return $twoFaSettings;
    }

    /**
     * Save Two-Factor Authentication settings for a specific subject (e.g., User, Company).
     *
     * @param Model $subject       the subject model for which to save the settings
     * @param array $twoFaSettings an array containing Two-Factor Authentication settings
     *
     * @return Setting the saved Two-Factor Authentication settings
     *
     * @throws \Exception if the subject is not an instance of Model
     */
    private static function saveTwoFaSettingsForSubject(Model $subject, array $twoFaSettings = []): Setting
    {
        if (!$subject instanceof Model) {
            throw new \Exception('Subject must be a model.');
        }

        $type = Str::singular(Str::snake($subject->getTable(), '-')); // `user` - `company`
        $key  = $type . '.' . $subject->getKey() . '.2fa';

        return Setting::configure($key, $twoFaSettings);
    }

    /**
     * Save Two-Factor Authentication settings for a user.
     *
     * @param User  $user          the user for which to save the settings
     * @param array $twoFaSettings an array containing Two-Factor Authentication settings
     *
     * @return Setting the saved Two-Factor Authentication settings
     */
    public static function saveTwoFaSettingsForUser(User $user, array $twoFaSettings = []): Setting
    {
        return static::saveTwoFaSettingsForSubject($user, $twoFaSettings);
    }

    /**
     * Save Two-Factor Authentication settings for a company.
     *
     * @param Company $company       the company for which to save the settings
     * @param array   $twoFaSettings an array containing Two-Factor Authentication settings
     *
     * @return Setting the saved Two-Factor Authentication settings
     */
    public static function saveTwoFaSettingsForCompany(Company $company, array $twoFaSettings = []): Setting
    {
        return static::saveTwoFaSettingsForSubject($company, $twoFaSettings);
    }

    /**
     * Get Two-Factor Authentication settings for a specific subject (e.g., User, Company).
     *
     * @param Model $subject the subject model for which to retrieve the settings
     *
     * @return Setting the Two-Factor Authentication settings for the subject
     *
     * @throws \Exception if the subject is not an instance of Model
     */
    private static function getTwoFaSettingsForSubject(Model $subject): Setting
    {
        if (!$subject instanceof Model) {
            throw new \Exception('Subject must be a model.');
        }

        $type = Str::singular(Str::snake($subject->getTable(), '-')); // `user` - `company`
        $key  = $type . '.' . $subject->getKey() . '.2fa';

        // Get the settings
        $twoFaSettings = Setting::getByKey($key);

        if (!$twoFaSettings) {
            $twoFaSettings = static::saveTwoFaSettingsForSubject($subject, ['enabled' => false, 'method' => 'email']);
        }

        return $twoFaSettings;
    }

    /**
     * Get Two-Factor Authentication settings for a user.
     *
     * @param User $user the user for which to retrieve the settings
     *
     * @return Setting the Two-Factor Authentication settings for the user
     */
    public static function getTwoFaSettingsForUser(User $user): Setting
    {
        return static::getTwoFaSettingsForSubject($user);
    }

    /**
     * Get Two-Factor Authentication settings for a company.
     *
     * @param Company $company the company for which to retrieve the settings
     *
     * @return Setting the Two-Factor Authentication settings for the company
     */
    public static function getTwoFaSettingsForCompany(Company $company): Setting
    {
        return static::getTwoFaSettingsForSubject($company);
    }

    /**
     * Get a client session token from a Two-Factor Authentication session.
     *
     * @param string      $token       the Two-Factor Authentication token
     * @param string      $identity    the user identity
     * @param string|null $clientToken the optional client session token
     *
     * @return string the client session token
     *
     * @throws \Exception if Two-Factor Authentication is not enabled or the session is invalid
     */
    public static function getClientSessionTokenFromTwoFaSession(string $token, string $identity, ?string $clientToken = null): string
    {
        // Get user from identity
        $user = static::getUserFromIdentity($identity);
        if (!$user) {
            throw new \Exception('No user found for the identity provided.');
        }

        // Check if enabled 2FA
        if (!self::isEnabled($user)) {
            throw new \Exception('2FA Authentication is not enabled.');
        }

        // If a client session token is provided validate by fetching the verification code
        // If a verification code exists then we just return the current valid client session
        if ($clientToken) {
            $verificationCode = static::getVerificationCodeFromClientToken($clientToken);

            // If verification code has expired throw exception
            if ($verificationCode && $verificationCode->hasExpired()) {
                static::forgetTwoFaSession($token, $identity);
                throw new \Exception('2FA Verification code has expired.');
            }

            if ($verificationCode) {
                return $clientToken;
            } else {
                static::forgetTwoFaSession($token, $identity);
                throw new \Exception('2FA Verification code is invalid or has expired.');
            }
        }

        // Decrypt two fa session token
        $twoFaSessionKey = static::decryptSessionKey($token, $user->uuid);

        // Validate session key that it is valid and exists
        if (static::isTwoFaSessionKeyValid($twoFaSessionKey, $user)) {
            // Send the verification code then create a client session for the verification code and user
            $verificationCode = static::sendVerificationCode($user);
            $clientToken      = static::createClientSessionToken($verificationCode);

            return $clientToken;
        }

        throw new \Exception('2FA Authentication session is invalid');
    }

    /**
     * Validate a Two-Factor Authentication session token.
     *
     * @param string      $token       the Two-Factor Authentication token
     * @param string      $identity    the user identity
     * @param string|null $clientToken the optional client session token
     *
     * @return bool true if the session token is valid, false otherwise
     */
    public static function validateSessionToken(string $token, string $identity, ?string $clientToken = null): bool
    {
        // Get user from identity
        $user = static::getUserFromIdentity($identity);
        if (!$user) {
            return false;
        }

        // Check if enabled 2FA
        if (!self::isEnabled($user)) {
            return false;
        }

        // If a client session token is provided validate by fetching the verification code
        // If a verification code exists then we just return the current valid client session
        if ($clientToken) {
            $verificationCode = static::getVerificationCodeFromClientToken($clientToken);

            // If verification code has expired throw exception
            if ($verificationCode && $verificationCode->hasExpired()) {
                static::forgetTwoFaSession($token, $identity);

                return false;
            }

            if ($verificationCode) {
                return $clientToken;
            } else {
                static::forgetTwoFaSession($token, $identity);

                return false;
            }
        }

        // Decrypt two fa session token
        $twoFaSessionKey = static::decryptSessionKey($token, $user->uuid);

        // Validate session key that it is valid and exists
        if (static::isTwoFaSessionKeyValid($twoFaSessionKey, $user)) {
            return true;
        }

        return false;
    }

    /**
     * Send a Two-Factor Authentication verification code to the user.
     *
     * @param User $user         the user to send the verification code to
     * @param int  $expiresAfter the expiration time for the verification code in seconds
     *
     * @return VerificationCode the generated verification code
     *
     * @throws \Exception if no phone number or email is available, or an invalid method is selected in settings
     */
    public static function sendVerificationCode(User $user, int $expiresAfter = 61): VerificationCode
    {
        $twoFaSettings = static::getTwoFaSettingsForUser($user);
        $method        = $twoFaSettings->getValue('method', 'email');
        $expiresAfter  = Carbon::now()->addSeconds($expiresAfter);

        // Create SMS and Email message callback
        $messageCallback = function ($verificationCode) {
            return $verificationCode->code . ' is your ' . config('app.name') . ' 2FA Code';
        };

        if ($method === 'sms') {
            // if user has no phone number throw error
            if (!$user->phone) {
                throw new \Exception('No phone number to send 2FA code to.');
            }

            // create verification code
            return VerificationCode::generateSmsVerificationFor($user, '2fa', [
                'messageCallback' => $messageCallback,
                'expiresAfter'    => $expiresAfter,
            ]);
        }

        if ($method === 'email') {
            // if user has no phone number throw error
            if (!$user->email) {
                throw new \Exception('No email to send 2FA code to.');
            }

            // create verification code
            return VerificationCode::generateEmailVerificationFor($user, '2fa', [
                'subject' => $messageCallback,
                'content' => function ($verificationCode) {
                    return 'Your two-factor authentication code is: ' . $verificationCode->code;
                },
                'expiresAfter' => $expiresAfter,
            ]);
        }

        throw new \Exception('Invalid 2FA method selected in settings.');
    }

    /**
     * Create a Two-Factor Authentication session if enabled.
     *
     * @param string $identity the user identity
     *
     * @return string|null the Two-Factor Authentication session key, or null if not enabled
     */
    public static function createTwoFaSessionIfEnabled(string $identity): ?string
    {
        $user = static::getUserFromIdentity($identity);
        if (!$user) {
            return null;
        }

        $isTwoFaEnabled = self::isEnabled($user);

        if ($isTwoFaEnabled) {
            return self::start($identity);
        }

        return null;
    }

    /**
     * Check if Two-Factor Authentication is enabled.
     *
     * @return bool true if Two-Factor Authentication is enabled, false otherwise
     */
    public static function isEnabled(User $user): bool
    {
        $twoFaSettings = static::getTwoFaSettingsForUser($user);
        if (!$twoFaSettings) {
            return false;
        }

        return $twoFaSettings->getBoolean('enabled');
    }

    /**
     * True if 2FA should be enforced for a user.
     */
    public static function shouldEnforce(User $user): bool
    {
        $systemEnforced  = static::isSystemEnforced();
        $companyEnforced = static::isCompanyEnforced($user->company);
        $userEnabled     = static::isEnabled($user);

        return $userEnabled ? !$userEnabled : $systemEnforced || $companyEnforced;
    }

    /**
     * Check if Two-Factor Authentication is enforced for company.
     *
     * @return bool true if Two-Factor Authentication is enforced, false otherwise
     */
    public static function isCompanyEnforced(Company $company): bool
    {
        $twoFaSettings = static::getTwoFaSettingsForCompany($company);

        if ($twoFaSettings) {
            return $twoFaSettings->getBoolean('enforced');
        }

        return false;
    }

    /**
     * True if 2FA is enforced system wide.
     */
    public static function isSystemEnforced(): bool
    {
        $twoFaSettings = static::getTwoFaConfiguration();

        if (!$twoFaSettings) {
            return false;
        }

        return $twoFaSettings->getBoolean('enforced');
    }

    /**
     * Start a Two-Factor Authentication session.
     *
     * @param string $identity    the user identity
     * @param int    $tokenLength the length of the generated token
     *
     * @return string|null the Two-Factor Authentication session key, or null on failure
     */
    public static function start(string $identity, int $tokenLength = 40): ?string
    {
        $user = static::getUserFromIdentity($identity);

        if ($user) {
            $token           = Str::random($tokenLength);
            $twoFaSessionKey = static::createTwoFaSessionKey($user, $token);

            return static::encryptSessionKey($twoFaSessionKey, $user->uuid);
        }

        return null;
    }

    /**
     * Verify a Two-Factor Authentication code and return a user token.
     *
     * @param string $code        the user-provided verification code
     * @param string $token       the Two-Factor Authentication token
     * @param string $clientToken the client session token
     *
     * @return string the user token
     *
     * @throws \Exception if verification code is invalid or expired, or session is invalid
     */
    public static function verifyCode(string $code, string $token, string $clientToken): string
    {
        // Get verification code from the client token
        $verificationCode = static::getVerificationCodeFromClientToken($clientToken);

        // If no verification code return null
        if (!$verificationCode) {
            throw new \Exception('Verification code is invalid.');
        }

        // If we have verification code then get user from it
        if ($verificationCode) {
            // Get user from verification code
            $user = static::getUserFromVerificationCode($verificationCode);

            // If no user found in the verification code
            if (!$user) {
                throw new \Exception('User not found for verification code.');
            }

            // Get the user identity
            $identity = $user->getIdentity();

            // Next we will validate the session token
            if (static::validateSessionToken($token, $identity, $clientToken)) {
                // Get the two factor session key
                $twoFaSessionKey = static::decryptSessionKey($token, $user->uuid);

                // If session key is valid
                if (static::isTwoFaSessionKeyValid($twoFaSessionKey, $user)) {
                    // Make sure verification code has not expired
                    if ($verificationCode->hasExpired()) {
                        throw new \Exception('Verification code has expired.');
                    }

                    // Check if verification code matches user provided code
                    $verificationCodeMatches = $verificationCode->code === $code;
                    if ($verificationCodeMatches) {
                        // Kill the two fa session
                        Redis::del($twoFaSessionKey);

                        // Authenticate the user
                        $token = $user->createToken($user->uuid);

                        return $token->plainTextToken;
                    }

                    throw new \Exception('Verification code does not match.');
                }
            }
        }

        throw new \Exception('Verification code is invalid.');
    }

    /**
     * Resend a Two-Factor Authentication verification code.
     *
     * @param string $identity the user identity
     * @param string $token    the Two-Factor Authentication token
     *
     * @return string the newly generated client session token
     *
     * @throws \Exception if no user found or the Two-Factor Authentication session is invalid
     */
    public static function resendCode(string $identity, string $token): string
    {
        $user = static::getUserFromIdentity($identity);
        if (!$user) {
            throw new \Exception('No user found using the provided identity');
        }

        // Make sure two factor session is valid
        if (!static::validateSessionToken($token, $identity)) {
            throw new \Exception('2FA session is invalid.');
        }

        // Send new verification code for user
        $verificationCode = static::sendVerificationCode($user);

        // Return with newly generated client session token for the new verification code
        return static::createClientSessionToken($verificationCode);
    }

    /**
     * Create a client session token for a verification code.
     *
     * @param VerificationCode $verificationCode the verification code
     * @param int              $expiresAfter     the expiration time for the client session token in seconds
     *
     * @return string the client session token
     */
    public static function createClientSessionToken(VerificationCode $verificationCode, int $expiresAfter = 61): string
    {
        $expiresAfter = Carbon::now()->addSeconds($expiresAfter);
        $clientToken  = base64_encode($expiresAfter . '|' . $verificationCode->uuid . '|' . Str::random());

        return $clientToken;
    }

    /**
     * Check if a Two-Factor Authentication session key is valid.
     *
     * @param string $twoFaSessionKey the Two-Factor Authentication session key
     * @param User   $user            the user the session key was created for
     *
     * @return bool true if the session key is valid, false otherwise
     */
    public static function isTwoFaSessionKeyValid(string $twoFaSessionKey, User $user): bool
    {
        $exists = Redis::exists($twoFaSessionKey);

        if ($exists) {
            $parts  = explode(':', $twoFaSessionKey);
            $userId = Arr::get($parts, 1);

            return Str::isUuid($userId) && $userId === $user->uuid;
        }

        return false;
    }

    /**
     * Forget the Two-Factor Authentication session based on the provided token and identity.
     *
     * @param string $token    the token associated with the Two-Factor Authentication session
     * @param string $identity The identity (e.g., username) of the user.
     *
     * @return bool returns true if the Two-Factor Authentication session was successfully forgotten,
     *              false otherwise
     *
     * @throws \Exception thrown when no user is found for the provided identity
     */
    public static function forgetTwoFaSession(string $token, string $identity): bool
    {
        $user = static::getUserFromIdentity($identity);
        if (!$user) {
            throw new \Exception('No user found for the identity provided.');
        }

        // Get session key and destroy it
        $twoFaSessionKey = static::decryptSessionKey($token, $user);

        return Redis::del($twoFaSessionKey);
    }

    /**
     * Create a Two-Factor Authentication session key.
     *
     * @param User   $user         the user for whom the session key is created
     * @param string $token        the Two-Factor Authentication token
     * @param bool   $storeInCache whether to store the key in the cache
     * @param int    $expiresAfter the expiration time for the session key in seconds
     *
     * @return string the Two-Factor Authentication session key
     */
    private static function createTwoFaSessionKey(User $user, string $token, bool $storeInCache = true, int $expiresAfter = 600): string
    {
        $twoFaSessionKey = 'two_fa_session:' . $user->uuid . ':' . $token;

        if ($storeInCache) {
            Redis::set($twoFaSessionKey, $user->uuid, 'EX', now()->addSeconds($expiresAfter)->timestamp);
        }

        return $twoFaSessionKey;
    }

    /**
     * Get a user based on the provided identity (email or phone).
     *
     * @param string $identity the user identity (email or phone)
     *
     * @return User|null the user, or null if not found
     */
    private static function getUserFromIdentity(string $identity): ?User
    {
        return User::where(function ($query) use ($identity) {
            $query->where('email', $identity)->orWhere('phone', $identity);
        })->first();
    }

    /**
     * Get a user based on the provided verification code.
     *
     * @param VerificationCode|null $verificationCode the verification code
     *
     * @return User|null the user, or null if not found
     */
    private static function getUserFromVerificationCode(?VerificationCode $verificationCode = null): ?User
    {
        if ($verificationCode instanceof VerificationCode) {
            $subject = $verificationCode->subject;

            if ($subject instanceof User) {
                return $subject;
            }
        }

        return null;
    }

    /**
     * Decode a client session token.
     *
     * @param string $clientToken the client session token
     *
     * @return array the decoded client session token parts
     */
    private static function decodeClientToken(string $clientToken): array
    {
        $clientTokenDecoded = base64_decode($clientToken);
        $clientTokenParts   = explode('|', $clientTokenDecoded);

        return $clientTokenParts;
    }

    /**
     * Get a verification code based on the provided client session token.
     *
     * @param string $clientToken the client session token
     *
     * @return VerificationCode|null the verification code, or null if not found
     */
    private static function getVerificationCodeFromClientToken(string $clientToken): ?VerificationCode
    {
        $clientTokenParts   = static::decodeClientToken($clientToken);
        $verificationCodeId = $clientTokenParts[1];

        if ($verificationCodeId) {
            $verificationCode = VerificationCode::where('uuid', $verificationCodeId)->first();

            if ($verificationCode) {
                return $verificationCode;
            }
        }

        return null;
    }

    /**
     * Encrypts the session key using AES-256-CBC encryption with an initialization vector (IV).
     *
     * @param mixed  $data the data to be encrypted
     * @param string $key  the encryption key
     *
     * @return string the base64-encoded result of encrypting the data
     */
    private static function encryptSessionKey($data, string $key): ?string
    {
        // Encrypt the data
        $ivLength  = openssl_cipher_iv_length('aes-256-cbc');
        if ($ivLength === false) {
            return null;
        }
        $iv        = openssl_random_pseudo_bytes($ivLength);
        if ($iv === false) {
            return null;
        }
        $encrypted = openssl_encrypt(gzcompress($data), 'aes-256-cbc', $key, 0, $iv);
        if ($encrypted === false) {
            return null;
        }

        // Combine IV and encrypted data
        $result = $iv . $encrypted;

        return base64_encode($result);
    }

    /**
     * Decrypts the encrypted session key using AES-256-CBC decryption with an initialization vector (IV).
     *
     * @param string $encrypted the base64-encoded encrypted data
     * @param string $key       the decryption key
     *
     * @return mixed the decrypted and decompressed original data
     */
    private static function decryptSessionKey(string $encrypted, string $key): ?string
    {
        // Decode from base64
        $data = base64_decode($encrypted);

        // Extract IV and encrypted data
        $ivLength      = openssl_cipher_iv_length('aes-256-cbc');
        $iv            = substr($data, 0, $ivLength);
        $encryptedData = substr($data, $ivLength);

        // Decrypt and decompress
        $decrypted = openssl_decrypt($encryptedData, 'aes-256-cbc', $key, 0, $iv);
        if ($decrypted === false) {
            return null;
        }

        $decompressed = gzuncompress($decrypted);
        if ($decompressed === false) {
            return null;
        }

        return $decompressed;
    }
}
