/** @validations onboard */
import { validatePresence, validateLength, validateConfirmation, validateFormat } from 'ember-changeset-validations/validators';

export default {
    name: [validatePresence(true)],
    email: [validatePresence(true), validateFormat({ type: 'email' })],
    organization_name: [validatePresence(true)],
    phone: [
        validatePresence({ presence: true, message: 'Phone number is required' }),
        validateLength({
            min: 7,
            message: 'Phone number is too short (minimum is 7 digits)'
        }),
        validateLength({
            max: 15,
            message: 'Phone number is too long (maximum is 15 digits)'
        }),
    ],
    password: [validatePresence(true), validateLength({ min: 8 })],
    password_confirmation: [validatePresence(true), validateConfirmation({ on: 'password' })],
};
