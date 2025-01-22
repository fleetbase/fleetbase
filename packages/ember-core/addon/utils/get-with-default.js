import { get } from '@ember/object';

export default function getWithDefault(obj, key, defaultValue) {
    let value = get(obj, key);
    return value === undefined ? defaultValue : value;
}
