import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';
import applyContextComponentArguments from '@fleetbase/ember-core/utils/apply-context-component-arguments';
import ENV from '@fleetbase/console/config/environment';

export default class MaintenanceScheduleFormPanelComponent extends Component {
    @service intl;
    @service notifications;
    @service store;
    @service contextPanel;
    @service session;

    @tracked context;
    @tracked savePermission;

    constructor(owner, { order = null }) {
        super(...arguments);
        // Normalize the incoming model to a single property for clarity
        this.record = order ?? this.args.order ?? this.args.model;
        // Normalize non leave-request records so UI renders, but avoid converting for edit to preserve identifier
        try {
            const isNew = this.record?.isNew === true;
            const modelName = this.record?.constructor?.modelName;
            if (isNew && modelName !== 'leave-request') {
                const vehicleUuid = this.record?.vehicle?.id ?? this.record?.vehicle?.uuid ?? this.record?.vehicle?.id ?? this.record?.vehicle ?? null;
                const leaveRequest = this.store.createRecord('leave-request', {
                    // required payload fields
                    user_uuid: null,
                    vehicle_uuid: vehicleUuid,
                    start_date: this.formatDateOnly(this.record?.scheduledAt),
                    end_date: this.formatDateOnly(this.record?.estimatedEndDate),
                    reason: this.record?.reason ?? null,
                    unavailability_type: 'vehicle',
                    // keep any UI-bound fields for the form experience
                    vehicle: this.record?.vehicle ?? this.record?.vehicle ?? null,
                    scheduledAt: this.record?.scheduledAt ?? null,
                    estimatedEndDate: this.record?.estimatedEndDate ?? null,
                    notes: this.record?.notes ?? null,
                });
                try {
                    if (typeof this.record.unloadRecord === 'function') {
                        this.record.unloadRecord();
                    }
                } catch (_) {}
                this.record = leaveRequest;
            } else {
                // Existing record (leave-request or other); map fields so the form displays values
                // Vehicle selected model: create a local stub if we have a UUID, avoid network
                if (!this.record.vehicle) {
                    const vUuid = this.record.vehicle_uuid ?? this.record.vehicle?.uuid ?? this.record.vehicle?.id ?? null;
                    const vName = this.record.vehicle_name ?? this.record.vehicle?.display_name ?? null;
                    if (vUuid) {
                        let vehicleModel = this.store.peekRecord('vehicle', vUuid);
                        if (!vehicleModel) {
                            try {
                                this.store.push({ data: { id: vUuid, type: 'vehicle', attributes: { display_name: vName } } });
                                vehicleModel = this.store.peekRecord('vehicle', vUuid);
                            } catch (_) {}
                        }
                        if (vehicleModel) {
                            this.record.vehicle = vehicleModel;
                        }
                    } else if (vName) {
                        // As a last resort, allow a POJO for display; ModelSelect will clear it on user choice
                        this.record.vehicle = { display_name: vName };
                    }
                }
                // Dates: coerce to Date objects for DateTimeInput
                if (!this.record.scheduledAt && this.record.start_date) {
                    const d = new Date(this.record.start_date);
                    this.record.scheduledAt = isNaN(d.getTime()) ? this.record.start_date : d;
                }
                if (!this.record.estimatedEndDate && this.record.end_date) {
                    const d = new Date(this.record.end_date);
                    this.record.estimatedEndDate = isNaN(d.getTime()) ? this.record.end_date : d;
                }
                if (!this.record.notes && this.record.reason) {
                    this.record.notes = this.record.reason;
                }
                if (!this.record.createdAt && this.record.created_at) {
                    const d = new Date(this.record.created_at);
                    this.record.createdAt = isNaN(d.getTime()) ? this.record.created_at : d;
                }
            }
        } catch (_) {}

        const existingIdentifier = this.record?.id ?? this.record?.uuid;
        this.savePermission = existingIdentifier ? 'fleet-ops update leave-request' : 'fleet-ops create leave-request';
        applyContextComponentArguments(this);
    }

    get isEditMode() {
        try {
            return Boolean(this.record?.id || this.record?.uuid);
        } catch (_) {
            return false;
        }
    }

    get headerTitle() {
        return `${this.intl.t('fleet-ops.common.order')} #${this.record?.public_id ?? ''}`;
    }

    get scheduledAtInput() {
        return this.toInputDateTime(this.record?.scheduledAt);
    }

