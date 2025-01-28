import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action, computed, set, setProperties } from '@ember/object';
import { isArray } from '@ember/array';
import { equal } from '@ember/object/computed';
import { underscore } from '@ember/string';
import generateUuid from '@fleetbase/ember-core/utils/generate-uuid';

export default class OrderConfigActivityFlowEditorComponent extends Component {
    constructor() {
        super(...arguments);
        const { orderConfig } = this.args;

        this.orderConfig = orderConfig;

        if (orderConfig.meta.flow) {
            this.flow = this.fixOrderFlow(orderConfig.meta.flow);
        }
    }

    @service modalsManager;
    @service notifications;
    @service fetch;
    @service intl;
    @tracked drake;
    @tracked orderConfig = {};
    @tracked flow = {};
    @tracked dynamicMetaFields = [];
    @tracked notify = 0;
    @tracked activeTab = 'order';

    @tracked logicOperators = [
        { label: 'equals', value: '=' },
        { label: 'not equals', value: '!=' },
        { label: 'contains', value: '$' },
        { label: 'greater than', value: '>' },
        { label: 'less than', value: '<' },
    ];

    @equal('activeTab', 'order') isOrderTab;
    @equal('activeTab', 'waypoint') isWaypointTab;
    @equal('activeTab', 'entity') isEntityTab;

    @computed('activeTab', 'flow', 'orderConfig.id') get activeFlow() {
        const activeTab = this.activeTab;

        return this[`${activeTab}Flow`];
    }

    @computed('flow', 'orderConfig.id') get waypointFlow() {
        const { flow } = this;
        const keys = Object.keys(flow);
        const waypointFlow = {};

        for (let i = 0; i < keys.length; i++) {
            const key = keys.objectAt(i);

            if (key.startsWith('waypoint|')) {
                waypointFlow[key] = flow[key];
            }
        }

        return waypointFlow;
    }

    @computed('flow', 'orderConfig.id') get entityFlow() {
        const { flow } = this;
        const keys = Object.keys(flow);
        const entityFlow = {};

        for (let i = 0; i < keys.length; i++) {
            const key = keys.objectAt(i);

            if (key.startsWith('waypoint|')) {
                entityFlow[key] = flow[key];
            }
        }

        return entityFlow;
    }

    @computed('flow', 'orderConfig.id') get orderFlow() {
        const { flow } = this;
        const keys = Object.keys(flow);
        const orderFlow = {};

        for (let i = 0; i < keys.length; i++) {
            const key = keys.objectAt(i);

            if (!key.startsWith('waypoint|') && !key.startsWith('entity|')) {
                orderFlow[key] = flow[key];
            }
        }

        return orderFlow;
    }

    @computed('orderConfig', 'flow', 'orderConfig.meta.fields.[]', 'dynamicMetaFields.[]')
    get configFields() {
        const { flow, dynamicMetaFields } = this;
        const defaultLogicFields = ['status', 'type', 'internal_id', 'id', 'adhoc', 'pod_method', 'pod_required', 'scheduled_at'];
        const metaFields = Array.from(this.orderConfig.meta.fields ?? []).map((metaField) => `meta.${metaField.key}`);
        const inheritedFields = [];

        // loop through and add preset meta fields
        for (let key in flow) {
            const activity = flow[key];

            if (isArray(activity.events)) {
                for (let i = 0; i < activity.events.length; i++) {
                    const event = activity.events.objectAt(i);

                    if (isArray(event.if)) {
                        for (let j = 0; j < event.if.length; j++) {
                            const logic = event.if.objectAt(j);

                            if (typeof logic[0] === 'string') {
                                inheritedFields.pushObject(logic[0]);
                            }
                        }
                    }
                }
            }
        }

        return [...defaultLogicFields, ...metaFields, ...inheritedFields, ...dynamicMetaFields];
    }

    @action setupComponent() {
        this.fetchDynamicMetaFields();
    }

    @action fetchDynamicMetaFields() {
        this.fetch
            .get('fleet-ops/order-configs/dynamic-meta-fields', {
                type: this.orderConfig.key,
            })
            .then((dynamicMetaFields) => {
                this.dynamicMetaFields = dynamicMetaFields ?? [];
            });
    }

    @action setDragulaInstance(drake) {
        this.drake = drake;
    }

    @action newStatus() {
        const { flow } = this;

        this.modalsManager.show('modals/order-config-new-status', {
            title: this.intl.t('fleet-ops.component.order-config.activity-flow-editor.add-status'),
            statusName: null,
            confirm: async (modal) => {
                const statusName = modal.getOption('statusName');

                if (!statusName) {
                    return this.notifications.warning(this.intl.t('fleet-ops.component.order-config.activity-flow-editor.no-status'));
                }

                const format = (status) => underscore(status.toLowerCase());
                const status = this.activeTab === 'order' ? format(statusName) : `${this.activeTab}|${format(statusName)}`;

                if (flow[status]) {
                    await modal.done();
                    // prompt to confirm overwrite
                    return this.modalsManager.confirm({
                        title: this.intl.t('fleet-ops.component.order-config.activity-flow-editor.overwrite'),
                        body: this.intl.t('fleet-ops.component.order-config.activity-flow-editor.overwrite-text', { statusName: statusName }),
                        acceptButtonText: this.intl.t('fleet-ops.component.order-config.activity-flow-editor.overwrite-button'),
                        confirm: (modal) => {
                            this.insertNewStatus(status);
                            modal.done();
                        },
                    });
                }

                this.insertNewStatus(status);
                modal.done();
            },
        });
    }

