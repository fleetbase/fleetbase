export default function toLeafletBounds(a, b) {
    if (!a || a instanceof L.Bounds) {
        return a;
    }
    return new L.Bounds(a, b);
}
