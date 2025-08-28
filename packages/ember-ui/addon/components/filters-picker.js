import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { set, action } from '@ember/object';
import { isArray } from '@ember/array';
import { later } from '@ember/runloop';
import getUrlParam from '../utils/get-url-param';

export default class FiltersPickerComponent extends Component {
    /**
     * Inject router to handle param changes via `transitionTo`
     *
     * @memberof FiltersPickerComponent
     */
    @service hostRouter;

    /**
     * Array of filters created from columns argument.
     *
     * @memberof FiltersPickerComponent
     */
    @tracked filters = [];
    @tracked activeFilters = [];

    constructor() {
        super(...arguments);
        this.updateFilters();
    }

    get hasFilters() {
        return this.activeFilters.length > 0;
    }



    @action updateFilters(onColumn) {
        const built = (this.args.columns || [])
            .filter((column) => column.filterable)
            .map((col, trueIndex) => {
                let column = { ...col, trueIndex };
                column.param = column.filterParam ?? column.valuePath;

                const activeParam = getUrlParam(column.param);

                if (activeParam !== null && activeParam !== undefined && activeParam !== '') {
                    column.isFilterActive = isArray(activeParam) ? activeParam.length > 0 : true;
                    column.filterValue = activeParam;
                } else {
                    column.isFilterActive = false;
                    column.filterValue = undefined;
                }

                return column;
            });

        this.filters = built;
        this.activeFilters = built.filter((f) => f.isFilterActive);  // Ensure the array reference is updated

    
}
/**
     * Triggers the apply callback for the filters picker.
     *
     * @memberof FiltersPickerComponent
     */
@action applyFilters() {
    const { onApply } = this.args;

    // run `onApply()` callback
    if (typeof onApply === 'function') {
        onApply();
    }

    // manually run update filters after apply with slight 300ms delay to update activeFilters
    later(
        this,
        () => {
            this.updateFilters();
        },
        150
    );
}


@action updateFilterValue({ param }, value) {
    const { onChange } = this.args;

    // Rebuild filters immutably for immediate UI feedback
    const updated = this.filters.map((c) => {
        if (c.param !== param) return c;
        const next = { ...c };
        next.filterValue = value;

        if (value !== undefined && value !== null && value !== '') {
            next.isFilterActive = isArray(value) ? value.length > 0 : true;
        } else {
            next.isFilterActive = false;
        }

        return next;
    });

    // Reassign the filters and activeFilters arrays with new references
    this.filters = [...updated];
    this.activeFilters = updated.filter((f) => f.isFilterActive);

    // console.log('[picker] activeFilters updated after change', this.activeFilters);

    if (typeof onChange === 'function') {
        onChange(param, value);
    }
}

@action clearFilterValue({ param }) {
    const { onFilterClear } = this.args;

    const updated = this.filters.map((c) =>
        c.param === param ? { ...c, filterValue: undefined, isFilterActive: false } : c
    );

    // Reassign the arrays to trigger reactivity
    this.filters = [...updated];
    this.activeFilters = updated.filter((f) => f.isFilterActive);

    // console.log('[picker] activeFilters updated after clear', this.activeFilters);

    if (typeof onFilterClear === 'function') {
        onFilterClear(param);
    }
}

@action clearFilters() {
    const { onClear } = this.args;
    const currentRouteName = this.hostRouter.currentRouteName;
    const currentQueryParams = { ...this.hostRouter.currentRoute.queryParams };

    const updated = this.filters.map((c) => {
        const key = c.filterParam ?? c.valuePath;
        delete currentQueryParams[key];
        delete currentQueryParams[`${key}[]`];
        return { ...c, filterValue: undefined, isFilterActive: false };
    });

    // Reassign the arrays to trigger reactivity
    this.filters = [...updated];
    this.activeFilters = [];

    this.hostRouter.transitionTo(currentRouteName, { queryParams: currentQueryParams });

    // console.log('[picker] activeFilters cleared', this.activeFilters);

    if (typeof onClear === 'function') {
        onClear(...arguments);
    }
}
}
