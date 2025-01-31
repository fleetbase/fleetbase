import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import isObject from '@fleetbase/ember-core/utils/is-object';

export default class CustomFieldFormPanelOptionsInputComponent extends Component {
    /**
     * Represents the custom field being manipulated.
     * @type {Object}
     */
    @tracked customField;

    /**
     * The object holding the current state of options, indexed by unique keys.
     * @type {Object}
     */
    @tracked options = {};

    /**
     * A temporary object used to manage updates to options before finalizing changes.
     * @type {Object}
     */
    @tracked _options = {};

    /**
     * Constructs a new CustomFieldFormPanelOptionsInputComponent instance, initializing the custom field and options tracking.
     * @param {Object} owner - The owner of the component.
     * @param {Object} customField - The custom field object to be managed.
     */
    constructor(owner, { customField }) {
        super(...arguments);
        this.customField = customField;
        this.trackOptions(this.createOptionsObjectFromArray(customField.options));
    }

    /**
     * Converts an array of options into an object format for easier tracking and manipulation.
     * @param {Array} options - The array of options to be converted.
     * @returns {Object} The options object.
     */
    createOptionsObjectFromArray(options = []) {
        const optionsObject = {};
        if (isArray(options)) {
            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                optionsObject[i] = option;
            }
        }

        return optionsObject;
    }

    /**
     * Tracks the given options object, setting both the primary and temporary options states.
     * @param {Object} options - The options object to track.
     */
    trackOptions(options = {}) {
        this.options = options;
        this._options = options;
    }

    /**
     * Adds a new option to the options object.
     */
    @action addOption() {
        const index = Object.keys(this.options).length + 1;
        this.trackOptions({
            ...this.options,
            [index]: '',
        });
    }

    /**
     * Updates the value of an option at the specified index.
     * @param {number} index - The index of the option to update.
     * @param {Event} event - The input event containing the new value.
     */
    @action updateOptionValue(index, event) {
        let value = event.target.value;
        this._options = {
            ...this.options,
            [index]: value,
        };
    }

    /**
     * Removes an option at the specified index.
     * @param {number} index - The index of the option to remove.
     */
    @action removeOption(index) {
        const options = { ...this.options };
        delete options[index];
        this.trackOptions(options);
        this.onOptionsChanges();
    }

    /**
     * Updates the primary options object with changes made to the temporary options object.
     */
    @action updateOptions() {
        this.options = {
            ...this._options,
        };
        this.onOptionsChanges();
    }

    /**
     * Handles changes to the options, updating the customField and calling the onChange callback if provided.
     */
    @action onOptionsChanges() {
        const options = Object.values(this.options);
        this.customField.set('options', options);
        if (typeof this.args.onChange === 'function') {
            this.args.onChange(options, this.customField);
        }
    }

    /**
     * Adds or updates a meta option with the given key and value.
     * @param {string} key - The key of the meta option to add or update.
     * @param {string} value - The value of the meta option.
     */
    @action addMetaOption(key, value) {
        if (!isObject(this.customField.meta)) {
            this.customField.set('meta', {});
        }

        const meta = {
            ...this.customField.meta,
            [key]: value,
        };

        this.customField.meta = meta;
        if (typeof this.args.onMetaChanged === 'function') {
            this.args.onMetaChanged(meta, this.customField);
        }
    }
}
