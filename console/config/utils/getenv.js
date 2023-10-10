module.exports = function getenv(variable, defaultValue = null) {
    return process.env[variable] !== undefined ? process.env[variable] : defaultValue;
};
