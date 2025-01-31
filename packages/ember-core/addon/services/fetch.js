import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { get, set } from '@ember/object';
import { isBlank } from '@ember/utils';
import { dasherize } from '@ember/string';
import { isArray } from '@ember/array';
import { singularize, pluralize } from 'ember-inflector';
import { task } from 'ember-concurrency';
import { storageFor } from 'ember-local-storage';
import { intervalToDuration, parseISO } from 'date-fns';
import { decompress as decompressJson } from 'compress-json';
import config from 'ember-get-config';
import corslite from '../utils/corslite';
import getMimeType from '../utils/get-mime-type';
import download from '../utils/download';
import getUserOptions from '../utils/get-user-options';
import isEmptyObject from '../utils/is-empty-object';
import fetch from 'fetch';

if (isBlank(config.API.host)) {
    config.API.host = `${window.location.protocol}//${window.location.hostname}:8000`;
}

export default class FetchService extends Service {
    /**
     * Creates an instance of FetchService.
     * @memberof FetchService
     */
    constructor() {
        super(...arguments);

        this.headers = this.getHeaders();
        this.host = get(config, 'API.host');
        this.namespace = get(config, 'API.namespace');
    }

    /**
     * Mutable headers property.
     *
     * @var {Array}
     */
    @tracked headers;

    /**
     * Mutable namespace property.
     *
     * @var {String}
     */
    @tracked namespace;

    /**
     * Mutable host property.
     *
     * @var {String}
     */
    @tracked host;

    /**
     * Gets headers that should be sent with request.
     *
     * @return {Object}
     */
    getHeaders() {
        const headers = {};
        const isAuthenticated = this.session.isAuthenticated;
        const userId = this.session.data.authenticated.user;
        const userOptions = getUserOptions();
        const isSandbox = get(userOptions, `${userId}:sandbox`) === true;
        const testKey = get(userOptions, `${userId}:testKey`);

        headers['Content-Type'] = 'application/json';

        if (isAuthenticated) {
            headers['Authorization'] = `Bearer ${this.session.data.authenticated.token}`;
        }

        if (isAuthenticated && isSandbox) {
            headers['Access-Console-Sandbox'] = true;
        }

        if (isAuthenticated && !isBlank(testKey)) {
            headers['Access-Console-Sandbox-Key'] = testKey;
        }

        return headers;
    }

    /**
     * Updates headers property before making request.
     *
     * @return {FetchService}
     * @memberof FetchService
     */
    refreshHeaders() {
        this.headers = this.getHeaders();

        return this;
    }

    /**
     * Allows namespace to be set before making fetch request.
     *
     * @param {String} namespace
     * @return {FetchService}
     * @memberof FetchService
     */
    setNamespace(namespace) {
        this.namespace = namespace;

        return this;
    }

    /**
     * Allows host to be set before making fetch request.
     *
     * @param {String} host
     * @return {FetchService}
     * @memberof FetchService
     */
    setHost(host) {
        this.host = host;

        return this;
    }

    /**
     * Credentials
     *
     * @var {String}
     */
    credentials = 'include';

    /**
     * Inject the `store` service
     *
     * @var {Service}
     */
    @service store;

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
     * Inject the `notifications` service
     *
     * @var {Service}
     */
    @service notifications;

    /**
     * Local cache for some static requests
     *
     * @var StorageObject
     */
    @storageFor('local-cache') localCache;

    /**
     * Normalizes a model response from fetch to a ember data model
     *
     * @param  {Object} payload   A response from a network request
     * @param  {String} modelType The type of model to be normalized too
     *
     * @return {Model}            An ember model
     */
    normalizeModel(payload, modelType = null) {
        if (modelType === null) {
            const modelTypeKeys = Object.keys(payload);
            modelType = modelTypeKeys.length ? modelTypeKeys.firstObject : false;
        }

        if (typeof modelType !== 'string') {
            return payload;
        }

        const type = dasherize(singularize(modelType));

        if (isArray(payload)) {
            return payload.map((instance) => this.store.push(this.store.normalize(type, instance)));
        }

        if (isArray(payload[modelType])) {
            return payload[modelType].map((instance) => this.store.push(this.store.normalize(type, instance)));
        }

        if (!isBlank(payload) && isBlank(payload[modelType])) {
            return this.jsonToModel(payload, type);
        }

        return this.store.push(this.store.normalize(type, payload[modelType]));
    }

