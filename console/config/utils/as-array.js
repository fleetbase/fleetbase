module.exports = function asArray(value) {
    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value === 'string' && value.includes(',')) {
        return value.split(',');
    }

    return [];
};
