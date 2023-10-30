import { camelize } from '@ember/string';

export default function createNotificationKey(definition, name) {
    const withoutSlashes = definition.replace(/[\W_]+/g, '');
    const key = `${camelize(withoutSlashes)}__${camelize(name)}`;

    return key;
}
