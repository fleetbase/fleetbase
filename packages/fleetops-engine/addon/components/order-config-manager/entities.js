import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import { later } from '@ember/runloop';
import { task } from 'ember-concurrency-decorators';
import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';
import ObjectProxy from '@ember/object/proxy';
import createCustomEntity from '../../utils/create-custom-entity';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';

/**
 * Component class for managing order configuration entities.
 * This component allows for creating, editing, deleting, and managing custom entities
 * associated with an order configuration.
 *
 * @extends Component
 */
export default class OrderConfigManagerEntitiesComponent extends Component {
    @service contextPanel;
    @service modalsManager;
    @service notifications;

    /**
     * Internationalization service for handling translations.
     * @service
     */
    @service intl;

    /**
     * Tracked property for the current configuration.
     * @tracked
     */
    @tracked config;

    /**
     * Tracked array of custom entities associated with the configuration.
     * @tracked
     */
    @tracked customEntities = [];

    /**
     * Constructor for OrderConfigManagerEntitiesComponent.
     * Initializes the component with the provided configuration and loads the associated entities.
     * @param {Object} owner - The owner of the component.
     * @param {Object} args - The arguments passed to the component.
     */
    constructor(owner, { config, configManagerContext }) {
        super(...arguments);
        this.config = config;
        this.customEntities = this.getEntitiesFromConfig(config);
        this.initializeContext();

        configManagerContext.on('onConfigChanged', (newConfig) => {
            this.changeConfig(newConfig);
        });
    }

    /**
     * Action method to create a new custom entity and open it for editing.
     * @action
     */
    @action createNewCustomEntity() {
        const customEntity = createCustomEntity();
        return this.editCustomEntity(customEntity);
    }

    /**
     * Action method to edit a given custom entity.
     * @param {Object} customEntity - The custom entity to edit.
     * @param {number} index - The index of the entity in the entities array.
     * @action
     */
    @action editCustomEntity(customEntity, index) {
        contextComponentCallback(this, 'onContextChanged', customEntity);
        this.contextPanel.focus(customEntity, 'editing', {
            args: {
                config: this.config,
                onPressCancel: () => {
                    this.contextPanel.clear();
                    contextComponentCallback(this, 'onContextChanged', null);
                },
                onSave: (customEntity) => {
                    if (index > -1) {
                        this.customEntities = this.customEntities.map((_, i) => {
                            if (i === index) {
                                return customEntity;
                            }

                            return _;
                        });
                    } else {
                        this.customEntities = [customEntity, ...this.customEntities];
                    }
                    this.contextPanel.clear();
                    this.save.perform();
                    contextComponentCallback(this, 'onContextChanged', null);
                },
            },
        });
    }

    /**
     * Action method to delete a given custom entity.
     * @param {Object} customEntity - The custom entity to delete.
     * @param {number} index - The index of the entity in the entities array.
     * @action
     */
    @action deleteCustomEntity(customEntity, index) {
        this.modalsManager.confirm({
            title: this.intl.t('fleet-ops.component.order-config-manager.entities.delete-custom-entity-title'),
            body: this.intl.t('fleet-ops.component.order-config-manager.entities.delete-custom-entity-body'),
            acceptButtonText: this.intl.t('fleet-ops.component.order-config-manager.entities.confirm-delete'),
            confirm: (modal) => {
                this.customEntities = this.customEntities.filter((_, i) => i !== index);
                this.save.perform();
                modal.done();
            },
        });
    }

    /**
     * A task method to save the current state of entities to the configuration.
     * It serializes the entities and updates the configuration.
     * @task
     */
    @task *save() {
        this.config.set('entities', this.serializeEntities());

        try {
            const config = yield this.config.save();
            this.config = config;
            this.customEntities = this.getEntitiesFromConfig(config);
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    /**
     * If any context is provided then initialize the state.
     *
     * @memberof OrderConfigManagerCustomFieldsComponent
     */
    initializeContext() {
        later(
            this,
            () => {
                const { context, contextModel } = this.args;
                if (typeof context === 'string' && contextModel === 'custom-entity') {
                    const contextCustomEntity = this.customEntities.find((entity) => entity.get('id') === context);
                    if (contextCustomEntity) {
                        this.editCustomEntity(contextCustomEntity);
                    }
                }
            },
            300
        );
    }

    /**
     * Handle change of config.
     *
     * @param {OrderConfigModel} newConfig
     * @memberof OrderConfigManagerEntitiesComponent
     */
    changeConfig(newConfig) {
        this.config = newConfig;
        this.customEntities = this.getEntitiesFromConfig(newConfig);
    }

    /**
     * Deserializes an array of custom entities, preparing them for use in the component.
     * @param {Array} customEntities - The array of serialized custom entities.
     * @returns {Array} The array of deserialized custom entities.
     */
    deserializeEntities(customEntities) {
        return customEntities.map(this.fixInternalModel).map((customEntity) => {
            if (customEntity instanceof ObjectProxy) {
                return customEntity;
            }

            return createCustomEntity(customEntity.name, customEntity.type, customEntity.description, { ...customEntity });
        });
    }

    /**
     * Fixes the internal model of a custom entity for consistency.
     * @param {Object} customEntity - The custom entity to fix.
     * @returns {Object} The custom entity with a fixed internal model.
     */
    fixInternalModel(customEntity) {
        const _internalModel = {
            modelName: 'custom-entity',
        };
        if (customEntity instanceof ObjectProxy) {
            customEntity.set('_internalModel', _internalModel);
            return customEntity;
        }

        customEntity._internalModel = _internalModel;
        return customEntity;
    }

    /**
     * Serializes the current custom entities for saving to the configuration.
     * @returns {Array} The serialized custom entities.
     */
    serializeEntities() {
        const customEntities = [...this.customEntities];
        return customEntities.map((customEntity) => customEntity.content);
    }

    /**
     * Retrieves and deserializes entities from the given configuration.
     * @param {Object} config - The configuration object containing the entities.
     * @returns {Array} The deserialized entities.
     */
    getEntitiesFromConfig(config) {
        const entities = getWithDefault(config, 'entities', []);
        return this.deserializeEntities(isArray(entities) ? entities : []);
    }
}
