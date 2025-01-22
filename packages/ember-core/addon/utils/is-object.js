export default function isObject(obj) {
    return obj && typeof obj === 'object' && Object.prototype.toString.call(obj) === '[object Object]';
}
