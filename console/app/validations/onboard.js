/** @validations onboard */
import { validatePresence, validateLength, validateConfirmation, validateFormat } from 'ember-changeset-validations/validators';

export default function onboardValidations(intl) {
    return {
    name: [validatePresence(true)],
    email: [validatePresence(true), validateFormat({ type: 'email' })],
    organization_name: [validatePresence(true)],
    phone: [
        validatePresence({ presence: true, message: intl.t('onboard.index.phone-required') }),
        validateLength({
            min: 7,
            message: intl.t('onboard.index.phone-min-validation'),
        }),
        validateLength({
            max: 15,
            message: intl.t('onboard.index.phone-max-validation'),
        }),
    ],
    password: [validatePresence(true), validateLength({ min: 8 })],
    password_confirmation: [validatePresence(true), validateConfirmation({ on: 'password' })],
    };
}