    get estimatedEndDateInput() {
        return this.toInputDateTime(this.record?.estimatedEndDate);
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

    // Format date object or string to YYYY-MM-DD
    formatDateOnly(value) {
        if (!value) return null;
        try {
            const d = value instanceof Date ? value : new Date(value);
            if (isNaN(d.getTime())) return null;
            const pad = (n) => `${n}`.padStart(2, '0');
            const yyyy = d.getFullYear();
            const mm = pad(d.getMonth() + 1);
            const dd = pad(d.getDate());
            return `${yyyy}-${mm}-${dd}`;
        } catch (_) {
            return null;
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
        if (!this.record?.vehicle || !this.record?.scheduledAt) {
            this.notifications.warning(this.intl.t('validation.form_invalid'));
            return;
        }

        // If creating a new record and it's not a leave-request, convert it to leave-request before saving
        try {
            const isNew = this.record?.isNew === true;
            const modelName = this.record?.constructor?.modelName;
            if (isNew && modelName !== 'leave-request') {
                const leaveRequest = this.store.createRecord('leave-request', {
                    // copy the fields the form uses
                    vehicle: this.record.vehicle ?? this.record.vehicle ?? null,
                    scheduledAt: this.record.scheduledAt ?? null,
                    estimatedEndDate: this.record.estimatedEndDate ?? null,
                    reason: this.record.reason ?? null,
                    notes: this.record.notes ?? null,
                });
                // unload the original unsaved record to avoid side-effects
                try {
                    if (typeof this.record.unloadRecord === 'function') {
                        this.record.unloadRecord();
                    }
                } catch (_) {}
                this.record = leaveRequest;
            }
        } catch (e) {
            // If conversion fails for any reason, proceed with current record to avoid breaking UX
            // but still attempt to save so errors surface clearly
            // no-op
        }

        // Map UI fields to required API payload fields before save
        try {
            const vehicleUuid = this.record?.vehicle_uuid
                ?? this.record?.vehicle?.uuid
                ?? this.record?.vehicle?.id
                ?? this.record?.vehicle?.uuid
                ?? this.record?.vehicle?.id
                ?? null;

            // Ensure we always use date-only strings for API (YYYY-MM-DD)
            const startDateOnly = this.formatDateOnly(this.record?.scheduledAt ?? this.record?.start_date);
            const endDateOnly = this.formatDateOnly(this.record?.estimatedEndDate ?? this.record?.end_date);

            const reasonValue = this.record?.notes ?? this.record?.reason ?? null;
            this.record.setProperties({
                user_uuid: null,
                vehicle_uuid: vehicleUuid,
                start_date: startDateOnly,
                end_date: endDateOnly,
                unavailability_type: 'vehicle',
                reason: reasonValue,
            });

            if (!vehicleUuid) {
                this.notifications.warning(this.intl.t('fleet-ops.common.validation.vehicle-required'));
            }
        } catch (_) {}

        contextComponentCallback(this, 'onBeforeSave', this.record);
        // Build payload for external API
        // Build payload with date-only enforcement (guard against any upstream time strings)
        const payload = {
            user_uuid: this.record.user_uuid ?? null,
            vehicle_uuid: this.record.vehicle_uuid ?? null,
            start_date: this.formatDateOnly(this.record.scheduledAt ?? this.record.start_date) ?? null,
            end_date: this.formatDateOnly(this.record.estimatedEndDate ?? this.record.end_date) ?? null,
            reason: (this.record.notes ?? this.record.reason) ?? null,
            unavailability_type: this.record.unavailability_type ?? 'vehicle',
        };

        // Read auth token like parking form panel
        const authToken = this.session?.data?.authenticated?.token;

        // Determine endpoint and method (create vs edit) based on presence of identifier
        const identifier = this.record?.id ?? this.record?.uuid;
        const hasIdentifier = Boolean(identifier);
        const apiUrl = hasIdentifier
            ? `${ENV.API_HOST}/api/v1/leave-requests/${identifier}`
            : `${ENV.API_HOST}/api/v1/leave-requests/create`;
        const method = hasIdentifier ? 'PUT' : 'POST';
        // Ensure required param is sent
        const urlWithParams = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}unavailability_page=1`;

        try {
            const response = yield fetch(urlWithParams, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                let errorBody = null;
                try { errorBody = yield response.json(); } catch (_) {}
                throw new Error(errorBody?.message || `Request failed (${response.status})`);
            }

            let data = null;
            try { data = yield response.json(); } catch (_) {}

            // Optionally hydrate current record with returned fields
            if (data && typeof data === 'object') {
                try { this.record.setProperties(data); } catch (_) {}
            }

            this.notifications.success(this.intl.t('fleet-ops.component.maintenance-schedule-form-panel.success-message'));
            contextComponentCallback(this, 'onAfterSave', this.record);
        } catch (error) {
            this.notifications.serverError(error);
            return;
        }
    }

    @action onViewDetails() {
        const over = contextComponentCallback(this, 'onViewDetails', this.record);
        if (!over) {
            this.contextPanel.focus(this.record, 'viewing');
        }
    }

    @action onPressCancel() {
        return contextComponentCallback(this, 'onPressCancel', this.record);
    }

    @action updateScheduledAt(e) {
        const dt = this.parseFromInput(e);
        this.record.scheduledAt = dt;
        // Keep underlying API fields in sync for any code paths reading start_date directly
        this.record.start_date = this.formatDateOnly(dt);
    }

    @action updateEstimatedEndDate(e) {
        const dt = this.parseFromInput(e);
        this.record.estimatedEndDate = dt;
        // Keep underlying API fields in sync
        this.record.end_date = this.formatDateOnly(dt);
    }

    /**
     * Handlers for DateTimeInput component which calls with a value not an event
     */
    @action setScheduledAt(value) {
        this.record.scheduledAt = value ?? null;
    }

    @action setEstimatedEndDate(value) {
        this.record.estimatedEndDate = value ?? null;
    }

    @action setVehicle(model) {
        // Update both the relationship used by the UI and the UUID for API payload
        this.record.vehicle = model ?? null;
        const uuid = model?.uuid ?? model?.id ?? null;
        this.record.vehicle_uuid = uuid;
    }
}
