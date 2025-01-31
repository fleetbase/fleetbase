import Service from '@ember/service';
import { debounce } from '@ember/runloop';
import hasJsonStructure from '../utils/has-json-structure';

/**
 * Service for manipulating URL search parameters.
 *
 * This service provides methods to get, set, remove, and check URL query parameters.
 * It also allows updating the browser's URL without reloading the page.
 *
 * @extends Service
 */
export default class UrlSearchParamsService extends Service {
    /**
     * Getter for `urlParams` that ensures it's always up-to-date with the current URL.
     *
     * @type {URLSearchParams}
     * @private
     */
    get urlParams() {
        return new URLSearchParams(window.location.search);
    }

    /**
     * Retrieves the value of a specific query parameter.
     *
     * If the parameter value is a JSON string, it will be parsed into an object or array.
     *
     * @param {string} key - The name of the query parameter to retrieve.
     * @returns {*} The value of the query parameter, parsed from JSON if applicable, or null if not found.
     */
    getParam(key) {
        let value = this.urlParams.get(key);

        if (hasJsonStructure(value)) {
            value = JSON.parse(value);
        }

        return value;
    }

    /**
     * Sets or updates a query parameter in the URL search parameters.
     *
     * If the value is an object or array, it will be stringified to JSON.
     *
     * @param {string} key - The name of the query parameter to set.
     * @param {*} value - The value of the query parameter.
     * @returns {this} Returns the service instance for chaining.
     */
    setParam(key, value) {
        if (typeof value === 'object') {
            value = JSON.stringify(value);
        } else {
            value = encodeURIComponent(value);
        }

        this.urlParams.set(key, value);

        return this;
    }

    /**
     * Alias for `getParam`.
     *
     * @param {string} key - The name of the query parameter to retrieve.
     * @returns {*} The value of the query parameter.
     */
    get(key) {
        return this.getParam(key);
    }

    /**
     * Sets or updates a query parameter with multiple values.
     *
     * @param {string} key - The name of the query parameter to set.
     * @param {Array} values - An array of values for the parameter.
     * @returns {this} Returns the service instance for chaining.
     */
    setParamArray(key, values) {
        this.urlParams.delete(key);
        values.forEach((value) => {
            this.urlParams.append(key, value);
        });

        return this;
    }

    /**
     * Retrieves all values of a specific query parameter.
     *
     * @param {string} key - The name of the query parameter.
     * @returns {Array} An array of values for the parameter.
     */
    getParamArray(key) {
        return this.urlParams.getAll(key);
    }

    /**
     * Checks if a specific query parameter exists in the URL.
     *
     * @param {string} key - The name of the query parameter to check.
     * @returns {boolean} True if the parameter exists, false otherwise.
     */
    exists(key) {
        return this.urlParams.has(key);
    }

    /**
     * Checks if a specific query parameter has in the URL.
     *
     * @param {string} key - The name of the query parameter to check.
     * @returns {boolean} True if the parameter exists, false otherwise.
     */
    has(key) {
        return this.urlParams.has(key);
    }

    /**
     * Removes a specific query parameter from the URL search parameters.
     *
     * @param {string} key - The name of the query parameter to remove.
     * @returns {this} Returns the service instance for chaining.
     */
    remove(key) {
        this.urlParams.delete(key);

        return this;
    }

    /**
     * Retrieves all query parameters as an object.
     *
     * Each parameter value is processed by `getParam`, which parses JSON values if applicable.
     *
     * @returns {Object} An object containing all query parameters and their values.
     */
    all() {
        const all = {};

        for (let key of this.urlParams.keys()) {
            all[key] = this.getParam(key);
        }

        return all;
    }

    /**
     * Updates the browser's URL with the current `urlParams` without reloading the page.
     *
     * @returns {void}
     */
    updateUrl() {
        const url = new URL(window.location.href);
        url.search = this.urlParams.toString();
        window.history.pushState({ path: url.href }, '', url.href);
    }

    /**
     * Updates the browser's URL with the current `urlParams`, debounced to prevent excessive calls.
     *
     * @returns {void}
     */
    updateUrlDebounced() {
        debounce(this, this.updateUrl, 100);
    }

    /**
     * Clears all query parameters from the URL search parameters.
     *
     * @returns {this} Returns the service instance for chaining.
     */
    clear() {
        this.urlParams = new URLSearchParams();

        return this;
    }

    /**
     * Returns the full URL as a string with the current `urlParams`.
     *
     * @returns {string} The full URL with updated query parameters.
     */
    getFullUrl() {
        const url = new URL(window.location.href);
        url.search = this.urlParams.toString();

        return url.toString();
    }

    /**
     * Returns the current path with the updated query parameters.
     *
     * @returns {string} The path and search portion of the URL.
     */
    getPathWithParams() {
        return `${window.location.pathname}?${this.urlParams.toString()}`;
    }

    /**
     * Removes a query parameter from the current URL and updates the browser history.
     *
     * This method modifies the browser's URL by removing the specified parameter and uses the History API
     * to update the URL without reloading the page.
     *
     * @param {string} paramToRemove - The name of the query parameter to remove from the URL.
     * @returns {void}
     */
    removeParamFromCurrentUrl(paramToRemove) {
        const url = new URL(window.location.href);
        url.searchParams.delete(paramToRemove);
        window.history.pushState({ path: url.href }, '', url.href);
    }

    /**
     * Adds or updates a query parameter in the current URL and updates the browser history.
     *
     * This method modifies the browser's URL by adding or updating the specified parameter and uses the History API
     * to update the URL without reloading the page.
     *
     * @param {string} paramName - The name of the query parameter to add or update.
     * @param {string} paramValue - The value of the query parameter.
     * @returns {void}
     */
    addParamToCurrentUrl(paramName, paramValue) {
        const url = new URL(window.location.href);
        url.searchParams.set(paramName, paramValue);
        window.history.pushState({ path: url.href }, '', url.href);
    }

    /**
     * Adds or updates a query parameters from a provided object into the current URL and updates the browser history.
     *
     * This method modifies the browser's URL by adding or updating the specified parameters and uses the History API
     * to update the URL without reloading the page.
     *
     * @param {Object} params - The query parameters to add or update.
     * @returns {void}
     */
    setParamsToCurrentUrl(params = {}) {
        for (let param in params) {
            const value = params[param];
            this.addParamToCurrentUrl(param, value);
        }
    }
}
