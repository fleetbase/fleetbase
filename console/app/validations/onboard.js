/** @validations onboard */
import { validatePresence, validateLength, validateConfirmation, validateFormat } from 'ember-changeset-validations/validators';

const base = {
    name: [validatePresence(true)],
    email: [validatePresence(true), validateFormat({ type: 'email' })],
    organization_name: [validatePresence(true)],
};

export const passwordValidations = {
    password: [validatePresence(true), validateLength({ min: 8 })],
    password_confirmation: [validatePresence(true), validateConfirmation({ on: 'password' })],
};

/**
 * A signup proves itself with either a password or an OAuth registration intent, so
 * the password rules are only applied when there is no intent. Everything else —
 * name, email, organization — is required either way, which is what keeps an OAuth
 * account held to the same standard as a password one.
 */
export function onboardValidationsFor({ hasOauthIntent = false } = {}) {
    return hasOauthIntent ? { ...base } : { ...base, ...passwordValidations };
}

export default { ...base, ...passwordValidations };
