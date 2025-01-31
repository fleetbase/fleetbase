import Base from 'ember-simple-auth/authenticators/base';
import { inject as service } from '@ember/service';
import getWithDefault from '../utils/get-with-default';

export class AuthenticationError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
    }

    getCode() {
        return this.code;
    }
}

export default class FleetbaseAuthenticator extends Base {
    /**
     * Inject the `fetch` service
     *
     * @var {Service}
     */
    @service fetch;

    /**
     * Inject the `session` service
     *
     * @var {Service}
     */
    @service session;

    /**
     * Restore session from server
     *
     * @param {object} data
     * @return {Promise}
     */
    restore(data) {
        return this.fetch
            .get(
                'auth/session',
                {},
                {
                    headers: {
                        Authorization: `Bearer ${data.token}`,
                    },
                }
            )
            .then((response) => {
                if (response.restore === false) {
                    return Promise.reject(new AuthenticationError(response.error));
                }

                return response;
            });
    }

    /**
     * Authenticates a users credentials
     *
     * @param {object} credentials
     * @param {boolean} remember
     * @param {string} path
     */
    authenticate(credentials = {}, remember = false, path = 'auth/login') {
        return this.fetch.post(path, { ...credentials, remember }).then((response) => {
            if (response.errors) {
                const errorMessage = getWithDefault(response.errors, '0', 'Authentication failed!');
                const errorCode = getWithDefault(response, 'code');

                return Promise.reject(new AuthenticationError(errorMessage, errorCode));
            }

            return response;
        });
    }

    /**
     * Invalidates the current session
     *
     * @param {object} data
     */
    // eslint-disable-next-line no-unused-vars
    invalidate(data) {
        return this.fetch.post('auth/logout');
    }
}
