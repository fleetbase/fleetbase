<?php

namespace Fleetbase\Http\Controllers\Internal\v1;

use Fleetbase\Http\Controllers\Controller;
use Fleetbase\Http\Requests\TwoFaValidationRequest;
use Fleetbase\Support\TwoFactorAuth;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Class TwoFaController.
 */
class TwoFaController extends Controller
{
    /**
     * Save Two-Factor Authentication system wide settings.
     *
     * @return \Illuminate\Http\Response
     */
    public function saveSystemConfig(Request $request)
    {
        $twoFaSettings = $request->array('twoFaSettings');
        if (isset($twoFaSettings['enabled']) && $twoFaSettings['enabled'] === false) {
            $twoFaSettings['enforced'] = false;
        }
        $settings      = TwoFactorAuth::configureTwoFaSettings($twoFaSettings);

        return response()->json($settings->value);
    }

    /**
     * Get Two-Factor Authentication system wide settings.
     *
     * @return \Illuminate\Http\Response
     */
    public function getSystemConfig()
    {
        $settings = TwoFactorAuth::getTwoFaConfiguration();

        return response()->json($settings->value);
    }

    /**
     * Check Two-Factor Authentication status for a given user identity.
     *
     * @return \Illuminate\Http\Response
     */
    public function checkTwoFactor(Request $request)
    {
        $identity       = $request->input('identity');
        $twoFaSession   = TwoFactorAuth::createTwoFaSessionIfEnabled($identity);
        $isTwoFaEnabled = $twoFaSession !== null;

        return response()->json([
            'twoFaSession'   => $twoFaSession,
            'isTwoFaEnabled' => $isTwoFaEnabled,
        ]);
    }

    /**
     * Verify Two-Factor Authentication code.
     *
     * @return \Illuminate\Http\Response
     */
    public function validateSession(TwoFaValidationRequest $request)
    {
        $token       = $request->input('token');
        $identity    = $request->input('identity');
        $clientToken = $request->input('clientToken');

        try {
            $validClientToken = TwoFactorAuth::getClientSessionTokenFromTwoFaSession($token, $identity, $clientToken);

            return response()->json([
                'clientToken' => $validClientToken,
                'expired'     => false,
            ]);
        } catch (\Exception $e) {
            $errorMessage = $e->getMessage();

            if (Str::contains($errorMessage, ['2FA Verification', 'expired'])) {
                return response()->json([
                    'expired' => true,
                ]);
            }

            return response()->error($errorMessage);
        }
    }

    /**
     * Verify Two-Factor Authentication code.
     *
     * @return \Illuminate\Http\Response
     */
    public function verifyCode(Request $request)
    {
        $code        = $request->input('code');
        $token       = $request->input('token');
        $clientToken = $request->input('clientToken');

        try {
            $authToken = TwoFactorAuth::verifyCode($code, $token, $clientToken);

            return response()->json([
                'authToken' => $authToken,
            ]);
        } catch (\Exception $e) {
            return response()->error($e->getMessage());
        }
    }

    /**
     * Resend Two-Factor Authentication verification code.
     *
     * @return \Illuminate\Http\Response
     */
    public function resendCode(Request $request)
    {
        $identity = $request->input('identity');
        $token    = $request->input('token');

        try {
            $clientToken = TwoFactorAuth::resendCode($identity, $token);

            return response()->json([
                'clientToken' => $clientToken,
            ]);
        } catch (\Exception $e) {
            return response()->error($e->getMessage());
        }
    }

    /**
     * Invalidate the current two-factor session.
     *
     * @return \Illuminate\Http\Response
     */
    public function invalidateSession(Request $request)
    {
        $identity = $request->input('identity');
        $token    = $request->input('token');

        try {
            $ok = TwoFactorAuth::forgetTwoFaSession($token, $identity);

            return response()->json([
                'ok' => $ok,
            ]);
        } catch (\Exception $e) {
            return response()->json(['ok' => false]);
        }
    }

    public function shouldEnforce(Request $request)
    {
        $user         = $request->user();
        $enforceTwoFa = TwoFactorAuth::shouldEnforce($user);

        return response()->json([
            'shouldEnforce' => $enforceTwoFa,
        ]);
    }
}
