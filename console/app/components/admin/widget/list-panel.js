import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';

export default class AdminWidgetListPanelComponent extends Component {
    @service fetch;
    @service router;

    @tracked data = null;
    @tracked error = null;

    constructor() {
        super(...arguments);
        this.load.perform();
    }

    get slug() {
        return this.args.options?.slug;
    }

    get title() {
        return this.args.options?.title ?? this.data?.title ?? 'Admin Summary';
    }

    get subtitle() {
        return this.args.options?.subtitle ?? this.data?.subtitle;
    }

    get icon() {
        return this.args.options?.icon ?? this.data?.icon ?? 'list';
    }

    get items() {
        return this.data?.items ?? [];
    }

    get emptyText() {
        return this.data?.empty ?? 'No items require attention.';
    }

    get drilldownRoute() {
        return this.data?.route ?? this.args.options?.route;
    }

    get drilldownQueryParams() {
        return this.data?.queryParams ?? this.args.options?.queryParams ?? {};
    }

    get hasDrilldown() {
        return Boolean(this.drilldownRoute);
    }

    get endpoint() {
        return `metrics/admin/widgets/${this.slug}`;
    }

    @action openItem(item) {
        const route = item?.route;

        if (!route) {
            return;
        }

        const routeModels = item.routeModels ?? [];
        const queryParams = item.queryParams ?? {};

        return this.router.transitionTo(route, ...routeModels, { queryParams });
    }

    @action openDrilldown() {
        if (!this.hasDrilldown) {
            return;
        }

        return this.router.transitionTo(this.drilldownRoute, { queryParams: this.drilldownQueryParams });
    }

    @task *load() {
        if (!this.slug) {
            this.error = 'Missing dashboard widget slug.';
            return;
        }

        try {
            this.data = yield this.fetch.get(this.endpoint);
            this.error = null;
        } catch (error) {
            this.error = error?.message ?? 'Unable to load dashboard widget.';
        }
    }
}
