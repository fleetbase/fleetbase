/** @validations onboard */
import { validatePresence, validateLength, validateConfirmation, validateFormat } from 'ember-changeset-validations/validators';

export default {
    name: [validatePresence(true)],
    email: [validatePresence(true), validateFormat({ type: 'email' })],
    organization_name: [validatePresence(true)],
    password: [validatePresence(true), validateLength({ min: 8 })],
    password_confirmation: [validatePresence(true), validateConfirmation({ on: 'password' })],
};