    insertNewStatus(statusName) {
        const { flow } = this;
        const status = underscore(statusName.toLowerCase());

        // insert status
        set(flow, status, {
            id: generateUuid(),
            sequence: Object.keys(flow).length + 1,
            events: [],
        });
        this.flow = flow;

        // add initial activity
        this.addNewActivity(status);

        if (typeof this.args.onFlowChanged === 'function') {
            this.args.onFlowChanged(this.flow);
        }
    }

    @action removeStatus(status) {
        const { flow } = this;
        this.modalsManager.confirm({
            title: this.intl.t('fleet-ops.component.order-config.activity-flow-editor.remove'),
            body: this.intl.t('fleet-ops.component.order-config.activity-flow-editor.remove-text'),
            acceptButtonText: this.intl.t('fleet-ops.component.order-config.activity-flow-editor.delete-button'),
            confirm: (modal) => {
                delete flow[status];
                set(this, 'flow', flow);

                if (typeof this.args.onFlowChanged === 'function') {
                    this.args.onFlowChanged(this.flow);
                }
                modal.done();
            },
        });
    }

    @action moveStatus(el, container) {
        const { flow } = this;
        const { status } = el.dataset;

        if (!status) {
            return;
        }

        const format = (s) => s.replace(`${this.activeTab}|`, '');

        // if status is created or dispatched prevent from dragging
        if (['created', 'dispatched', 'completed'].includes(format(status))) {
            this.notifications.warning(this.intl.t('fleet-ops.component.order-config.activity-flow-editor.unable-warning', { status: format(status) }));
            this.drake.cancel(true);
            return;
        }

        const sequence = Array.prototype.indexOf.call(container.children, el);
        const activity = flow[status];

        // if is not created but attempt to move to sequence 0
        if (format(status) !== 'created' && sequence === 0) {
            this.notifications.warning(this.intl.t('fleet-ops.component.order-config.activity-flow-editor.order-warning'));
            this.drake.cancel(true);
            return;
        }

        if (!activity) {
            return;
        }

        setProperties(activity, { sequence });

        this.flow[status] = activity;

        if (typeof this.args.onFlowChanged === 'function') {
            this.args.onFlowChanged(this.flow);
        }
    }

    @action addNewActivity(status) {
        if (!this.flow[status]) {
            return;
        }

        const event = {
            id: generateUuid(),
            stauts: null,
            code: null,
            details: null,
            if: [],
        };

        this.flow[status]['events'].pushObject(event);

        if (typeof this.args.onFlowChanged === 'function') {
            this.args.onFlowChanged(this.flow);
        }
    }

    @action removeActivity(status, event) {
        if (!this.flow[status]) {
            return;
        }

        if (this.flow[status]['events'].length === 1) {
            return;
        }

        this.flow[status]['events'].removeObject(event);

        if (typeof this.args.onFlowChanged === 'function') {
            this.args.onFlowChanged(this.flow);
        }
    }

    @action updateActivityLogic(status, event, conditionIndex, index, value) {
        if (!this.flow[status]) {
            return;
        }

        const eventIndex = this.flow[status]['events'].findIndex((e) => e.code === event.code);

        if (eventIndex === -1) {
            return;
        }

        set(this.flow, `${status}.events.${eventIndex}.if.${conditionIndex}.${index}`, value);

        if (typeof this.args.onFlowChanged === 'function') {
            this.args.onFlowChanged(this.flow);
        }
    }

    @action addLogicCondition(status, event) {
        if (!this.flow[status]) {
            return;
        }

        const condition = ['if', '=', ''];
        const index = this.flow[status]['events'].findIndex((e) => e.code === event.code);

        if (index === -1) {
            return;
        }

        if (!isArray(event.if)) {
            event.if = [];
        }

        event.if.pushObject(condition);

        this.flow[status]['events'][index] = event;

        if (typeof this.args.onFlowChanged === 'function') {
            this.args.onFlowChanged(this.flow);
        }
    }

    @action removeLogicCondition(event, condition) {
        event.if.removeObject(condition);

        if (typeof this.args.onFlowChanged === 'function') {
            this.args.onFlowChanged(this.flow);
        }
    }

    fixOrderFlow(flow) {
        const patched = {};

        for (const status in flow) {
            const activity = flow[status];

            patched[status] = activity;

            for (let i = 0; i < activity.events.length; i++) {
                const event = activity.events.objectAt(i);

                if (!event.if) {
                    event.if = [];
                }

                if (!event.post_actions) {
                    event.post_actions = [];
                }

                patched[status]['events'][i] = event;
            }
        }

        return patched;
    }
}
