/**
 * The 2FA methods a user can pick.
 *
 * The authenticator app is only offered where a user sets up their own 2FA: it needs a
 * per-user setup, so it cannot be an organization or system default.
 *
 * @param {Object} [options]
 * @param {boolean} [options.includeAuthenticatorApp=false]
 * @return {Array}
 */
export default function getTwoFaMethods({ includeAuthenticatorApp = false } = {}) {
    const methods = [
        { key: 'sms', name: 'SMS', description: 'Receive a unique code via SMS' },
        { key: 'email', name: 'Email', description: 'Receive a unique code via Email' },
    ];

    if (includeAuthenticatorApp) {
        methods.unshift({
            key: 'authenticator_app',
            name: 'Authenticator App',
            description: 'Get codes from an app like Authy, 1Password, Microsoft Authenticator, or Google Authenticator',
            recommended: true,
        });
    }

    return methods;
}
