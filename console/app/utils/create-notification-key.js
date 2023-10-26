import { camelize } from '@ember/string';

export default function createNotificationKey(definition) {
    const withoutSlashes = definition.replace(/[\W_]+/g, '');
    return camelize(withoutSlashes);
}
