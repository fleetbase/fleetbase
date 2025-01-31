import isNumeric from './is-numeric';
import isLetter from './is-letter';

const _range = (start, end) => {
    return [...Array(end - start + 1).keys()].map((i) => i + start);
};

export { _range };
export default function range(start, end) {
    if (isNumeric(start) && isNumeric(end)) {
        return _range(start, end);
    }

    if (isLetter(start) && isLetter(end)) {
        return [...String.fromCharCode(..._range(start.charCodeAt(0), end.charCodeAt(0)))];
    }

    return _range(start, end);
}
