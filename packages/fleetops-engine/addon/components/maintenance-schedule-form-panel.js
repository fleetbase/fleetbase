import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';
import applyContextComponentArguments from '@fleetbase/ember-core/utils/apply-context-component-arguments';

export default class MaintenanceScheduleFormPanelComponent extends Component {
    @service intl;
    @service notifications;
    @service contextPanel;

    @tracked context;
    @tracked savePermission;

    constructor(owner, { order = null }) {
        super(...arguments);
        this.order = order ?? this.args.order ?? this.args.model;
        this.savePermission = this.order && this.order.isNew ? 'fleet-ops create order' : 'fleet-ops update order';
        applyContextComponentArguments(this);
    }

    get headerTitle() {
        return `${this.intl.t('fleet-ops.common.order')} #${this.order?.public_id ?? ''}`;
    }

    get scheduledAtInput() {
        return this.toInputDateTime(this.order?.scheduledAt);
    }

    get estimatedEndDateInput() {
        return this.toInputDateTime(this.order?.estimatedEndDate);
    }

    toInputDateTime(value) {
        if (!value) return '';
        try {
            const d = value instanceof Date ? value : new Date(value);
            const pad = (n) => `${n}`.padStart(2, '0');
            const yyyy = d.getFullYear();
            const mm = pad(d.getMonth() + 1);
            const dd = pad(d.getDate());
            const hh = pad(d.getHours());
            const mi = pad(d.getMinutes());
            return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
        } catch {
            return '';
        }
    }

    parseFromInput(e) {
        const v = e?.target?.value;
        if (!v) return null;
        const date = new Date(v);
        return isNaN(date.getTime()) ? null : date;
    }

    @action setOverlayContext(ctx) {
        this.context = ctx;
        contextComponentCallback(this, 'onLoad', ...arguments);
    }

    @task *save() {
        // Basic validation: require vehicle and scheduledAt
        if (!this.order?.vehicle_assigned || !this.order?.scheduledAt) {
            this.notifications.warning(this.intl.t('validation.form_invalid'));
            return;
        }

        contextComponentCallback(this, 'onBeforeSave', this.order);
        try {
            this.order = yield this.order.save();
        } catch (error) {
            this.notifications.serverError(error);
            return;
        }

        this.notifications.success(this.intl.t('fleet-ops.common.saved-successfully'));
        contextComponentCallback(this, 'onAfterSave', this.order);
    }

    @action onViewDetails() {
        const over = contextComponentCallback(this, 'onViewDetails', this.order);
        if (!over) {
            this.contextPanel.focus(this.order, 'viewing');
        }
    }

    @action onPressCancel() {
        return contextComponentCallback(this, 'onPressCancel', this.order);
    }

    @action updateScheduledAt(e) {
        const dt = this.parseFromInput(e);
        this.order.scheduledAt = dt;
    }

    @action updateEstimatedEndDate(e) {
        const dt = this.parseFromInput(e);
        this.order.estimatedEndDate = dt;
    }

    /**
     * Handlers for DateTimeInput component which calls with a value not an event
     */
    @action setScheduledAt(value) {
        this.order.scheduledAt = value ?? null;
    }

    @action setEstimatedEndDate(value) {
        this.order.estimatedEndDate = value ?? null;
    }
}
