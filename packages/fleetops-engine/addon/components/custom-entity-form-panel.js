import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { dasherize } from '@ember/string';
import contextComponentCallback from '../utils/context-component-callback';
import applyContextComponentArguments from '../utils/apply-context-component-arguments';

/**
 * Component class for custom entity form panel.
 * This component handles the creation and editing of custom entities,
 * including file uploads and type settings.
 *
 * @extends Component
 */
export default class CustomEntityFormPanelComponent extends Component {
    /**
     * Service for displaying notifications.
     * @service
     */
    @service notifications;

    /**
     * Service for performing fetch operations.
     * @service
     */
    @service fetch;

    /**
     * Tracked property for the custom entity being edited or created.
     * @tracked
     */
    @tracked customEntity;

    /**
     * Tracked property for configuration settings of the custom entity.
     * @tracked
     */
    @tracked config;

    /**
     * Constructor for CustomEntityFormPanelComponent.
     * Applies context component arguments upon instantiation.
     */
    constructor() {
        super(...arguments);
        applyContextComponentArguments(this);
    }

    /**
     * Action method to save the custom entity. It triggers an optional onSave callback
     * with the current state of the custom entity.
     * @action
     */
    @action save() {
        contextComponentCallback(this, 'onSave', this.customEntity);
        if (typeof this.onSave === 'function') {
            this.onSave(this.customEntity);
        }
    }

    /**
     * Action method called when a file is added. It uploads the file
     * and updates the custom entity's photo information.
     * @param {File} file - The file that was added.
     * @action
     */
    @action onFileAdded(file) {
        this.fetch.uploadFile.perform(
            file,
            {
                path: `uploads/${this.config.id}/entity/${this.simpleHash(this.customEntity.get('name') + '+' + this.customEntity.get('description'))}`,
                subject_uuid: this.config.id,
                subject_type: 'fleet-ops:order-config',
                type: 'custom_entity_image',
            },
            (uploadedFile) => {
                this.customEntity.setProperties({
                    photo_uuid: uploadedFile.id,
                    photo_url: uploadedFile.url,
                });
            }
        );
    }

    /**
     * Action method to set the type of the custom entity. Converts the type to a dasherized string.
     * @param {Event} event - The event object containing the selected type.
     * @action
     */
    @action setCustomEntityType(event) {
        const value = event.target.value;
        this.customEntity.set('type', dasherize(value));
    }

    /**
     * Action method to update the unit of dimensions of the custom entity.
     * @param {string} unit - The unit for the dimensions.
     * @action
     */
    @action updateCustomEntityDimensionsUnit(unit) {
        this.customEntity.set('dimensions_unit', unit);
    }

    /**
     * Action method to update the weight unit of the custom entity.
     * @param {string} unit - The unit for the weight.
     * @action
     */
    @action updateCustomEntityWeightUnit(unit) {
        this.customEntity.set('weight_unit', unit);
    }

    /**
     * A utility method to generate a simple hash from a string.
     * Used for creating unique identifiers.
     * @param {string} str - The input string.
     * @returns {number} The generated hash value.
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash |= 0;
        }
        return hash;
    }
}
