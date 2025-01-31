import { isArray } from '@ember/array';

const isNumber = (value) => typeof value === 'number' && isFinite(value);

export default function last(arr, n = 1) {
    if (!isArray(arr) || arr.length === 0) {
        return null;
    }

    n = isNumber(n) ? +n : 1;

    if (n === 1) {
        return arr[arr.length - 1];
    }

    let res = new Array(n);
    let len = arr.length;

    while (n--) {
        res[n] = arr[--len];
    }

    return res;
}
