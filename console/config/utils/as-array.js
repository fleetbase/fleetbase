module.exports = function asArray(value) {
    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value === 'string') {
        return value.split(',');
    }

    try {
        let iterable = Array.from(value);
        if (Array.isArray(iterable)) {
            return iterable;
        }
    } catch (error) {
        return [];
    }

    return [];
};
