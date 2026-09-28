import FiltersPickerComponent from '@fleetbase/ember-ui/components/filters-picker';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

/**
 * The Console owns this route and its query params. Keep the published picker's
 * presentation, while avoiding its engine-only router and second clear transition.
 */
export default class AdminOrganizationsFiltersPickerComponent extends FiltersPickerComponent {
    @service('filters') filterState;

    get activeRouter() {
        return this.router;
    }

    @action updateFilters() {
        this.filterState.pendingQueryParams = {};
        const queryParams = this.router.currentRoute?.queryParams ?? {};

        this.filters = (this.args.columns ?? [])
            .filter((column) => column.filterable)
            .map((column, index) => {
                const param = column.filterParam ?? column.valuePath;
                const value = queryParams[param];

                return {
                    ...column,
                    trueIndex: index,
                    param,
                    filterValue: value,
                    isFilterActive: value !== undefined && value !== null && value !== '',
                };
            });
    }

    @action clearFilters() {
        // The controller clears search, saved views and filters together. The base
        // picker would immediately restore the old URL's non-column query params.
        this.args.onClear();
    }
}
