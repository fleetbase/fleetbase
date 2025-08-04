import Component from '@glimmer/component';
import { isEmpty } from '@ember/utils';
import { action, get, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { A } from '@ember/array';
import { tracked } from '@glimmer/tracking';
import { timeout } from 'ember-concurrency';
import { restartableTask, dropTask } from 'ember-concurrency-decorators';
import generateUuid from '@fleetbase/ember-core/utils/generate-uuid';
import config from 'ember-get-config';

const getConfigOption = (key, defaultValue) => {
    const value = get(config, `ember-model-select.${key}`);

    if (value === undefined) {
        return defaultValue;
    }

    return value;
};

/**
 * The main component.
 *
 * NOTE: apart from the arguments listed explicitely here, ember-model-select supports the full
 * ember-power-select API which can be found: https://ember-power-select.com/docs/api-reference
 *
 *
 * @class ModelSelectComponent
 * @extends {Component}
 *
 * @yield {object} model
 */
export default class ModelSelectComponent extends Component {
    @service store;
    @service fetch;
    @service abilities;

    /**
     * Source to query, either an ember data model or the store
     * useful when using ember-data-has-many-query.
     *
     * @argument source
     * @type {Model}
     * @default
     */
    get source() {
        return this.args.source || this.store;
    }

    /**
     * Whether or not to use infinite scroll.
     *
     * @argument infiniteScroll
     * @type {Boolean}
     * @default true
     */
    get infiniteScroll() {
        return this.args.infiniteScroll === undefined || this.args.infiniteScroll;
    }

    /**
     * The amount of records loaded at once when `infiniteScroll` is enabled.
     *
     * @argument pageSize
     * @type {Number}
     * @default 25
     */
    get pageSize() {
        return this.args.pageSize || getConfigOption('pageSize', 25);
    }

    /**
     * Debounce duration in ms used when searching.
     *
     * @argument debounceDuration
     * @type {Number}
     * @default 250
     */
    get debounceDuration() {
        return this.args.debounceDuration || getConfigOption('debounceDuration', 250);
    }

    /**
     * @argument perPageParam
     * @type {String}
     * @default 'page[size]'
     */
    get perPageParam() {
        return this.args.perPageParam || getConfigOption('perPageParam', 'limit');
    }

    /**
     * @argument pageParam
     * @type {String}
     * @default 'page[number]'
     */
    get pageParam() {
        return this.args.pageParam || getConfigOption('pageParam', 'page');
    }

    /**
     * @argument totalPagesParam
     * @type {String}
     * @default 'meta.total'
     */
    get totalPagesParam() {
        return this.args.totalPagesParam || getConfigOption('totalPagesParam', 'meta.total');
    }

    /**
     * Ember-power-select-option.
     *
     * See: https://ember-power-select.com/docs/api-reference/
     *
     * @argument optionsComponent
     * @type {Component}
     * @default 'model-select/options'
     */
    get optionsComponent() {
        return this.args.optionsComponent || 'model-select/options';
    }

    /**
     * Called upon creation of new entry.
     *
     * @argument onCreate
     * @type {Action}
     */

    @tracked _options;
    @tracked model;
    @tracked selectedModel;
    @tracked permissionRequired = null;
    @tracked disabled = false;
    @tracked doesntHavePermissions = false;

    constructor(owner, { permission = null, disabled = false }) {
        super(...arguments);
        this.permissionRequired = permission;
        this.disabled = disabled;
        if (!disabled) {
            this.disabled = this.doesntHavePermissions = permission && this.abilities.cannot(permission);
        }

        this.loadSelectedModel();
    }

    @action loadSelectedModel() {
        const { selectedModel } = this.args;

        if (typeof selectedModel === 'string') {
            return this.findRecord.perform(this.args.modelName, selectedModel);
        }

        this.selectedModel = selectedModel;
    }

    @action selectedModelChanged(el, [selectedModel]) {
        this.selectedModel = selectedModel;
    }

    @dropTask({ withTestWaiter: true }) findRecord = function* (modelName, id) {
        // this wrapper task is requried to avoid the following error upon fast changes
        // of selectedModel:
        // Error: Assertion Failed: You attempted to remove a function listener which
        // did not exist on the instance, which means you may have attempted to remove
        // it before it was added.
        const resolvedModel = yield this.store.findRecord(modelName, id);
        this.selectedModel = resolvedModel;

        return resolvedModel;
    };

    @restartableTask({ withTestWaiter: true }) searchModels = function* (term, options, initialLoad = false) {
        if (this.doesntHavePermissions || this.disabled) {
            return;
        }

        let createOption;

        if (this.args.withCreate && term) {
            createOption = {
                __value__: term,
                __isSuggestion__: true,
            };
            createOption[this.args.labelProperty] = this.args.buildSuggestion ? this.args.buildSuggestion(term) : `Add "${term}"...`;
            this._options = A([createOption]);
        }

        if (!initialLoad) {
            yield timeout(this.debounceDuration);
        }

        yield this.loadModels.perform(term, createOption);
    };

    @restartableTask({ withTestWaiter: true }) loadModels = function* (term, createOption) {
        if (this.doesntHavePermissions || this.disabled) {
            return;
        }

        // query might be an EmptyObject/{{hash}}, make it a normal Object
        const query = Object.assign({}, this.args.query);

        if (term) {
            set(query, 'query', term);
        }

        let _options;

        if (typeof this.args.customSearchEndpoint === 'string') {
            const customQuery = (endpoint, query, options = {}) => {
                return new Promise((resolve) => {
                    this.fetch
                        .get(endpoint, query, options)
                        .then((results) => {
                            let records = results.map((result) => {
                                let modelName = this.args.modelName;
                                let normalizedModel;

                                // if no id set "imaginary" id
                                if (!result.uuid) {
                                    result.uuid = generateUuid();
                                }

                                try {
                                    normalizedModel = this.store.push(this.store.normalize(modelName, result));
                                } catch {
                                    return null;
                                }

                                return normalizedModel;
                            });

                            resolve(records);
                        })
                        .catch(() => {
                            resolve([]);
                        });
                });
            };

            _options = yield customQuery(this.args.customSearchEndpoint, query);
        } else {
            if (this.infiniteScroll) {
                set(query, this.pageParam, 1);
                set(query, this.perPageParam, this.pageSize);
            } else {
                // For dropdowns/popups, use a large limit instead of pagination
                set(query, this.perPageParam, 500);
            }

            _options = yield this.source.query(this.args.modelName, query);
        }

        if (createOption) {
            _options.unshiftObjects([createOption]);
        }

        this._options = _options;
    };

    loadDefaultOptions() {
        const { loadDefaultOptions } = this.args;

        if (loadDefaultOptions === undefined || loadDefaultOptions) {
            this.searchModels.perform(null, null, true);
        }
    }

    @action onOpen() {
        const { onOpen } = this.args;

        this.loadDefaultOptions();

        if (typeof onOpen === 'function') {
            onOpen(...arguments);
        }
    }

    @action onInput(term) {
        const { onInput } = this.args;

        if (isEmpty(term)) {
            this.loadDefaultOptions();
        }

        if (typeof onInput === 'function') {
            onInput(...arguments);
        }
    }

    @action onClose() {
        const { onClose } = this.args;

        this.searchModels.cancelAll();

        if (typeof onClose === 'function') {
            onClose(...arguments);
        }
    }

    @action change(model, select) {
        const { onCreate, onChange, onChangeId } = this.args;

        this.selectedModel = model;

        if (!isEmpty(model) && model.__isSuggestion__) {
            if (typeof onCreate === 'function') {
                onCreate(model.__value__, select);
            }
        } else {
            if (typeof onChange === 'function') {
                onChange(model, select);
            }

            if (typeof onChangeId === 'function') {
                onChangeId(model.id, select);
            }
        }
    }
}
