import { isArray } from '@ember/array';

export default function first(arr, n = 1) {
    if (!isArray(arr) || arr.length === 0 || n <= 0) {
        return null;
    }

    n = Math.min(n, arr.length);
    return n > 1 ? arr.slice(0, n) : arr[0];
}
