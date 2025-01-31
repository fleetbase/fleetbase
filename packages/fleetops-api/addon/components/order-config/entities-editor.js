import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action, computed, set } from '@ember/object';
import { isArray } from '@ember/array';
import { underscore } from '@ember/string';
import generateUuid from '@fleetbase/ember-core/utils/generate-uuid';
import getWeightUnits from '@fleetbase/ember-core/utils/get-weight-units';
import getLengthUnits from '@fleetbase/ember-core/utils/get-length-units';

export default class OrderConfigEntitiesEditorComponent extends Component {
    @service modalsManager;
    @service notifications;
    @service intl;
    @tracked weightUnits = getWeightUnits();
    @tracked lengthUnits = getLengthUnits();
    @tracked _orderConfig = null;

    @computed('_orderConfig', 'args.orderConfig') get orderConfig() {
        if (this._orderConfig) {
            return this._orderConfig;
        }

        return this.args.orderConfig;
    }

    set orderConfig(orderConfig) {
        this._orderConfig = orderConfig;
    }

    @action newEntity() {
        const { orderConfig } = this;
        const entity = {
            id: generateUuid(),
            name: null,
            type: null,
            description: null,
            weight: null,
            weight_unit: null,
            length: null,
            width: null,
            height: null,
            dimentions_unit: null,
            meta: {},
        };

        if (!isArray(orderConfig.meta.entities)) {
            set(orderConfig, 'meta.entities', []);
        }

        orderConfig.meta.entities.pushObject(entity);

        if (typeof this.args.onEntitiesChanged === 'function') {
            this.args.onEntitiesChanged(orderConfig.meta.entities);
        }
    }

    @action removeEntity(index) {
        const { orderConfig } = this;

        orderConfig.meta.entities.removeAt(index);

        if (typeof this.args.onEntitiesChanged === 'function') {
            this.args.onEntitiesChanged(orderConfig.meta.entities);
        }
    }

    @action addMetaField(index) {
        const { orderConfig } = this;

        this.modalsManager.show('modals/entity-meta-field-prompt', {
            title: 'Add a new group of meta fields',
            keyName: null,
            confirm: (modal) => {
                const keyName = modal.getOption('keyName');

                if (!keyName) {
                    return this.notifications.warning(this.intl.t('fleet-ops.component.order-config.entities-editor.warning-message'));
                }

                modal.startLoading();

                const meta = { ...orderConfig.meta.entities[index].meta };
                const key = underscore(keyName.toLowerCase());

                meta[key] = '';
                set(orderConfig, `meta.entities.${index}.meta`, meta);

                if (typeof this.args.onEntitiesChanged === 'function') {
                    this.args.onEntitiesChanged(orderConfig.meta.entities);
                }

                modal.done();
            },
        });
    }

    @action setMetaKeyValue(index, key, { target }) {
        const { orderConfig } = this;
        const { value } = target;

        set(orderConfig, `meta.entities.${index}.meta.${key}`, value);

        if (typeof this.args.onEntitiesChanged === 'function') {
            this.args.onEntitiesChanged(orderConfig.meta.entities);
        }
    }

    @action removeMetaKey(index, key) {
        const { orderConfig } = this;
        const meta = { ...orderConfig.meta.entities[index].meta };

        delete meta[key];
        set(orderConfig, `meta.entities.${index}.meta`, meta);

        if (typeof this.args.onEntitiesChanged === 'function') {
            this.args.onEntitiesChanged(orderConfig.meta.entities);
        }
    }
}
