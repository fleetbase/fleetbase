module.exports = function asArray(value) {
    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value === 'string') {
        return value.split(',');
    }

    return [];
};
