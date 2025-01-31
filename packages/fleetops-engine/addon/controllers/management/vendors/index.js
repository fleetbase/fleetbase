import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';
import getVendorStatusOptions from '../../../utils/get-vendor-status-options';

export default class ManagementVendorsIndexController extends BaseController {
    @service notifications;
    @service modalsManager;
    @service intl;
    @service crud;
    @service store;
    @service filters;
    @service hostRouter;
    @service fetch;

    /**
     * Queryable parameters for this controller's model
     *
     * @var {Array}
     */
    queryParams = ['page', 'limit', 'sort', 'query', 'public_id', 'internal_id', 'created_by', 'updated_by', 'status', 'name', 'email', 'phone', 'type', 'country', 'address', 'website_url'];

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
     * The param to sort the data on, the param with prepended `-` is descending
     *
     * @var {String}
     */
    @tracked sort = '-created_at';

    /**
     * The filterable param `public_id`
     *
     * @var {String}
     */
    @tracked public_id;

    /**
     * The filterable param `internal_id`
     *
     * @var {String}
     */
    @tracked internal_id;

    /**
     * The filterable param `status`
     *
     * @var {Array}
     */
    @tracked status;

    /**
     * The filterable param `type`
     *
     * @var {Array|String}
     */
    @tracked type;

    /**
     * The filterable param `name`
     *
     * @var {String}
     */
    @tracked name;

    /**
     * The filterable param `website_url`
     *
     * @var {String}
     */
    @tracked website_url;

    /**
     * The filterable param `phone`
     *
     * @var {String}
     */
    @tracked phone;

    /**
     * The filterable param `email`
     *
     * @var {String}
     */
    @tracked email;

    /**
     * The filterable param `country`
     *
     * @var {String}
     */
    @tracked country;

    /**
     * Rows for the table
     *
     * @var {Array}
     */
    @tracked rows = [];

