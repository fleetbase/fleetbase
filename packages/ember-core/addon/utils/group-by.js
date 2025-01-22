import { get } from '@ember/object';

export default function groupBy(arr, key) {
    let grouped = {};
    let _key;

    for (let i = 0; i < arr.length; i++) {
        const item = arr.objectAt(i);

        if (typeof key === 'string') {
            _key = get(item, key);
        }

        if (typeof key === 'function') {
            _key = key(item, i);
        }

        if (!grouped[_key]) {
            grouped[_key] = [];
        }

        grouped[_key].pushObject(item);
    }

    return grouped;
}
