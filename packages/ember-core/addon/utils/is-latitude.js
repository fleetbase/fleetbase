export default function isLatitude(coordinate) {
    return isFinite(coordinate) && Math.abs(coordinate) <= 90;
}
