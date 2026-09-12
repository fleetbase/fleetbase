// screenshots/src/auth.mjs
//
// Obtain a genuine session token out of band, so the capture run never drives the login
// form. The form path would drag in the onboarding redirects (/login bounces to /install
// or /onboard depending on GET onboard/should-onboard) and the two-factor screen, neither
// of which has anything to do with the screenshots we want.

/**
 * Log in against the internal API and return a Sanctum token.
 *
 * The token has to be real: authenticator:fleetbase.restore() re-validates it with
 * GET auth/session on every single boot, and an invented one lands the browser on /login.
 */
export async function login({ apiHost, namespace = 'int/v1', identity, password }) {
    const url = `${apiHost}/${namespace}/auth/login`;
    let response;

    try {
        response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ identity, password, remember: false }),
        });
    } catch (error) {
        throw new Error(`could not reach ${url}: ${error.message}. Is the stack booted?`);
    }

    const body = await response.json().catch(() => ({}));

    // A 2FA-enabled account answers 200 with a twoFaSession instead of a token. There is no
    // way for an unattended run to complete that challenge, so say so plainly rather than
    // failing later with "no token".
    if (body?.twoFaSession || body?.isEnabled) {
        throw new Error(
            `${identity} has two-factor authentication enabled; the screenshot demo account must not. ` +
                'Disable it under Settings -> Two-Factor, or use a different account.'
        );
    }

    if (!response.ok) {
        const code = body?.code || body?.error || `HTTP ${response.status}`;
        throw new Error(`login failed for ${identity}: ${code}`);
    }

    if (!body?.token) {
        throw new Error(`login for ${identity} returned no token: ${JSON.stringify(body)}`);
    }

    return { token: body.token, type: body.type ?? 'user' };
}

/**
 * Confirm the install is past onboarding before any navigation is attempted.
 *
 * routes/auth/login.js calls installation.checkOnboarding() in beforeModel and redirects to
 * /install or /onboard when the install is not configured. If that happens mid-run, every
 * entry captures the same onboarding screen and the run "succeeds" with a directory of
 * identical images — so check once, up front, and fail with the real reason.
 */
export async function assertOnboarded({ apiHost, namespace = 'int/v1' }) {
    const url = `${apiHost}/${namespace}/onboard/should-onboard`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });

    if (!response.ok) {
        throw new Error(`could not read ${url}: HTTP ${response.status}`);
    }

    const body = await response.json().catch(() => ({}));
    const shouldOnboard = body?.shouldOnboard ?? body?.should_onboard ?? false;

    if (shouldOnboard) {
        throw new Error(
            'the install still reports shouldOnboard=true, so every route will redirect to /onboard. ' +
                'Run scripts/ci/seed-demo-org.php against the stack first.'
        );
    }
}