    /**
     * All columns for the table
     *
     * @var {Array}
     */
    @tracked columns = [
        {
            label: this.intl.t('fleet-ops.common.name'),
            valuePath: 'name',
            width: '190px',
            cellComponent: 'table/cell/media-name',
            mediaPath: 'logo_url',
            action: this.viewVendor,
            permission: 'fleet-ops view vendor',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.id'),
            valuePath: 'public_id',
            cellComponent: 'click-to-copy',
            width: '110px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.internal-id'),
            valuePath: 'internal_id',
            cellComponent: 'click-to-copy',
            width: '100px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.email'),
            valuePath: 'email',
            cellComponent: 'click-to-copy',
            width: '80px',
            resizable: true,
            sortable: true,
            hidden: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.website-url'),
            valuePath: 'website_url',
            cellComponent: 'click-to-copy',
            width: '80px',
            resizable: true,
            sortable: true,
            hidden: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.phone'),
            valuePath: 'phone',
            cellComponent: 'click-to-copy',
            width: '80px',
            resizable: true,
            sortable: true,
            hidden: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.address'),
            valuePath: 'address',
            cellComponent: 'table/cell/anchor',
            action: this.viewVendorPlace,
            width: '170px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterParam: 'address',
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.type'),
            valuePath: 'prettyType',
            humanize: true,
            width: '150px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterParam: 'type',
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.country'),
            valuePath: 'country',
            cellComponent: 'table/cell/base',
            cellClassNames: 'uppercase',
            width: '120px',
            resizable: true,
            sortable: true,
            filterable: true,
            hidden: true,
            filterComponent: 'filter/country',
            filterParam: 'country',
        },
        {
            label: this.intl.t('fleet-ops.common.created-at'),
            valuePath: 'createdAt',
            sortParam: 'created_at',
            width: '170px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/date',
        },
        {
            label: this.intl.t('fleet-ops.common.updated-at'),
            valuePath: 'updatedAt',
            sortParam: 'updated_at',
            width: '170px',
            resizable: true,
            sortable: true,
            hidden: true,
            filterable: true,
            filterComponent: 'filter/date',
        },
        {
            label: this.intl.t('fleet-ops.common.status'),
            valuePath: 'status',
            cellComponent: 'table/cell/status',
            width: '100px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/multi-option',
            filterOptions: getVendorStatusOptions(),
        },
        {
            label: '',
            cellComponent: 'table/cell/dropdown',
            ddButtonText: false,
            ddButtonIcon: 'ellipsis-h',
            ddButtonIconPrefix: 'fas',
            ddMenuLabel: 'Vendor Actions',
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            width: '7%',
            actions: [
                {
                    label: this.intl.t('fleet-ops.management.vendors.index.view-vendor'),
                    fn: this.viewVendor,
                    permission: 'fleet-ops view vendor',
                },
                {
                    label: this.intl.t('fleet-ops.management.vendors.index.edit-vendor'),
                    fn: this.editVendor,
                    permission: 'fleet-ops update vendor',
                },
                {
                    separator: true,
                },
                {
                    label: this.intl.t('fleet-ops.management.vendors.index.delete-vendor'),
                    fn: this.deleteVendor,
                    permission: 'fleet-ops delete vendor',
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
     * Toggles dialog to export `vendor`
     *
     * @void
     */
    @action exportVendors() {
        const selections = this.table.selectedRows.map((_) => _.id);
        this.crud.export('vendor', { params: { selections } });
    }

    /**
     * View a `vendor` details in modal
     *
     * @param {VendorModel} vendor
     * @void
     */
    @action viewVendor(vendor) {
        return this.transitionToRoute('management.vendors.index.details', vendor);
    }

    /**
     * Reload layout view.
     */
    @action reload() {
        return this.hostRouter.refresh();
    }

    /**
     * Create a new `vendor` in modal
     *
     * @void
     */
    @action async createVendor() {
        return this.transitionToRoute('management.vendors.index.new');
    }

    /**
     * Edit a `vendor` details
     *
     * @param {VendorModel} vendor
     * @void
     */
    @action editVendor(vendor) {
        return this.transitionToRoute('management.vendors.index.edit', vendor);
    }

    /**
     * Delete a `vendor` via confirm prompt
     *
     * @param {VendorModel} vendor
     * @param {Object} options
     * @void
     */
    @action deleteVendor(vendor, options = {}) {
        this.crud.delete(vendor, {
            acceptButtonIcon: 'trash',
            onSuccess: () => {
                return this.hostRouter.refresh();
            },
            ...options,
        });
    }

    /**
     * Bulk deletes selected `vendor` via confirm prompt
     *
     * @param {Array} selected an array of selected models
     * @void
     */
    @action bulkDeleteVendors() {
        const selected = this.table.selectedRows;

        this.crud.bulkDelete(selected, {
            modelNamePath: `name`,
            acceptButtonText: this.intl.t('fleet-ops.management.vendors.index.delete-button'),
            onSuccess: async () => {
                await this.hostRouter.refresh();
                this.table.untoggleSelectAll();
            },
        });
    }

    /**
     * View information about the vendors place
     *
     * @param {VendorModel} vendor
     * @void
     */
    @action async viewVendorPlace(vendor) {
        const place = await this.store.findRecord('place', vendor.place_uuid);

        if (place) {
            this.contextPanel.focus(place);
        }
    }

    /**
     * Handles and prompts for spreadsheet imports of vendors.
     *
     * @void
     */
    @action importVendors() {
        this.crud.import('vendor', {
            onImportCompleted: () => {
                this.hostRouter.refresh();
            },
        });
    }

    /**
     * Edit a vendor's current place
     *
     * @param {VendorModel} vendor
     * @void
     */
    @action async editVendorPlace(vendor) {
        const place = await this.store.findRecord('place', vendor.place_uuid);

        if (place) {
            this.contextPanel.focus(place, 'editing');
        }
    }

    /**
     * Create a new place for a vendor.
     *
     * @param {VendorModel} vendor
     * @void
     */
    @action async createVendorPlace(vendor) {
        const place = this.store.createRecord('place');

        this.contextPanel.focus(place, 'editing', {
            onAfterSave: async (place) => {
                vendor.set('place_uuid', place.id);
                try {
                    await vendor.save();
                } catch (error) {
                    this.notifications.serverError(error);
                }
            },
        });
    }
}
