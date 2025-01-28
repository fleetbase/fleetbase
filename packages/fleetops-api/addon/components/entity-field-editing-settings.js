import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import { isNone } from '@ember/utils';
import { task } from 'ember-concurrency-decorators';

export default class EntityFieldEditingSettingsComponent extends Component {
    @service notifications;
    @service fetch;
    @tracked selectedOrderConfig;
    @tracked entityFields = ['name', 'description', 'sku', 'height', 'width', 'length', 'weight', 'declared_value', 'sale_price'];
    @tracked entityEditingSettings = {};
    @tracked settingsLoaded = false;

    constructor() {
        super(...arguments);
        this.getEntityEditableSettings.perform();
    }

    @action onConfigChanged(orderConfig) {
        if (!isNone(this.selectedOrderConfig) && this.orderConfigDoesntHaveSettings(orderConfig)) {
            this.createSettingsForOrderConfig(orderConfig);
        }
        this.selectedOrderConfig = orderConfig;
    }

    @action enableEditableEntityFields(isEditable) {
        const orderConfig = this.selectedOrderConfig;
        if (orderConfig) {
            if (this.orderConfigDoesntHaveSettings(orderConfig)) {
                this.createSettingsForOrderConfig(orderConfig, isEditable);
            } else {
                const orderConfigSettings = this.entityEditingSettings[orderConfig.id] ?? {};
                this.entityEditingSettings = {
                    ...this.entityEditingSettings,
                    [orderConfig.id]: {
                        ...orderConfigSettings,
                        is_editable: isEditable,
                    },
                };
            }
        }
    }

    @action toggleFieldEditable(fieldName, isEditable) {
        const editableFields = this.entityEditingSettings[this.selectedOrderConfig.id]?.editable_entity_fields;
        if (isArray(editableFields)) {
            if (isEditable) {
                editableFields.pushObject(fieldName);
            } else {
                editableFields.removeObject(fieldName);
            }
        } else {
            this.entityEditingSettings = {
                ...this.entityEditingSettings,
                [this.selectedOrderConfig.id]: {
                    ...this.entityEditingSettings[this.selectedOrderConfig.id],
                    editable_entity_fields: [],
                },
            };
            return this.toggleFieldEditable(...arguments);
        }

        this.updateEditableEntityFieldsForOrderConfig(editableFields);
    }

    @task *getEntityEditableSettings() {
        try {
            const { entityEditingSettings } = yield this.fetch.get('fleet-ops/settings/entity-editing-settings');
            this.entityEditingSettings = entityEditingSettings;
            this.settingsLoaded = true;
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *saveEntityEditingSettings() {
        const { entityEditingSettings } = this;
        try {
            yield this.fetch.post('fleet-ops/settings/entity-editing-settings', { entityEditingSettings });
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    orderConfigDoesntHaveSettings(orderConfig) {
        return isNone(this.entityEditingSettings[orderConfig.id]);
    }

    createSettingsForOrderConfig(orderConfig, isEditable = false) {
        if (this.orderConfigDoesntHaveSettings(orderConfig)) {
            this.entityEditingSettings = {
                ...this.entityEditingSettings,
                [orderConfig.id]: {
                    editable_entity_fields: [],
                    is_editable: isEditable,
                },
            };
        }
    }

    updateEditableEntityFieldsForOrderConfig(editableFields = [], orderConfig = null) {
        orderConfig = orderConfig === null ? this.selectedOrderConfig : orderConfig;
        this.entityEditingSettings = {
            ...this.entityEditingSettings,
            [orderConfig.id]: {
                ...this.entityEditingSettings[orderConfig.id],
                editable_entity_fields: editableFields,
            },
        };
    }
}
