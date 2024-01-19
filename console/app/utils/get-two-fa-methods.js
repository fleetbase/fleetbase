export default function getTwoFaMethods() {
    return [
        // {
        //     key: 'authenticator_app',
        //     name: 'Authenticator App',
        //     description: 'Get codes from an app like Authy, 1Password, Microsoft Authenticator, or Google Authenticator',
        //     recommended: true,
        // },
        { key: 'sms', name: 'SMS', description: 'Receive a unique code via SMS' },
        { key: 'email', name: 'Email', description: 'Receive a unique code via Email' },
    ];
}
