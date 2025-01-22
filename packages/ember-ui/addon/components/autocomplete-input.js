import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action, computed } from '@ember/object';
import { later } from '@ember/runloop';
import { isBlank } from '@ember/utils';
import { isArray } from '@ember/array';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';

export default class AutocompleteInputComponent extends Component {
    @service fetch;
    @tracked value;
    @tracked fetchUrl = 'geocoder/query';
    @tracked searchParam = 'query';
    @tracked queryParams = {};
    @tracked results = [];
    @tracked shouldHideResults = false;
    @tracked selected;

    @computed('results.length', 'shouldHideResults') get hideResults() {
        return this.results.length === 0 || this.shouldHideResults;
    }

    constructor() {
        super(...arguments);

        this.overrideDefaultValue('value', this.args.value);
        this.overrideDefaultValue('fetchUrl', this.args.fetchUrl);
        this.overrideDefaultValue('searchParam', this.args.searchParam);
        this.overrideDefaultValue('queryParams', this.args.queryParams);
    }

    overrideDefaultValue(key, value) {
        if (!isBlank(value)) {
            this[key] = value;
        }
    }

    @action onFocus() {
        if (this.results) {
            this.shouldHideResults = false;
        }
    }

    @action onBlur() {
        // this delay is so that if a result is selected the click event can fire then we blur this
        later(
            this,
            () => {
                this.shouldHideResults = true;
            },
            300
        );
    }

    @action onInput(event) {
        const {
            target: { value },
        } = event;
        const { onTextChange } = this.args;

        if (typeof onTextChange === 'function') {
            onTextChange(value);
        }

        this.search.perform(value);
    }

    @action selectResult(result) {
        this.selected = result;
        this.shouldHideResults = true;

        if (typeof this.args.onSelect === 'function') {
            this.args.onSelect(result);
        }
    }

    @task({ restartable: true }) *search(query) {
        // if no query don't search
        if (isBlank(query)) {
            return;
        }

        const { fetchUrl, searchParam, queryParams } = this;

        // set the search/term param
        queryParams[searchParam] = query;

        // timeout for typing
        yield timeout(250);

        // start loading indicator
        this.isLoading = true;

        // get results
        const results = yield this.fetch.get(fetchUrl, queryParams);

        // check results
        if (isArray(results)) {
            this.results = results;
            this.shouldHideResults = false;
        } else {
            this.results = [];
            this.shouldHideResults = true;
        }

        // unset loading indicator
        this.isLoading = false;
    }
}
