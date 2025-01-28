import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';

export default class ManagementContactsIndexController extends BaseController {
    @service store;
    @service notifications;
    @service intl;
    @service modalsManager;
    @service hostRouter;
    @service crud;
    @service filters;
    @service contextPanel;
    @service fetch;

    /**
     * Queryable parameters for this controller's model
     *
     * @var {Array}
     */
    queryParams = ['page', 'limit', 'sort', 'query', 'public_id', 'internal_id', 'created_by', 'updated_by', 'status', 'title', 'email', 'phone'];

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
     * The filterable param `title`
     *
     * @var {String}
     */
    @tracked title;

    /**
     * The filterable param `email`
     *
     * @var {String}
     */
    @tracked email;

    /**
     * The filterable param `phone`
     *
     * @var {String}
     */
    @tracked phone;

    /**
     * The filterable param `status`
     *
     * @var {Array}
     */
    @tracked status;

    /**
     * All columns applicable for contacts
     *
     * @var {Array}
     */
    @tracked columns = [
        {
            label: this.intl.t('fleet-ops.common.name'),
            valuePath: 'name',
            width: '140px',
            cellComponent: 'table/cell/media-name',
            action: this.viewContact,
            permission: 'fleet-ops view contact',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.id'),
            valuePath: 'public_id',
            cellComponent: 'click-to-copy',
            width: '120px',
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
            label: this.intl.t('fleet-ops.common.title'),
            valuePath: 'title',
            cellComponent: 'click-to-copy',
            width: '80px',
            resizable: true,
            sortable: true,
            filterable: true,
            hidden: true,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.email'),
            valuePath: 'email',
            cellComponent: 'click-to-copy',
            width: '150px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.phone'),
            valuePath: 'phone',
            cellComponent: 'click-to-copy',
            width: '130px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.address'),
            valuePath: 'address',
            cellComponent: 'table/cell/anchor',
            action: this.viewContactPlace,
            width: '170px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterParam: 'address',
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.management.contacts.index.created'),
            valuePath: 'createdAt',
            sortParam: 'created_at',
            width: '160px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/date',
        },
        {
            label: this.intl.t('fleet-ops.management.contacts.index.updated'),
            valuePath: 'updatedAt',
            sortParam: 'updated_at',
            width: '130px',
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
            ddMenuLabel: 'Contact Actions',
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            width: '9%',
            actions: [
                {
                    label: this.intl.t('fleet-ops.management.contacts.index.view-contact'),
                    fn: this.viewContact,
                    permission: 'fleet-ops view contact',
                },
                {
                    label: this.intl.t('fleet-ops.management.contacts.index.edit-contact'),
                    fn: this.editContact,
                    permission: 'fleet-ops update contact',
                },
                {
                    separator: true,
                },
                {
                    label: this.intl.t('fleet-ops.management.contacts.index.delete-contact'),
                    fn: this.deleteContact,
                    permission: 'fleet-ops delete contact',
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
     * Toggles dialog to export `contact`
     *
     * @void
     */
    @action exportContacts() {
        const selections = this.table.selectedRows.map((_) => _.id);
        this.crud.export('contact', { params: { selections } });
    }

    /**
     * View a `contact` details in modal
     *
     * @param {ContactModel} contact
     * @void
     */
    @action viewContact(contact) {
        return this.transitionToRoute('management.contacts.index.details', contact);
    }

    /**
     * View information about the contacts place
     *
     * @param {ContactModel} contact
     * @void
     */
    @action async viewContactPlace(contact) {
        const place = await this.store.findRecord('place', contact.place_uuid);

        if (place) {
            this.contextPanel.focus(place);
        }
    }

    /**
     * Create a new `contact` in modal
     *
     * @void
     */
    @action createContact() {
        return this.transitionToRoute('management.contacts.index.new');
    }

    /**
     * Edit a `contact` details
     *
     * @param {ContactModel} contact
     * @void
     */
    @action editContact(contact) {
        return this.transitionToRoute('management.contacts.index.edit', contact);
    }

    /**
     * Delete a `contact` via confirm prompt
     *
     * @param {ContactModel} contact
     * @param {Object} options
     * @void
     */
    @action deleteContact(contact, options = {}) {
        this.crud.delete(contact, {
            acceptButtonIcon: 'trash',
            onConfirm: () => {
                this.hostRouter.refresh();
            },
            ...options,
        });
    }

    /**
     * Handles and prompts for spreadsheet imports of contacts.
     *
     * @void
     */
    @action importContacts() {
        this.crud.import('contact', {
            onImportCompleted: () => {
                this.hostRouter.refresh();
            },
        });
    }

    /**
     * Bulk deletes selected `contacts` via confirm prompt
     *
     * @param {Array} selected an array of selected models
     * @void
     */
    @action bulkDeleteContacts() {
        const selected = this.table.selectedRows;

        this.crud.bulkDelete(selected, {
            modelNamePath: `name`,
            acceptButtonText: this.intl.t('fleet-ops.management.contacts.index.delete-button'),
            onSuccess: async () => {
                await this.hostRouter.refresh();
                this.table.untoggleSelectAll();
            },
        });
    }
}
