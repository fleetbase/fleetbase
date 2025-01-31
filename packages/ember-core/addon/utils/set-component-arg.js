import { set } from '@ember/object';

export default function setComponentArg(component, property, value) {
    if (value !== undefined) {
        set(component, property, value);
    }

    return component;
}
