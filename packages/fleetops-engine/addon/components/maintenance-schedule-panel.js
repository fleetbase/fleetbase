import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import findActiveTab from '../utils/find-active-tab';
import MaintenanceSchedulePanelDetailComponent from './maintenance-schedule/details';

export default class MaintenanceSchedulePanelComponent extends Component {
    @tracked overlayContext;
    @tracked tab;
    @service universe;
    @service intl;

    constructor() {
        super(...arguments);
        // Normalize fields on the passed record so the template renders values
        try {
            const rec = this.order;
            if (rec) {
                // Ensure vehicle displays even if relationship wasn't included
                if (!rec.vehicle && rec.vehicle_name) {
                    rec.vehicle = { display_name: rec.vehicle_name };
                }
                if (!rec.scheduledAt && rec.start_date) {
                    rec.scheduledAt = rec.start_date;
                }
                if (!rec.estimatedEndDate && rec.end_date) {
                    rec.estimatedEndDate = rec.end_date;
                }
                if (!rec.notes && rec.reason) {
                    rec.notes = rec.reason;
                }
                rec.createdAt = rec.createdAt || rec.created_at;
            }
        } catch (_) {}
        this.tab = findActiveTab(this.tabs, this.args.tab);
    }

    get order() {
        return this.args.order || this.args.issue || this.args.model;
    }

    get tabs() {
        const registeredTabs = this.universe.getMenuItemsFromRegistry('fleet-ops:component:maintenance-schedule-panel');
        const defaultTabs = [this.universe._createMenuItem(this.intl.t('fleet-ops.common.details'), null, {id: 'details', icon: 'circle-info', component: MaintenanceSchedulePanelDetailComponent })];

        if (isArray(registeredTabs)) {
            return [...defaultTabs, ...registeredTabs];
        }

        return defaultTabs;
    }

    get title() {
        return this.args.title;
    }

    @action setOverlayContext(ctx) {
        this.overlayContext = ctx;
        if (typeof this.args.onLoad === 'function') {
            this.args.onLoad(ctx);
        }
    }

    @action onOpen() {
        if (typeof this.args.onOpen === 'function') {
            this.args.onOpen();
        }
    }

    @action onClose() {
        if (typeof this.args.onClose === 'function') {
            this.args.onClose();
        }
    }

    @action onToggle(isOpen) {
        if (typeof this.args.onToggle === 'function') {
            this.args.onToggle(isOpen);
        }
    }

    @action onTabChanged(tab) {
        this.tab = findActiveTab(this.tabs, tab);
        contextComponentCallback(this, 'onTabChanged', tab);
    }

    @action onEdit() {
        if (typeof this.args.onEdit === 'function') {
            this.args.onEdit(this.order);
        }
    }

    @action onPressCancel() {
        if (typeof this.args.onPressCancel === 'function') {
            this.args.onPressCancel();
        }
    }
}