    /**
     * Normalizes a model response from a JSON object or string
     *
     * @param  {Object} payload   A response from a network request
     * @param  {String} modelType The type of model to be normalized too
     *
     * @return {Model}            An ember model
     */
    jsonToModel(attributes = {}, modelType) {
        if (typeof attributes === 'string') {
            attributes = JSON.parse(attributes);
        }

        const type = dasherize(modelType);
        const normalized = this.store.push(this.store.normalize(type, attributes));

        return normalized;
    }

    /**
     * Parses the JSON returned by a network request
     *
     * @param  {Object} response A response from a network request
     * @return {Object}          The parsed JSON, status from the response
     *
     * @return {Promise}
     */
    async parseJSON(response) {
        try {
            const compressedHeader = await response.headers.get('x-compressed-json');
            let json;

            if (compressedHeader === '1') {
                // Handle compressed json
                const text = await response.text();
                json = JSON.parse(text);
                json = decompressJson(json);
                json = JSON.parse(json);
            } else {
                // Handle regular json
                json = await response.json();
            }

            return {
                statusText: response.statusText,
                status: response.status,
                ok: response.ok,
                json,
            };
        } catch (error) {
            throw new Error('Error processing response: ' + error.message);
        }
    }

    /**
     * The base request method
     *
     * @param {String} path
     * @param {String} method
     * @param {Object} data
     * @param {Object} options
     *
     * @return {Promise}
     */
    request(path, method = 'GET', data = {}, options = {}) {
        const headers = Object.assign(this.getHeaders(), options.headers ?? {});
        const host = options.host ?? this.host;
        const namespace = options.namespace ?? this.namespace;
        const url = options.externalRequest === true ? path : [host, namespace, path].filter(Boolean).join('/');

        return new Promise((resolve, reject) => {
            return fetch(url, {
                method,
                mode: options.mode || 'cors',
                credentials: options.credentials || this.credentials,
                headers,
                ...data,
            })
                .then(this.parseJSON)
                .then((response) => {
                    if (response.ok) {
                        if (options.normalizeToEmberData) {
                            const normalized = this.normalizeModel(response.json, options.normalizeModelType);

                            if (typeof options.onSuccess === 'function') {
                                options.onSuccess(normalized);
                            }

                            return resolve(normalized);
                        }

                        if (typeof options.onSuccess === 'function') {
                            options.onSuccess(response.json);
                        }

                        return resolve(response.json);
                    }

                    if (typeof options.onError === 'function') {
                        options.onError(response.json);
                    }

                    if (options.rawError) {
                        return reject(response.json);
                    }

                    if (isArray(response.json.errors)) {
                        return reject(new Error(response.json.errors ? response.json.errors.firstObject : response.statusText));
                    }

                    if (response.json.error && typeof response.json.error) {
                        return reject(new Error(response.json.error));
                    }

                    if (response.json.message && typeof response.json.message) {
                        return reject(new Error(response.json.message));
                    }

                    return reject(response.json);
                })
                .catch(reject);
        });
    }

    /**
     * Makes a GET request with fetch
     *
     * @param {String} path
     * @param {Object} query
     * @param {Object} options
     *
     * @return {Promise}
     */
    get(path, query = {}, options = {}) {
        // handle if want to request from cache
        if (options.fromCache === true) {
            return this.cachedGet(...arguments);
        }

        const urlParams = !isEmptyObject(query) ? new URLSearchParams(query).toString() : '';

        return this.request(`${path}${urlParams ? '?' + urlParams : ''}`, 'GET', {}, options);
    }

