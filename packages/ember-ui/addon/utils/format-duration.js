export const secondsToTime = (secs) => {
    const hours = Math.floor(secs / (60 * 60));
    const divisor_for_minutes = secs % (60 * 60);
    const minutes = Math.floor(divisor_for_minutes / 60);
    const divisor_for_seconds = divisor_for_minutes % 60;
    const seconds = Math.ceil(divisor_for_seconds);

    const obj = {
        h: hours,
        m: minutes,
        s: seconds,
    };

    return obj;
};

export default function formatDuration(secs) {
    let time = secondsToTime(secs);
    let parts = [];

    if (time.h) {
        parts.push(`${time.h}h`);
    }

    if (time.m) {
        parts.push(`${time.m}m`);
    }

    if (parts.length < 2 && time.s) {
        parts.push(`${time.s}s`);
    }

    if (parts.length === 0) {
        parts.push('0s');
    }

    return parts.join(' ');
}
