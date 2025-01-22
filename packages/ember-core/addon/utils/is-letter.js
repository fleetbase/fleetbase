export default function isLetter(l) {
    return l.length === 1 && l.match(/[a-z]/i);
}
