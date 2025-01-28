import { dasherize } from '@ember/string';

export default function registerComponent(owner, componentClass, options = {}) {
    const registrationName = options && options.as ? `component:${options.as}` : `component:${dasherize(componentClass.name).replace('-component', '')}`;
    if (!owner.hasRegistration(registrationName)) {
        owner.register(registrationName, componentClass);
    }
}
