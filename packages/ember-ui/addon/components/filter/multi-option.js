import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action, get } from '@ember/object';
import { isArray } from '@ember/array';

export default class FilterMultiOptionComponent extends Component {
    @service fetch;
    @tracked value = [];
    @tracked options = [];
    @tracked isLoading = false;

    constructor() {
        super(...arguments);

        const { value, options, filter } = this.args;

        this.value = this.parseValue(value);
        this.options = isArray(options) ? options : [];

        if (typeof filter?.filterFetchOptions === 'string') {
            this.fetchOptions(filter?.filterFetchOptions);
        }
    }

    @action onChange(selection) {
        const { onChange, filter, optionValue } = this.args;

        if (isArray(selection)) {
            this.value = selection.map((selected) => {
                if (typeof selected === 'string') {
                    return selected;
                }

                return optionValue ? get(selected, optionValue) : selected;
            });
        } else {
            this.value = [optionValue ? get(selection, optionValue) : selection];
        }

        if (typeof onChange === 'function') {
            onChange(filter, this.value);
        }
    }

    @action search(query) {
        const { filter, optionLabel } = this.args;
        const { filterFetchOptions } = filter;

        if (typeof filterFetchOptions === 'string') {
            return this.fetchOptions(filterFetchOptions, { query });
        }

        this.options = this.options.filter((option) => {
            const optionText = get(option, optionLabel ?? 'name') ?? option;

            if (typeof optionText === 'string') {
                return optionText.toLowerCase().includes(query.toLowerCase());
            }

            return false;
        });
    }

    @action fetchOptions(uri, params = {}) {
        const { fetchParams } = this.args;
        const queryParams = Object.assign(params, fetchParams ?? {});

        this.isLoading = true;
        this.fetch
            .get(uri, queryParams)
            .then((options) => {
                this.options = options;
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    parseValue(value) {
        if (isArray(value)) {
            return value;
        }

        if (typeof value === 'string' && value.includes(',')) {
            return value.split(',');
        }

        if (!value) {
            return [];
        }

        return [value];
    }
}
