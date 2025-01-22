export default function isLongitude(coordinate) {
    return isFinite(coordinate) && Math.abs(coordinate) <= 180;
}
