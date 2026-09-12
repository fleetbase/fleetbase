/**
 * OAuth provider service — issue #453.
 *
 * Lazily loads each provider's client SDK (Google Identity Services,
 * Facebook JS SDK, MSAL.js for Microsoft, Sign in with Apple JS) and
 * resolves a provider-specific credential the backend can verify.
 *
 * The backend (core-api AuthController) is the source of truth for
 * identity — these methods do nothing but obtain the provider-issued
 * token client-side; verification + user creation happen server-side.
 *
 * Configured via `config/environment.js` -> `ENV.oauth.<provider>`. A
 * provider whose config block is empty returns `isConfigured(provider)
 * === false` and the login template hides the corresponding button.
 */
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import ENV from '@fleetbase/console/config/environment';

const SDK_URLS = {
    google:    'https://accounts.google.com/gsi/client',
    facebook:  () => `https://connect.facebook.net/en_US/sdk.js`,
    microsoft: 'https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js',
    apple:     'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js',
};

export default class OauthService extends Service {
    @tracked loading = {};

    /**
     * Returns true when the provider has a non-empty clientId/appId.
     */
    isConfigured(provider) {
        const cfg = (ENV.oauth || {})[provider] || {};
        switch (provider) {
            case 'google':
            case 'microsoft':
            case 'apple':
                return Boolean(cfg.clientId);
            case 'facebook':
                return Boolean(cfg.appId);
            default:
                return false;
        }
    }

    /**
     * Lazy SDK loader. Idempotent — once a script has loaded, every
     * subsequent call resolves immediately.
     */
    async loadSdk(provider) {
        const url = typeof SDK_URLS[provider] === 'function' ? SDK_URLS[provider]() : SDK_URLS[provider];
        if (!url) {
            throw new Error(`Unknown OAuth provider: ${provider}`);
        }
        const existing = document.querySelector(`script[data-oauth-provider="${provider}"]`);
        if (existing && existing.dataset.loaded === 'true') {
            return;
        }
        await new Promise((resolve, reject) => {
            const script = existing || document.createElement('script');
            script.src = url;
            script.async = true;
            script.defer = true;
            script.dataset.oauthProvider = provider;
            script.onload = () => {
                script.dataset.loaded = 'true';
                resolve();
            };
            script.onerror = () => reject(new Error(`Failed to load ${provider} SDK`));
            if (!existing) {
                document.head.appendChild(script);
            }
        });
    }

    /**
     * Google Identity Services flow — uses the "One Tap" / button popup
     * to obtain an ID token, then resolves with the bearer payload.
     */
    async signInWithGoogle() {
        const { clientId } = ENV.oauth.google;
        if (!clientId) {
            throw new Error('Google OAuth not configured (set GOOGLE_OAUTH_CLIENT_ID)');
        }
        await this.loadSdk('google');
        return new Promise((resolve, reject) => {
            try {
                window.google.accounts.id.initialize({
                    client_id: clientId,
                    callback: (response) => {
                        if (response && response.credential) {
                            resolve({ idToken: response.credential, clientId });
                        } else {
                            reject(new Error('Google Sign-In returned no credential'));
                        }
                    },
                });
                // Show the consent prompt. If it's suppressed (e.g. user has
                // exhausted skip cooldown), surface a clear error so the UI
                // can advise the user to use email/password.
                window.google.accounts.id.prompt((notification) => {
                    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                        reject(new Error('Google Sign-In prompt unavailable — please use email login'));
                    }
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * Facebook JS SDK flow — explicit login popup. Returns the short-
     * lived access token which the server verifies against the Graph API.
     */
    async signInWithFacebook() {
        const { appId, sdkVersion } = ENV.oauth.facebook;
        if (!appId) {
            throw new Error('Facebook OAuth not configured (set FACEBOOK_OAUTH_APP_ID)');
        }
        await this.loadSdk('facebook');
        await new Promise((resolve) => {
            // FB.init is idempotent — calling again replaces config.
            window.FB.init({ appId, version: sdkVersion || 'v18.0', cookie: false, xfbml: false });
            resolve();
        });
        return new Promise((resolve, reject) => {
            window.FB.login(
                (response) => {
                    const authResponse = response && response.authResponse;
                    if (authResponse && authResponse.accessToken) {
                        resolve({ accessToken: authResponse.accessToken, appId });
                    } else {
                        reject(new Error('Facebook Sign-In cancelled or denied'));
                    }
                },
                { scope: 'email,public_profile' }
            );
        });
    }

    /**
     * Microsoft / Office365 MSAL.js popup flow — requests an ID token
     * for the configured tenant + client_id and resolves with it.
     */
    async signInWithOffice365() {
        const { clientId, tenant } = ENV.oauth.microsoft;
        if (!clientId) {
            throw new Error('Microsoft OAuth not configured (set MICROSOFT_OAUTH_CLIENT_ID)');
        }
        await this.loadSdk('microsoft');
        const msal = new window.msal.PublicClientApplication({
            auth: {
                clientId,
                authority: `https://login.microsoftonline.com/${tenant || 'common'}`,
                redirectUri: window.location.origin,
            },
            cache: { cacheLocation: 'sessionStorage' },
        });
        const result = await msal.loginPopup({
            scopes: ['openid', 'profile', 'email'],
        });
        if (!result || !result.idToken) {
            throw new Error('Office365 Sign-In returned no ID token');
        }
        return { idToken: result.idToken };
    }

    /**
     * Sign in with Apple JS — popup flow that returns an identity JWT
     * plus (on first login only) the user's email and name.
     */
    async signInWithApple() {
        const { clientId, redirectUri } = ENV.oauth.apple;
        if (!clientId) {
            throw new Error('Apple OAuth not configured (set APPLE_OAUTH_CLIENT_ID)');
        }
        await this.loadSdk('apple');
        window.AppleID.auth.init({
            clientId,
            scope: 'name email',
            redirectURI: redirectUri || window.location.origin,
            usePopup: true,
        });
        const data = await window.AppleID.auth.signIn();
        if (!data || !data.authorization || !data.authorization.id_token) {
            throw new Error('Apple Sign-In returned no identity token');
        }
        // Apple's `sub` (the immutable per-app user id) is embedded in
        // the JWT but also surfaced in `data.user` on first login only.
        // The server's AppleVerifier extracts it from the token claims;
        // we pass the user-supplied name/email through so a fresh
        // account can be created with display name + email populated.
        const idPayload = parseJwtPayload(data.authorization.id_token);
        return {
            identityToken: data.authorization.id_token,
            appleUserId:   idPayload && idPayload.sub ? String(idPayload.sub) : null,
            email:         data.user && data.user.email ? data.user.email : (idPayload && idPayload.email) || null,
            name:          data.user && data.user.name
                ? `${data.user.name.firstName || ''} ${data.user.name.lastName || ''}`.trim() || null
                : null,
        };
    }
}

function parseJwtPayload(jwt) {
    try {
        const [, payload] = jwt.split('.');
        if (!payload) return null;
        const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
        const decoded = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
    } catch (e) {
        return null;
    }
}
