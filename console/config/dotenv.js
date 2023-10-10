/* eslint-env node */

'use strict';

module.exports = function (env) {
    return {
        clientAllowedKeys: ['API_HOST'],
        fastbootAllowedKeys: [],
        failOnMissingKey: false,
        path: `./environments/.env.${env}`,
    };
};
