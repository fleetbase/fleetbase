export default function arrayRange(size, startAt = 0) {
    return [...Array(size + 1).keys()].map((i) => i + startAt);
}