    /**
     * Makes a GET request with fetch, but if the fetch is stored in local cache,
     * retrieve from storage to prevent unnecessary netwrok request
     *
     * @param {String} path
     * @param {Object} query
     * @param {Object} options
     *
     * @return {Promise}
     */
    cachedGet(path, query = {}, options = {}) {
        const pathKey = dasherize(path);
        const pathKeyVersion = new Date().toISOString();

        const request = () => {
            delete options.fromCache;
            return this.get(path, query, options).then((response) => {
                // cache the response
                this.localCache.set(pathKey, response);
                this.localCache.set(`${pathKey}-version`, pathKeyVersion);

                // return response
                return response;
            });
        };

        // check to see if in storage already
        if (this.localCache.get(pathKey)) {
            return new Promise((resolve) => {
                // get cached data
                const data = this.localCache.get(pathKey);

                // get the path key version value
                const version = this.localCache.get(`${pathKey}-version`);
                const expirationInterval = options.expirationInterval ?? 3;
                const expirationIntervalUnit = pluralize(options.expirationIntervalUnit ?? 'days');

                // calculate duration between cache version and now
                const duration = intervalToDuration({
                    start: parseISO(version),
                    end: new Date(),
                });
                // determine if we should expire cache
                const shouldExpire = duration[expirationIntervalUnit] > expirationInterval;

                // if the version is older than 3 days clear it
                if (!version || shouldExpire || options.clearData === true) {
                    this.flushRequestCache(path);
                    return request().then(resolve);
                }

                if (options.normalizeToEmberData) {
                    return resolve(this.normalizeModel(data, options.normalizeModelType));
                }

                // return cached response
                return resolve(data);
            });
        }

        // if no cached data request from server
        return request();
    }

    /**
     * Flushes the local cache for a specific path by setting its value and version to undefined.
     *
     * @param {string} path - The path for which the cache should be flushed.
     */
    flushRequestCache(path) {
        const pathKey = dasherize(path);

        this.localCache.set(pathKey, undefined);
        this.localCache.set(`${pathKey}-version`, undefined);
    }

    /**
     * Determines whether the cache should be reset by comparing the current version
     * of the console with the cached version. If they differ, the cache is cleared
     * and the new version is saved.
     */
    shouldResetCache() {
        const consoleVersion = this.localCache.get('console-version');

        if (!consoleVersion || consoleVersion !== config.APP.version) {
            this.localCache.clear();
            this.localCache.set('console-version', config.APP.version);
        }
    }

    /**
     * Makes a POST request with fetch
     *
     * @param {String} path
     * @param {Object} data
     * @param {Object} options
     *
     * @return {Promise}
     */
    post(path, data = {}, options = {}) {
        return this.request(path, 'POST', { body: JSON.stringify(data) }, options);
    }

    /**
     * Makes a PUT request with fetch
     *
     * @param {String} path
     * @param {Object} data
     * @param {Object} options
     *
     * @return {Promise}
     */
    put(path, data = {}, options = {}) {
        return this.request(path, 'PUT', { body: JSON.stringify(data) }, options);
    }

    /**
     * Makes a DELETE request with fetch
     *
     * @param {String} path
     * @param {Object} data
     * @param {Object} options
     *
     * @return {Promise}
     */
    delete(path, data = {}, options = {}) {
        return this.request(path, 'DELETE', { body: JSON.stringify(data) }, options);
    }

    /**
     * Makes a PATCH request with fetch
     * @param {String} path
     * @param {Object} data
     * @param {Object} options
     *
     * @return {Promise}
     */
    patch(path, data = {}, options = {}) {
        return this.request(path, 'PATCH', { body: JSON.stringify(data) }, options);
    }

    /**
     * Makes a upload request with fetch
     *
     * @param {String} path
     * @param {Array} files
     * @param {Object} options
     *
     * @return {Promise}
     */
    upload(path, files = [], options = {}) {
        const body = new FormData();
        files.forEach((file) => {
            body.append('file', file);
        });
        return this.request(path, 'POST', { body }, options);
    }

    /**
     * Sends request to routing service.
     *
     * @param {Array} coordinates
     * @param {Object} query
     * @param {String} service
     * @param {String} profile
     * @param {String} version
     */
    routing(coordinates, query = {}, options = {}) {
        let service = options?.service ?? 'trip';
        let profile = options?.profile ?? 'driving';
        let version = options?.version ?? 'v1';
        let host = options?.host ?? `https://${options?.subdomain ?? 'routing'}.fleetbase.io`;
        let route = coordinates.map((coords) => coords.join(',')).join(';');
        let params = !isEmptyObject(query) ? new URLSearchParams(query).toString() : '';
        let path = `${host}/${service}/${version}/${profile}/${route}`;
        let url = `${path}${params ? '?' + params : ''}`;

        return new Promise((resolve, reject) => {
            corslite(url, (container, xhr) => {
                if (!xhr || !xhr.response) {
                    reject(new Error('Request failed.'));
                    return;
                }

                let response = xhr.response;
                let isJson = typeof response === 'string' && response.startsWith('{');

                resolve(isJson ? JSON.parse(response) : response);
            });
        });
    }

