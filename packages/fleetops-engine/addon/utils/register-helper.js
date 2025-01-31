import { dasherize } from '@ember/string';

/* eslint-disable no-unused-vars */
export default function registerHelper(owner, helperFn, name, options = {}) {
    const registrationName = `helper:${dasherize(name)}`;
    if (!owner.hasRegistration(registrationName)) {
        owner.register(registrationName, helperFn);
    }
}
