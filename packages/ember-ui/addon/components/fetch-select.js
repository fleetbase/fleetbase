import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { isEmpty } from '@ember/utils';
import { action, set } from '@ember/object';
import { isArray } from '@ember/array';
import { assert } from '@ember/debug';
import { timeout } from 'ember-concurrency';
import { restartableTask } from 'ember-concurrency-decorators';

/**
 * FetchSelectComponent is a Glimmer component responsible for rendering a
 * select input and fetching options asynchronously based on user input.
 *
 * @class FetchSelectComponent
 * @extends Component
 * @memberof FleetbaseComponents
 *
 * @property {Service} fetch - The fetch service injected into the component.
 * @property {Array} options - The list of selectable options.
 * @property {Object} selected - The currently selected option.
 * @property {number} debounceDuration - The duration to debounce the search input, in milliseconds.
 */
export default class FetchSelectComponent extends Component {
    /**
     * The fetch service is used to make network requests to fetch the options for the select input.
     * @type {Service}
     */
    @service fetch;

    /**
     * The list of selectable options.
     * @type {Array}
     */
    @tracked options = [];

    /**
     * The currently selected option.
     * @type {Object}
     */
    @tracked selected;

    /**
     * The power select API.
     * @type {Object}
     */
    @tracked api;

    /**
     * The duration to debounce the search input, in milliseconds.
     * @type {number}
     */
    @tracked debounceDuration = 250;

    /**
     * The constructor ensures that the endpoint argument is specified, and
     * initializes the component's properties based on the arguments passed to it.
     */
    constructor() {
        super(...arguments);

        assert('<FetchSelect /> requires a valid `endpoint`.', !isEmpty(this.args.endpoint));

        this.endpoint = this.args.endpoint;
        this.selected = this.setSelectedOption(this.args.selected);
        // this.debounceDuration = this.args.debounceDuration || this.debounceDuration;
    }

    /**
     * Searches for options based on the term provided. Debounces the search
     * if it's not the initial load.
     *
     * @param {string} term - The search term.
     * @param {Object} [options={}] - Additional options for the search.
     * @param {boolean} [initialLoad=false] - Whether this is the initial load.
     * @task
     */
    @restartableTask({ withTestWaiter: true }) searchOptions = function* (term, options = {}, initialLoad = false) {
        if (!initialLoad) {
            yield timeout(this.debounceDuration);
        }

        yield this.fetchOptions.perform(term, options);
    };

    /**
     * Fetches options based on the term provided.
     *
     * @param {string} term - The search term.
     * @param {Object} [options={}] - Additional options for the fetch.
     * @task
     */
    @restartableTask({ withTestWaiter: true }) fetchOptions = function* (term, options = {}) {
        // query might be an EmptyObject/{{hash}}, make it a normal Object
        const query = Object.assign({}, this.args.query);

        if (term) {
            set(query, 'query', term);
        }

        let _options = yield this.fetch.get(this.endpoint, query, options);

        // if options returns is an object and not array
        if (this.isFetchResponseObject(_options)) {
            _options = this.convertOptionsObjectToArray(_options);
        }

        // set options
        this.options = _options;
        return _options;
    };

    convertOptionsObjectToArray(_options) {
        const objectKeys = Object.keys(_options);
        const _optionsFromObject = [];

        objectKeys.forEach((key) => {
            _optionsFromObject.pushObject({
                key,
                value: _options[key],
            });
        });

        return _optionsFromObject;
    }

    isFetchResponseObject(_options) {
        return !isArray(_options) && typeof _options === 'object' && Object.keys(_options).length;
    }

    /**
     * Set the selected option.
     *
     * @param {*} selected
     * @memberof FetchSelectComponent
     */
    setSelectedOption(selected) {
        const { optionValue } = this.args;

        if (optionValue) {
            this.fetchOptions.perform().then((options) => {
                let foundSelected = null;

                if (isArray(options)) {
                    foundSelected = options.find((option) => option[optionValue] === selected);
                }

                if (foundSelected) {
                    this.select(foundSelected);
                } else {
                    this.select(selected);
                }
            });
        } else {
            this.select(selected);
        }
    }

    select(option) {
        this.selected = option;

        // set via api
        if (this.api && this.api.actions && typeof this.api.actions.select === 'function') {
            this.api.actions.select(option);
        }
    }

    /**
     * Loads the default set of options.
     */
    loadDefaultOptions() {
        const { loadDefaultOptions } = this.args;

        if (loadDefaultOptions === undefined || loadDefaultOptions) {
            this.fetchOptions.perform(null, {}, true);
        }
    }

    /**
     * Called when the select input is opened.
     * @action
     */
    @action onOpen() {
        const { onOpen } = this.args;

        this.loadDefaultOptions();

        if (typeof onOpen === 'function') {
            onOpen(...arguments);
        }
    }

    /**
     * Called when the user inputs a search term.
     *
     * @param {string} term - The search term.
     * @action
     */
    @action onInput(term) {
        const { onInput } = this.args;

        if (isEmpty(term)) {
            this.loadDefaultOptions();
        }

        if (typeof onInput === 'function') {
            onInput(...arguments);
        }
    }

    /**
     * Called when an option is selected.
     *
     * @param {Object} option - The selected option.
     * @action
     */
    @action onChange(option, ...rest) {
        const { onChange, optionValue } = this.args;

        // set selected
        this.selected = option;

        // if option value supplied
        if (optionValue && typeof option === 'object') {
            option = option[optionValue];
        }

        if (typeof onChange === 'function') {
            onChange(option, ...rest);
        }
    }

    /**
     * Called when the select input is closed.
     * @action
     */
    @action onClose() {
        const { onClose } = this.args;

        this.fetchOptions.cancelAll();

        if (typeof onClose === 'function') {
            onClose(...arguments);
        }
    }

    /**
     * Register the power select API
     *
     * @memberof FetchSelectComponent
     */
    @action registerAPI(api) {
        this.api = api;

        if (typeof this.args.registerAPI === 'function') {
            this.args.registerAPI(...arguments);
        }
    }
}
