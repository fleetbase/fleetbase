import ManagementContactsIndexController from './index';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class ManagementContactsCustomersController extends ManagementContactsIndexController {
    /**
     * All columns applicable for customers
     *
     * @var {Array}
     */
    @tracked columns = [
        {
            label: this.intl.t('fleet-ops.common.name'),
            valuePath: 'name',
            width: '140px',
            cellComponent: 'table/cell/media-name',
            action: this.viewCustomer,
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
            label: this.intl.t('fleet-ops.management.contacts.customers.created'),
            valuePath: 'createdAt',
            sortParam: 'created_at',
            width: '160px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/date',
        },
        {
            label: this.intl.t('fleet-ops.management.contacts.customers.updated'),
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
            ddMenuLabel: 'Customer Actions',
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            width: '9%',
            actions: [
                {
                    label: this.intl.t('fleet-ops.management.contacts.customers.view-customer'),
                    fn: this.viewCustomer,
                    permission: 'fleet-ops view contact',
                },
                {
                    label: this.intl.t('fleet-ops.management.contacts.customers.edit-customer'),
                    fn: this.editCustomer,
                    permission: 'fleet-ops update contact',
                },
                {
                    separator: true,
                },
                {
                    label: this.intl.t('fleet-ops.management.contacts.customers.delete-customer'),
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
     * View a `customer` details in modal
     *
     * @param {ContactModel} customers
     * @void
     */
    @action viewCustomer(customer) {
        return this.transitionToRoute('management.contacts.customers.details', customer);
    }

    /**
     * Create a new `customer` in modal
     *
     * @void
     */
    @action createCustomer() {
        return this.transitionToRoute('management.contacts.customers.new');
    }

    /**
     * Edit a `customer` details
     *
     * @param {ContactModel} customer
     * @void
     */
    @action editCustomer(customer) {
        return this.transitionToRoute('management.contacts.customers.edit', customer);
    }
}
