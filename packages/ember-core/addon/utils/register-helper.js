import { dasherize } from '@ember/string';

export default function registerHelper(owner, name, helperFn) {
    const registrationName = `helper:${dasherize(name)}`;
    if (!owner.hasRegistration(registrationName)) {
        owner.register(registrationName, helperFn);
    }
}
