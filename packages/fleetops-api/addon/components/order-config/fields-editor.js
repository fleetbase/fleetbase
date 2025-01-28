import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action, setProperties } from '@ember/object';
import { isArray } from '@ember/array';
import { classify, underscore } from '@ember/string';
import groupBy from '@fleetbase/ember-core/utils/macros/group-by';
import generateUuid from '@fleetbase/ember-core/utils/generate-uuid';

export default class OrderConfigFieldsEditorComponent extends Component {
    constructor() {
        super(...arguments);
        const { orderConfig } = this.args;

        if (isArray(orderConfig.meta.fields)) {
            this.fields = orderConfig.meta.fields;
        }
    }

    @service intl;
    @service modalsManager;
    @service notifications;

    @groupBy('fields', 'group') groupedMetaFields;

    @tracked fields = [];
    @tracked metaFieldTypes = [
        {
            label: this.intl.t('fleet-ops.component.order-config.fields-editor.text-field'),
            key: 'text',
        },
        {
            label: this.intl.t('fleet-ops.component.order-config.fields-editor.boolean'),
            description: this.intl.t('fleet-ops.component.order-config.fields-editor.boolean-text'),
            key: 'boolean',
        },
        {
            label: this.intl.t('fleet-ops.component.order-config.fields-editor.dropdown'),
            description: this.intl.t('fleet-ops.component.order-config.fields-editor.dropdown-text'),
            key: 'select',
            hasOptions: true,
        },
        {
            label: this.intl.t('fleet-ops.component.order-config.fields-editor.datetime'),
            description: this.intl.t('fleet-ops.component.order-config.fields-editor.datetime'),
            key: 'datetime',
        },
        {
            label: this.intl.t('fleet-ops.component.order-config.fields-editor.port'),
            description: this.intl.t('fleet-ops.component.order-config.fields-editor.port-text'),
            serialize: 'model:port',
            key: 'port',
        },
        {
            label: this.intl.t('fleet-ops.component.order-config.fields-editor.vessel'),
            description: this.intl.t('fleet-ops.component.order-config.fields-editor.vessel-text'),
            serialize: 'model:vessel',
            key: 'vessel',
        },
    ];

    @action sendAction(action) {
        const actionName = `on${classify(action)}`;
        const params = [...arguments];

        params.shift();

        if (typeof this.args[actionName] === 'function') {
            this.args[actionName](...params);
        }
    }

    @action moveMetaField(el, target) {
        const { fields } = this;
        const { metaFieldKey } = el.dataset;
        const { metaGroupKey } = target.dataset;

        // get the index of the moved metafield
        const metaFieldIndex = fields.findIndex((field) => field.key === metaFieldKey);

        // get the meta field and update the group
        const metaField = fields[metaFieldIndex];

        if (!metaField) {
            return;
        }

        metaField.group = metaGroupKey;

        if (typeof this.args.onFieldsChanged === 'function') {
            this.args.onFieldsChanged(fields);
        }
    }

    @action addMetaFieldGroup() {
        this.modalsManager.show('modals/meta-field-group-form', {
            title: 'Add a new group of meta fields',
            groupName: null,
            confirm: (modal) => {
                const groupName = modal.getOption('groupName');

                if (typeof groupName !== 'string') {
                    return this.notifications.warning(this.intl.t('fleet-ops.component.order-config.fields-editor.warning-message'));
                }

                const group = underscore(groupName.toLowerCase());

                modal.startLoading();
                this.addField(group);
                modal.done();
            },
        });
    }

    @action addField(group = '_untitled') {
        this.fields.pushObject({
            id: generateUuid(),
            label: null,
            key: null,
            type: 'text',
            kvOptions: false,
            group,
        });

        if (typeof this.args.onFieldsChanged === 'function') {
            this.args.onFieldsChanged(this.fields);
        }
    }

    @action removeField(metaField) {
        const { fields } = this;

        fields.removeObject(metaField);

        if (typeof this.args.onFieldsChanged === 'function') {
            this.args.onFieldsChanged(fields);
        }
    }

    @action setFieldLabel(metaField, { target }) {
        const { value } = target;
        const label = value || '';
        const key = underscore(label.toLowerCase());

        setProperties(metaField, { label, key });

        if (typeof this.args.onFieldsChanged === 'function') {
            this.args.onFieldsChanged(this.fields);
        }
    }

    @action addMetaFieldOption(metaField) {
        const options = metaField.options || [];
        const option = { id: generateUuid(), value: '' };

        if (metaField.kvOptions) {
            option['key'] = '';
        }

        options.pushObject(option);
        setProperties(metaField, { options });

        if (typeof this.args.onFieldsChanged === 'function') {
            this.args.onFieldsChanged(this.fields);
        }
    }

    @action removeMetaFieldOption(metaField, option) {
        if (metaField.options.length === 1) {
            return;
        }

        metaField.options.removeObject(option);

        if (typeof this.args.onFieldsChanged === 'function') {
            this.args.onFieldsChanged(this.fields);
        }
    }

    @action toggleMetaFieldKv(metaField, useKvOptions) {
        setProperties(metaField, { useKvOptions, options: [] });

        this.addMetaFieldOption(metaField);

        if (typeof this.args.onFieldsChanged === 'function') {
            this.args.onFieldsChanged(this.fields);
        }
    }

    @action toggleMetaFieldHumanizeOptions(metaField, humanizeOptions) {
        setProperties(metaField, { humanizeOptions, options: [] });

        this.addMetaFieldOption(metaField);

        if (typeof this.args.onFieldsChanged === 'function') {
            this.args.onFieldsChanged(this.fields);
        }
    }

    /* eslint no-unused-vars: "off" */
    @action sortMetaFieldOptions(metaField, el, target) {
        // const { fields } = this;
        // const { index } = el.dataset;
        // const parentEl = el.parentElement();
        // const { metaGroupKey } = target.dataset;
        // // get the index of the moved metafield
        // const metaFieldIndex = fields.findIndex((field) => field.key === metaFieldKey);
        // // get the meta field and update the group
        // const metaField = fields[metaFieldIndex];
        // if (!metaField) {
        //     return;
        // }
        // metaField.group = metaGroupKey;
        // if (typeof this.args.onFieldsChanged === 'function') {
        //     this.args.onFieldsChanged(fields);
        // }
    }

    @action removeGroup(group) {
        const fields = this.fields.filter((metaField) => metaField.group !== group);
        this.fields = fields;

        if (typeof this.args.onFieldsChanged === 'function') {
            this.args.onFieldsChanged(fields);
        }
    }
}
