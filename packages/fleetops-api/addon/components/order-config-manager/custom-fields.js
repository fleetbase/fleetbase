import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import { later } from '@ember/runloop';
import { task } from 'ember-concurrency-decorators';
import isObject from '@fleetbase/ember-core/utils/is-object';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';

/**
 * Component class for managing custom fields within an order configuration.
 * This component allows for creating, editing, grouping, and managing custom fields,
 * along with their associated field groups in the context of an order configuration.
 *
 * @extends Component
 */
export default class OrderConfigManagerCustomFieldsComponent extends Component {
    @service store;
    @service notifications;
    @service modalsManager;
    @service contextPanel;
    @service intl;
    @service abilities;

    /**
     * Tracked array of field groups.
     * @tracked
     */
    @tracked groups = [];

    /**
     * Tracked property for the configuration being managed.
     * @tracked
     */
    @tracked config;

    /**
     * Tracked array of grid size options for the custom field groups.
     * @tracked
     */
    @tracked gridSizeOptions = [1, 2, 3];

    /**
     * Constructor for OrderConfigManagerCustomFieldsComponent.
     * Initializes the component with the provided configuration and loads custom fields.
     * @param {Object} owner - The owner of the component.
     * @param {Object} args - The arguments passed to the component, including the configuration.
     */
    constructor(owner, { config, configManagerContext }) {
        super(...arguments);
        this.config = config;
        this.loadCustomFields.perform();

        configManagerContext.on('onConfigChanged', (newConfig) => {
            this.changeConfig(newConfig);
        });
    }

    /**
     * Action method to select a grid size for a custom field group.
     * @param {Object} group - The custom field group to update.
     * @param {number} size - The selected grid size.
     * @action
     */
    @action selectGridSize(group, size) {
        if (!isObject(group.meta)) {
            group.set('meta', {});
        }
        group.meta.grid_size = size;

        return group.save();
    }

    /**
     * Action method to create a new custom field within a group.
     * @param {Object} group - The group to add the new custom field to.
     * @action
     */
    @action createNewCustomField(group) {
        const customField = this.store.createRecord('custom-field', {
            category_uuid: group.id,
            subject_uuid: this.config.id,
            subject_type: 'order-config',
            required: 0,
            options: [],
        });

        this.addCustomFieldToGroup(customField, group);
        this.editCustomField(customField);
    }

    /**
     * Action method to edit an existing custom field.
     * @param {Object} customField - The custom field to edit.
     * @action
     */
    @action editCustomField(customField) {
        contextComponentCallback(this, 'onContextChanged', customField);
        this.contextPanel.focus(customField, 'editing', {
            args: {
                customField,
                onCustomFieldSaved: () => {
                    this.loadCustomFields.perform();
                    this.contextPanel.clear();
                    contextComponentCallback(this, 'onContextChanged', null);
                },
                onPressCancel: () => {
                    this.contextPanel.clear();
                    contextComponentCallback(this, 'onContextChanged', null);
                },
            },
        });
    }

    /**
     * Action method to delete a custom field.
     * @param {Object} customField - The custom field to delete.
     * @action
     */
    @action deleteCustomField(customField) {
        this.modalsManager.confirm({
            title: this.intl.t('fleet-ops.component.order-config-manager.custom-fields.delete-custom-field-prompt.modal-title'),
            body: this.intl.t('fleet-ops.component.order-config-manager.custom-fields.delete-custom-field-prompt.delete-body-message'),
            acceptButtonText: this.intl.t('fleet-ops.component.order-config-manager.custom-fields.delete-custom-field-prompt.confirm-delete'),
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await customField.destroyRecord();
                    modal.done();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * Action method to create a new field group for custom fields.
     * @action
     */
    @action createNewFieldGroup() {
        const customFieldGroup = this.store.createRecord('category', {
            owner_uuid: this.config.id,
            owner_type: 'order-config',
            for: 'custom_field_group',
        });

        this.modalsManager.show('modals/new-custom-field-group', {
            title: this.intl.t('fleet-ops.component.modals.new-custom-field-group.modal-title'),
            acceptButtonIcon: 'check',
            acceptButtonIconPrefix: 'fas',
            declineButtonIcon: 'times',
            declineButtonIconPrefix: 'fas',
            customFieldGroup,
            confirm: async (modal) => {
                if (!customFieldGroup.name) {
                    return;
                }

                modal.startLoading();

                try {
                    await customFieldGroup.save();
                    this.loadCustomFields.perform();
                    modal.done();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * Action method to delete a custom field group.
     * @param {Object} group - The field group to delete.
     * @action
     */
    @action deleteCustomFieldGroup(group) {
        this.modalsManager.confirm({
            title: this.intl.t('fleet-ops.component.order-config-manager.custom-fields.delete-custom-field-group-prompt.modal-title'),
            body: this.intl.t('fleet-ops.component.order-config-manager.custom-fields.delete-custom-field-group-prompt.delete-body-message'),
            acceptButtonText: this.intl.t('fleet-ops.component.order-config-manager.custom-fields.delete-custom-field-group-prompt.confirm-delete'),
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await group.destroyRecord();
                    modal.done();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * A task method to load custom fields from the store and group them.
     * @task
     */
    @task *loadCustomFields() {
        this.groups = yield this.store.query('category', { owner_uuid: this.config.id, for: 'custom_field_group' });
        this.customFields = yield this.store.query('custom-field', { subject_uuid: this.config.id });
        this.groupCustomFields();
        this.initializeContext();
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
                if (typeof context === 'string' && contextModel === 'custom-field') {
                    const contextCustomField = this.store.peekRecord('custom-field', context);
                    if (contextCustomField) {
                        this.editCustomField(contextCustomField);
                    }
                }
            },
            300
        );
    }

    /**
     * Handle the change of config.
     *
     * @param {OrderConfigModel} newConfig
     * @memberof OrderConfigManagerCustomFieldsComponent
     */
    changeConfig(newConfig) {
        this.config = newConfig;
        this.loadCustomFields.perform();
    }

    /**
     * Adds a custom field to a specified group.
     * @param {Object} customField - The custom field to add.
     * @param {Object} group - The group to add the custom field to.
     */
    addCustomFieldToGroup(customField, group) {
        if (!isArray(group.customFields)) {
            group.customFields = [];
        }
        group.set('customFields', [...group.customFields, customField]);
    }

    /**
     * Organizes custom fields into their respective groups.
     */
    groupCustomFields() {
        for (let i = 0; i < this.groups.length; i++) {
            const group = this.groups[i];
            group.set(
                'customFields',
                this.customFields.filter((customField) => {
                    return customField.category_uuid === group.id;
                })
            );
        }
    }
}
