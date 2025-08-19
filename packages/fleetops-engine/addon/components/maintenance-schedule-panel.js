import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class MaintenanceSchedulePanelComponent extends Component {
    @tracked overlayContext;
    @tracked tab = this.args.tab ?? { slug: 'overview' };

    constructor() {
        super(...arguments);
        // Normalize fields on the passed record so the template renders values
        try {
            const rec = this.order;
            console.log(rec)
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
    }

    get order() {
        return this.args.order || this.args.issue || this.args.model;
    }

    get tabs() {
        // Allow caller to pass through tabs; default to single overview without tabs
        return this.args.tabs ?? [
            {
                slug: 'overview',
                icon: 'clipboard-list',
                title: 'Overview',
                component: this.args.overviewComponent ?? null,
                componentParams: this.args.overviewComponentParams ?? {},
            },
        ];
    }

    get hasTabs() {
        return Array.isArray(this.tabs) && this.tabs.length > 0 && !!this.tabs[0].component;
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

    @action onTabChanged(slug) {
        const next = (this.tabs || []).find((t) => t.slug === slug) || { slug };
        this.tab = next;
        if (typeof this.args.onTabChanged === 'function') {
            this.args.onTabChanged(slug);
        }
    }
}