    /**
     * Concurrency task to handle a file upload
     *
     * @void
     */
    @(task(function* (file, params = {}, callback, errorCallback) {
        const { queue } = file;
        const headers = this.getHeaders();

        // make sure this task runs once for this file in correct state
        // this can occur when the task is called twice when upload button exists inside upload dropzone
        if (['queued', 'failed', 'timed_out', 'aborted'].indexOf(file.state) === -1) {
            return;
        }

        // remove Content-Type header
        delete headers['Content-Type'];

        try {
            const upload = yield file
                .upload(`${get(config, 'API.host')}/${get(config, 'API.namespace')}/files/upload`, {
                    data: {
                        ...params,
                        file_size: file.size,
                    },
                    withCredentials: true,
                    headers,
                })
                .then((response) => response.json())
                .catch((error) => {
                    this.notifications.serverError(error, 'File upload failed.');

                    if (typeof errorCallback === 'function') {
                        errorCallback(error);
                    }
                });

            if (upload) {
                const model = this.store.push(this.store.normalize('file', upload.file));
                set(file, 'model', model);

                if (typeof callback === 'function') {
                    callback(model);
                }

                return model;
            }

            return null;
        } catch (error) {
            queue.remove(file);
            this.notifications.serverError(error, 'File upload failed.');

            if (typeof errorCallback === 'function') {
                errorCallback(error);
            }
        }
    })
        .maxConcurrency(3)
        .enqueue())
    uploadFile;

    /**
     * Downloads blob of the request path to user
     *
     * @param {String} path
     * @param {Object} query
     * @param {Object} options
     *
     * @return {Promise}
     */
    download(path, query = {}, options = {}) {
        const headers = Object.assign(this.getHeaders(), options.headers ?? {});
        const method = options.method ?? 'GET';
        const credentials = options.credentials ?? this.credentials;
        const baseUrl = `${options.host || this.host}/${options.namespace || this.namespace}`;
        const isReadOnlyRequest = ['GET', 'HEAD'].includes(method.toUpperCase());
        const params = isReadOnlyRequest && !isEmptyObject(query) ? `?${new URLSearchParams(query).toString()}` : '';
        const body = !isReadOnlyRequest ? JSON.stringify(query) : {};
        const fetchOptions = {
            method,
            credentials,
            headers,
        };

        // Only supply body to fetch if not GET or HEAD request
        if (!isReadOnlyRequest) {
            fetchOptions.body = body;
        }

        return new Promise((resolve, reject) => {
            return fetch(`${baseUrl}/${path}${params}`, fetchOptions)
                .then((response) => {
                    options.fileName = this.getFilenameFromResponse(response, options.fileName);
                    options.mimeType = this.getMimeTypeFromResponse(response, options.mimeType);

                    if (!options.mimeType) {
                        options.mimeType = getMimeType(options.fileName);
                    }

                    return response;
                })
                .then((response) => response.blob())
                .then((blob) => resolve(download(blob, options.fileName, options.mimeType)))
                .catch((error) => {
                    reject(error);
                });
        });
    }

    getFilenameFromResponse(response, defaultFilename = null) {
        const contentDisposition = response.headers.get('content-disposition');
        let fileName = defaultFilename;

        if (contentDisposition) {
            const results = /filename=(.*)/.exec(contentDisposition);

            if (isArray(results) && results.length > 1) {
                fileName = results[1];

                // clean fileName
                fileName = fileName.replaceAll('"', '');
            }
        }

        return fileName;
    }

    getMimeTypeFromResponse(response, defaultMimeType = null) {
        const contentType = response.headers.get('content-type');
        let mimeType = defaultMimeType;

        if (contentType) {
            const results = /(.*)?;/.exec(contentType);

            if (isArray(results) && results.length > 1) {
                mimeType = results[1];
            }
        }

        return mimeType;
    }

    fetchOrderConfigurations(params = {}) {
        return new Promise((resolve, reject) => {
            this.request('fleet-ops/order-configs/get-installed', params)
                .then((configs) => {
                    const serialized = [];

                    for (let i = 0; i < configs.length; i++) {
                        const config = configs.objectAt(i);
                        const normalizedConfig = this.store.normalize('order-config', config);
                        const serializedConfig = this.store.push(normalizedConfig);

                        serialized.pushObject(serializedConfig);
                    }

                    resolve(serialized);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }
}
