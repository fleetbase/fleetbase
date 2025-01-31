export default function numbersOnly(string, keepDecimals = false) {
    if (typeof string !== 'string') {
        return string;
    }

    if (keepDecimals === true) {
        return string.replace(/[^0-9.]+/g, '');
    }

    return string.replace(/\D+/g, '');
}
