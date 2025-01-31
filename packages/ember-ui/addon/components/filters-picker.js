import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { set, action } from '@ember/object';
import { filter, gt } from '@ember/object/computed';
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

    /**
     * Filters which are active and should be applied.
     *
     * @memberof FiltersPickerComponent
     */
    @filter('filters.@each.isFilterActive', (filter) => filter.isFilterActive === true) activeFilters;

    /**
     * Computed property that determines if any filters are set.
     *
     * @memberof FiltersPickerComponent
     */
    @gt('activeFilters.length', 0) hasFilters;

    /**
     * Creates an instance of FiltersPickerComponent.
     * @memberof FiltersPickerComponent
     */
    constructor() {
        super(...arguments);
        this.updateFilters();
    }

    /**
     * Creates and updates filters via map
     *
     * @param {null|Function} onColumn
     * @memberof FiltersPickerComponent
     */
    @action updateFilters(onColumn) {
        this.filters = this.args.columns
            .filter((column) => column.filterable)
            .map((column, trueIndex) => {
                // add true index to column
                column = { ...column, trueIndex };

                // set the column param
                column.param = column.filterParam ?? column.valuePath;

                // get the active param if any and update filter
                const activeParam = getUrlParam(column.param);

                // update if an activeParam exists
                if (activeParam) {
                    column.isFilterActive = true;

                    if (isArray(activeParam) && activeParam.length === 0) {
                        column.isFilterActive = false;
                    }

                    column.filterValue = activeParam;
                }

                // callback to modify column from hook
                if (typeof onColumn === 'function') {
                    onColumn(column, trueIndex, activeParam);
                }

                return column;
            });

        return this;
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

    /**
     * Updates an individual filter/column value.
     *
     * @param {String} key
     * @param {*} value
     * @memberof FiltersPickerComponent
     */
    @action updateFilterValue({ param }, value) {
        const { onChange } = this.args;

        // run `onChange()` callback
        if (typeof onChange === 'function') {
            onChange(param, value);
        }
    }

    /**
     * Callback to clear a single filter/column value.
     *
     * @param {String} key
     * @memberof FiltersPickerComponent
     */
    @action clearFilterValue({ param }) {
        const { onFilterClear } = this.args;

        // update filters
        this.updateFilters((column) => {
            if (column.param !== param) {
                return;
            }

            // clear column values
            set(column, 'filterValue', undefined);
            set(column, 'isFilterActive', false);
        });

        // run `onFilterClear()` callback
        if (typeof onFilterClear === 'function') {
            onFilterClear(param);
        }
    }

    /**
     * Used to clear all filter/column values and URL params.
     *
     * @memberof FiltersPickerComponent
     */
    @action clearFilters() {
        const { onClear } = this.args;
        const currentRouteName = this.hostRouter.currentRouteName;
        const currentQueryParams = { ...this.hostRouter.currentRoute.queryParams };

        // update filters
        this.updateFilters((column) => {
            const paramKey = column.filterParam ?? column.valuePath;
            delete currentQueryParams[paramKey];
            delete currentQueryParams[`${paramKey}[]`];

            // reset column values
            set(column, 'filterValue', undefined);
            set(column, 'isFilterActive', false);
        });

        // transition to cleared params with router service
        this.hostRouter.transitionTo(currentRouteName, { queryParams: currentQueryParams });

        // run `onClear()` callback
        if (typeof onClear === 'function') {
            onClear(...arguments);
        }
    }
}
