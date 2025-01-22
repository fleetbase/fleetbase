import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { dasherize, camelize } from '@ember/string';
import { task } from 'ember-concurrency-decorators';
import isObject from '@fleetbase/ember-core/utils/is-object';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';
import applyContextComponentArguments from '@fleetbase/ember-core/utils/apply-context-component-arguments';
import getCustomFieldTypeMap from '../utils/get-custom-field-type-map';

/**
 * Component class for managing custom fields within forms.
 * This component facilitates the creation and editing of custom fields,
 * offering a variety of field types including inputs, selects, and file uploads.
 *
 * @extends Component
 */
export default class CustomFieldFormPanelComponent extends Component {
    /**
     * Service for displaying notifications.
     * @service
     */
    @service notifications;

    /**
     * Tracked property for the custom field being edited or created.
     * @tracked
     */
    @tracked customField;

    /**
     * Tracked property representing the current mapping for the selected field type.
     * @tracked
     */
    @tracked currentFieldMap;

    /**
     * A map defining the available custom field types and their corresponding components.
     */
    customFieldTypeMap = getCustomFieldTypeMap();

    /**
     * Tracked array of col span size options for the custom field groups.
     * @tracked
     */
    @tracked colSpanSizeOptions = [1, 2, 3];

    /**
     * Constructor for CustomFieldFormPanelComponent.
     * Applies context component arguments and selects the appropriate field map
     * based on the custom field type.
     */
    constructor() {
        super(...arguments);
        applyContextComponentArguments(this);
        this.selectFieldMap(this.customField.type);
    }

    /**
     * A task for saving the custom field. It handles the save operation asynchronously,
     * manages callbacks on success, and shows notifications on error.
     * @task
     */
    @task *save() {
        contextComponentCallback(this, 'onBeforeCustomFieldSaved', this.customField);

        try {
            this.customField = yield this.customField.save();
        } catch (error) {
            this.notifications.serverError(error);
            return;
        }

        if (typeof this.onCustomFieldSaved === 'function') {
            this.onCustomFieldSaved(this.customField);
        }
        contextComponentCallback(this, 'onCustomFieldSaved', this.customField);
    }

    /**
     * Action method to set the name of the custom field. Converts the name to a dasherized string.
     * @param {Event} event - The event object containing the new field name.
     * @action
     */
    @action setCustomFieldName(event) {
        const value = event.target.value;
        this.customField.name = dasherize(value);
    }

    /**
     * Action method for selecting the custom field type. It updates the field type
     * and selects the corresponding field map.
     * @param {Event} event - The event object containing the selected field type.
     * @action
     */
    @action onSelectCustomFieldType(event) {
        const value = event.target.value;
        const type = dasherize(value);
        this.customField.type = type;
        this.selectFieldMap(type);
    }

    /**
     * Action method for selecting a model type for the custom field.
     * @param {Event} event - The event object containing the selected model type.
     * @action
     */
    @action onSelectModelType(event) {
        const value = event.target.value;
        const modelName = dasherize(value);
        this.setCustomFieldMetaProperty('modelName', modelName);
    }

    /**
     * Action method to set a metadata property for the custom field.
     * Initializes the metadata object if it doesn't exist.
     * @param {string} key - The key of the metadata property.
     * @param {*} value - The value to set for the property.
     * @action
     */
    @action setCustomFieldMetaProperty(key, value) {
        if (!isObject(this.customField.meta)) {
            this.customField.set('meta', {});
        }

        this.customField.meta[key] = value;
    }

    /**
     * Selects the field map based on the given field type.
     * Updates the current field map and the component for the custom field.
     * @param {string} type - The type of the custom field.
     */
    selectFieldMap(type) {
        if (!type) {
            return;
        }
        const fieldKey = camelize(type);
        const fieldMap = this.customFieldTypeMap[fieldKey];
        if (fieldMap) {
            this.currentFieldMap = fieldMap;
            this.customField.component = fieldMap.component;
        }
    }
}
