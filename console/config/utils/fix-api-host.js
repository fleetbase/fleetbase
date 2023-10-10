const toBoolean = require('./to-boolean');

// This function is a temp hotfix to patch api host
module.exports = function fixApiHost(apiHost, secure = false) {
    secure = toBoolean(secure);

    if (typeof apiHost === 'string' && apiHost.length > 4 && !apiHost.startsWith('http')) {
        if (secure === true) {
            apiHost = `https://${apiHost}`;
        } else {
            apiHost = `http://${apiHost}`;
        }
    }

    return apiHost;
};
