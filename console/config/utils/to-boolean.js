module.exports = function toBoolean(value) {
    switch (value) {
        case 'true':
        case '1':
        case 1:
        case true:
            return true;
        case 'false':
        case '0':
        case 0:
        case false:
        case null:
        case undefined:
        case '':
            return false;
        default:
            return false;
    }
};
