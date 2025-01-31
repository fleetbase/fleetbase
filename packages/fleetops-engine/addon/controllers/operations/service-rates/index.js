import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';

export default class OperationsServiceRatesIndexController extends BaseController {
    @service store;
    @service currentUser;
    @service intl;
    @service fetch;
    @service filters;
    @service crud;
    @service notifications;
    @service modalsManager;
    @service hostRouter;
    @service loader;

    /**
     * The current page of data being viewed
     *
     * @var {Integer}
     */
    @tracked page = 1;

    /**
     * The maximum number of items to show per page
     *
     * @var {Integer}
     */
    @tracked limit;

    /**
     * The search query
     *
     * @var {String}
     */
    @tracked query;

    /**
     * The param to sort the data on, the param with prepended `-` is descending
     *
     * @var {String}
     */
    @tracked sort = '-created_at';

    /**
     * Queryable parameters for this controller's model
     *
     * @var {Array}
     */
    queryParams = ['page', 'query', 'limit', 'sort', 'zone', 'service_area'];

    /**
     * All columns applicable for orders
     *
     * @var {Array}
     */
    @tracked columns = [
        {
            label: this.intl.t('fleet-ops.common.id'),
            valuePath: 'public_id',
            width: '150px',
            cellComponent: 'table/cell/anchor',
            permission: 'fleet-ops view service-rate',
            onClick: this.editServiceRate,
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.service'),
            valuePath: 'service_name',
            cellComponent: 'table/cell/base',
            width: '125px',
            resizable: true,
            sortable: true,
            filterable: false,
        },
        {
            label: this.intl.t('fleet-ops.common.service-area'),
            valuePath: 'service_area.name',
            cellComponent: 'table/cell/base',
            width: '125px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/model',
            filterComponentPlaceholder: 'Select service area',
            filterParam: 'service_area',
            model: 'service-area',
        },
        {
            label: this.intl.t('fleet-ops.common.zone'),
            valuePath: 'zone.name',
            cellComponent: 'table/cell/base',
            width: '125px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/model',
            filterComponentPlaceholder: 'Select zone',
            filterParam: 'zone',
            model: 'zone',
        },
        {
            label: this.intl.t('fleet-ops.common.created-at'),
            valuePath: 'createdAt',
            sortParam: 'created_at',
            width: '125px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/date',
        },
        {
            label: this.intl.t('fleet-ops.common.updated-at'),
            valuePath: 'updatedAt',
            sortParam: 'updated_at',
            width: '125px',
            resizable: true,
            sortable: true,
            hidden: true,
            filterable: true,
            filterComponent: 'filter/date',
        },
        {
            label: '',
            cellComponent: 'table/cell/dropdown',
            ddButtonText: false,
            ddButtonIcon: 'ellipsis-h',
            ddButtonIconPrefix: 'fas',
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            width: '10%',
            actions: [
                {
                    label: this.intl.t('fleet-ops.operations.service-rates.index.edit-service'),
                    fn: this.editServiceRate,
                    permission: 'fleet-ops view service-rate',
                },
                {
                    label: this.intl.t('fleet-ops.operations.service-rates.index.delete-service'),
                    fn: this.deleteServiceRate,
                    permission: 'fleet-ops delete service-rate',
                },
            ],
            sortable: false,
            filterable: false,
            resizable: false,
            searchable: false,
        },
    ];

    /**
     * The search task.
     *
     * @void
     */
    @task({ restartable: true }) *search({ target: { value } }) {
        // if no query don't search
        if (isBlank(value)) {
            this.query = null;
            return;
        }

        // timeout for typing
        yield timeout(250);

        // reset page for results
        if (this.page > 1) {
            this.page = 1;
        }

        // update the query param
        this.query = value;
    }

    /**
     * Reload layout view.
     */
    @action reload() {
        return this.hostRouter.refresh();
    }

    /**
     * Toggles dialog to export `service-rate`
     *
     * @memberof OperationsServiceRatesIndexController
     * @void
     */
    @action exportServiceRates() {
        const selections = this.table.selectedRows.map((_) => _.id);
        this.crud.export('service-rate', { params: { selections } });
    }

    /**
     * Transition to service rate edit route.
     *
     * @param {ServiceRateModel} serviceRate
     * @memberof OperationsServiceRatesIndexController
     */
    @action editServiceRate(serviceRate) {
        this.transitionToRoute('operations.service-rates.index.edit', serviceRate);
    }

    /**
     * Delete a `service-rate` via confirm prompt
     *
     * @param {ServiceRateModel} serviceRate
     * @param {Object} options
     * @void
     */
    @action deleteServiceRate(serviceRate, options = {}) {
        this.crud.delete(serviceRate, {
            onSuccess: () => {
                return this.hostRouter.refresh();
            },
            ...options,
        });
    }

    /**
     * Bulk deletes selected `service rates` via confirm prompt
     *
     * @void
     */
    @action bulkDeleteServiceRates() {
        const selected = this.table.selectedRows;

        this.crud.bulkDelete(selected, {
            modelNamePath: `public_id`,
            acceptButtonText: this.intl.t('fleet-ops.operations.service-rates.index.accept-button'),
            onSuccess: async () => {
                await this.hostRouter.refresh();
                this.table.untoggleSelectAll();
            },
        });
    }
}
