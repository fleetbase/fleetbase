import RESTAdapter from '@ember-data/adapter/rest';
import AdapterError from '@ember-data/adapter/error';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { storageFor } from 'ember-local-storage';
import { get } from '@ember/object';
import { isBlank } from '@ember/utils';
import { isArray } from '@ember/array';
import { dasherize } from '@ember/string';
import { pluralize } from 'ember-inflector';
import { decompress as decompressJson } from 'compress-json';
import getUserOptions from '../utils/get-user-options';
import config from 'ember-get-config';

if (isBlank(config.API.host)) {
    config.API.host = `${window.location.protocol}//${window.location.hostname}:8000`;
}
const DEFAULT_ERROR_MESSAGE = 'Oops! Something went wrong. Please try again or contact support if the issue persists.';
export default class ApplicationAdapter extends RESTAdapter {
    /**
     * Inject the `session` service
     *
     * @var {Service}
     */
    @service session;

    /**
     * Inject the `currentUser` service
     *
     * @var {Service}
     */
    @service currentUser;

    /**
     * User options for setting specific headers
     *
     * @var StorageObject
     */
    @storageFor('user-options') userOptions;

    /**
     * The default namespace for the adapter
     *
     * @var {String}
     */
    @tracked host;

    /**
     * The default namespace for adapter
     *
     * @var {String}
     */
    @tracked namespace;

    /**
     * Credentials
     *
     * @var {String}
     */
    @tracked credentials = 'include';

    /**
     * Mutable headers property.
     *
     * @var {Array}
     */
    @tracked _headers;

    /**
     * Creates an instance of ApplicationAdapter.
     * @memberof ApplicationAdapter
     */
    constructor() {
        super(...arguments);

        this.host = get(config, 'API.host');
        this.namespace = get(config, 'API.namespace');
        this.headers = this.setupHeaders();
    }

    /**
     * Setup headers that should be sent with request.
     *
     * @return {Object}
     */
    setupHeaders() {
        const headers = {};
        const userId = this.session.data.authenticated.user;
        const userOptions = getUserOptions();
        const isSandbox = get(userOptions, `${userId}:sandbox`) === true;
        const testKey = get(userOptions, `${userId}:testKey`);
        let isAuthenticated = this.session.isAuthenticated;
        let { token } = this.session.data.authenticated;

        // If the session data is not yet available, check localStorage
        if (!isAuthenticated) {
            const localStorageSession = JSON.parse(window.localStorage.getItem('ember_simple_auth-session'));
            if (localStorageSession) {
                const { authenticated } = localStorageSession;
                if (authenticated) {
                    token = authenticated.token;
                }

                // Check isAuthenticated again
                isAuthenticated = !!token;
            }
        }

        headers['Content-Type'] = 'application/json';

        if (isAuthenticated) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        if (isAuthenticated && isSandbox) {
            headers['Access-Console-Sandbox'] = true;
        }

        if (isAuthenticated && !isBlank(testKey)) {
            headers['Access-Console-Sandbox-Key'] = testKey;
        }

        this.headers = headers;
        return this.headers;
    }

    /**
     * Configure AJAX options for request, return as options hash
     *
     * @param {String} url
     * @param {String} type The request type GET, POST, PUT, DELETE etc.
     * @param {Object} options
     *
     * @return {Object}
     */
    ajaxOptions(url, type, options) {
        this.setupHeaders();

        const ajaxOptions = super.ajaxOptions(url, type, options);
        ajaxOptions.credentials = this.credentials;

        return ajaxOptions;
    }

    /**
     * Dasherize the path for type
     *
     * @param {Object} type
     */
    pathForType(type) {
        return dasherize(pluralize(type));
    }

    /**
     * Handles the response from an AJAX request.
     * It decompresses the payload if needed, checks for error responses, and returns an AdapterError for error scenarios.
     * For valid responses, the handling is delegated to the superclass's handleResponse method.
     *
     * @param {number} status - HTTP status code of the response.
     * @param {object} headers - Response headers.
     * @param {object} payload - Response payload.
     * @param {object} requestData - Original request data.
     * @return {Object | AdapterError} - The response object or an AdapterError in case of errors.
     */
    handleResponse(status, headers, payload, requestData) {
        const decompressedPayload = this.decompressPayload(payload, headers);
        if (this.isErrorResponse(status, decompressedPayload)) {
            const errors = this.getResponseErrors(decompressedPayload);
            const errorMessage = this.getErrorMessage(errors);
            return new AdapterError(errors, errorMessage);
        }

        return super.handleResponse(status, headers, decompressedPayload, requestData);
    }

    /**
     * Decompresses the response payload if it's marked as compressed in the response headers.
     *
     * This method checks the response headers for a specific 'x-compressed-json' flag.
     * If this flag is set, indicating that the response payload is compressed, the method
     * decompresses the payload. The decompressed payload is then parsed as JSON and returned.
     * If the payload is not compressed, it is returned as is.
     *
     * @param {object} payload - The original payload of the response.
     * @param {object} headers - The headers of the response, used to check if the payload is compressed.
     * @return {object} The decompressed payload if it was compressed, or the original payload otherwise.
     */
    decompressPayload(payload, headers) {
        // Check if the response is compressed
        if (headers['x-compressed-json'] === '1' || headers['x-compressed-json'] === 1) {
            // Decompress the payload
            const decompressedPayload = decompressJson(payload);
            // Replace payload with decompressed json payload
            payload = JSON.parse(decompressedPayload);
        }

        return payload;
    }

    /**
     * Extracts the error message from a list of errors.
     * Returns a default error message if the provided list is empty or undefined.
     *
     * @param {Array} errors - Array of error messages or objects.
     * @return {string} - The extracted error message.
     */
    getErrorMessage(errors = []) {
        return errors[0] ? errors[0] : DEFAULT_ERROR_MESSAGE;
    }

    /**
     * Extracts errors from a payload.
     * Assumes the payload contains an `errors` array; returns a default error message otherwise.
     *
     * @param {object} payload - The response payload.
     * @return {Array} - Array of extracted errors or a default error message.
     */
    getResponseErrors(payload) {
        return isArray(payload.errors) ? payload.errors : [DEFAULT_ERROR_MESSAGE];
    }

    /**
     * Determines if the response status indicates an error.
     * Checks both the HTTP status code and the presence of errors in the payload.
     *
     * @param {number} status - The HTTP status code.
     * @param {object} payload - The response payload.
     * @return {boolean} - True if the response indicates an error, false otherwise.
     */
    isErrorResponse(status, payload) {
        return (status >= 400 && status < 600) || (!isBlank(payload) && isArray(payload.errors));
    }
}
