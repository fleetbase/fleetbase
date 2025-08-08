import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { timeout, task } from 'ember-concurrency';
import { driver } from 'driver.js';
import { later } from '@ember/runloop';
import 'driver.js/dist/driver.css';

export default class RolesIndexController extends Controller {
    @service store;
    @service intl;
    @service notifications;
    @service currentUser;
    @service modalsManager;
    @service hostRouter;
    @service filters;
    @service crud;
    @service fetch;
    @service abilities;
    @service iam;

    /**
     * Queryable parameters for this controller's model
     *
     * @var {Array}
     */
    queryParams = ['page', 'limit', 'sort', 'query', 'service', 'type'];

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
     * The search query param
     *
     * @var {Integer}
     */
    @tracked query;

    /**
     * The param to sort the data on, the param with prepended `-` is descending
     *
     * @var {String}
     */
    @tracked sort = '-created_at';

    /**
     * All services for roles.
     *
     * @memberof RolesIndexController
     */
    @tracked services = [];

    /**
     * All types of roles.
     *
     * @memberof RolesIndexController
     */
    
     // @tracked types = this.iam.schemeTypes;
    @tracked types = this.iam.schemeTypes.map(type => ({
        id: type.id,
        label: type.name // Ensure 'name' is mapped to 'label'
    }));

    get typeFilterOptions() {
        return [
            { id: 'flb-managed', label: this.intl.t('statuses.flb-managed'), value: 'flb-managed' },
            { id: 'org-managed', label: this.intl.t('statuses.org-managed'), value: 'org-managed' }
        ];
    }

    /**
     * All columns applicable for roles
     *
     * @var {Array}
     */
    @tracked columns = [
        {
            label: this.intl.t('iam.common.name'),
            valuePath: 'name',
            cellComponent: 'table/cell/anchor',
            permission: 'iam view role',
            onClick: this.editRole,
            width: '20%',
            sortable: false,
        },
        {
            label: this.intl.t('iam.common.description'),
            valuePath: 'description',
            sortable: false,
            width: '28%',
        },
        {
            label: this.intl.t('iam.common.service'),
            valuePath: 'service',
            sortable: false,
            width: '12%',
            filterable: true,
            filterComponent: 'filter/select',
            filterOptions: this.services,
        },
        // {
        //     label: this.intl.t('iam.common.type'),
        //     valuePath: 'type',
        //     sortable: false,
        //     width: '13%',
        //     filterable: true,
        //     filterComponent: 'filter/select',
        //     filterOptionLabel: 'label',
        //     filterOptionValue: 'id',
        //     filterOptions: this.types,
        // },
        // In your RolesIndexController columns array
        {
            label: this.intl.t('iam.common.type'),
            valuePath: 'type',
            sortable: false,
            width: '13%',
            filterable: true,
            filterComponent: 'filter/select',
            filterOptionLabel: 'label',
            filterOptionValue: 'id',
            filterOptions: this.typeFilterOptions,
            formatter: (cell, row) => {
                let normalizedValue;
        
                if (cell === 'organization managed' || cell === 'Organization managed' || cell === 'Organization Managed') {
                    normalizedValue = 'org-managed';
                } else if (cell === 'flb managed' || cell === 'Flb managed' || cell === 'FLB managed' || cell === 'FLB Managed') {
                    normalizedValue = 'flb-managed';
                } else {
                    normalizedValue = cell;
                }
                
                return this.intl.t(`statuses.${normalizedValue}`);
            }
        },
        {
            label: this.intl.t('iam.common.create'),
            valuePath: 'createdAt',
            sortable: false,
            width: '12%',
            tooltip: true,
            cellClassNames: 'overflow-visible',
        },
        {
            label: '',
            cellComponent: 'table/cell/dropdown',
            ddButtonText: false,
            ddButtonIcon: 'ellipsis-h',
            ddButtonIconPrefix: 'fas',
            ddMenuLabel: this.intl.t('iam.roles.index.role-actions'),
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            width: '15%',
            actions: [
                {
                    label: this.intl.t('iam.roles.index.edit-role'),
                    fn: this.editRole,
                    permission: 'iam view role',
                },
                {
                    label: this.intl.t('iam.roles.index.delete-role'),
                    fn: this.deleteRole,
                    className: 'text-red-700 hover:text-red-800',
                    permission: 'iam delete role',
                },
            ],
        },
    ];

    /**
     * Creates an instance of RolesIndexController.
     * @memberof RolesIndexController
     */
    constructor() {
        super(...arguments);
        this.iam.getServices.perform({
            onSuccess: (services) => {
                this.services = services;
            },
        });
    }

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
     * Bulk deletes selected `role` via confirm prompt
     *
     * @param {Array} selected an array of selected models
     * @void
     */
    @action bulkDeleteRoles() {
        const selected = this.table.selectedRows;

        this.crud.bulkDelete(selected, {
            modelNamePath: `name`,
            acceptButtonText: this.intl.t('iam.roles.index.delete-roles'),
            onSuccess: () => {
                return this.hostRouter.refresh();
            },
        });
    }

    /**
     * Toggles dialog to create a new Role
     *
     * @void
     */
    @action createRole() {
        const formPermission = 'iam create role';
        const role = this.store.createRecord('role', { is_mutable: true });

        this.editRole(role, {
            title: this.intl.t('iam.roles.index.new-role'),
            modalClass: 'create-role-modal',
            acceptButtonText: this.intl.t('common.confirm'),
            acceptButtonIcon: 'check',
            acceptButtonDisabled: this.abilities.cannot(formPermission),
            acceptButtonHelpText: this.abilities.cannot(formPermission) ? this.intl.t('common.unauthorized') : null,
            formPermission,
            keepOpen: true,
            confirm: async (modal) => {
                modal.startLoading();

                if (!role.name || typeof role.name !== 'string') {
                    modal.stopLoading();
                    return this.notifications.warning('Role name is required.');
                }

                const roleName = role.name.toLowerCase();
                if (roleName === 'administrator' || roleName.startsWith('admin')) {
                    modal.stopLoading();
                    return this.notifications.error('Creating a role with name "Administrator" or a role name that starts with "Admin" is prohibited, as the name is system reserved.');
                }

                if (this.abilities.cannot(formPermission)) {
                    modal.stopLoading();
                    return this.notifications.warning(this.intl.t('common.permissions-required-for-changes'));
                }

                try {
                    await role.save();
                    this.notifications.success(this.intl.t('iam.roles.index.new-role-create'));
                    modal.done();
                    return this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * Toggles dialog to edit a Role
     *
     * @void
     */
    @action editRole(role, options = {}) {
        if (!role.is_mutable) {
            return this.viewRolePermissions(role);
        }

        const formPermission = 'iam update role';
        this.modalsManager.show('modals/role-form', {
            title: this.intl.t('iam.roles.index.edit-role-title'),
            acceptButtonText: this.intl.t('common.save-changes'),
            acceptButtonIcon: 'save',
            acceptButtonDisabled: this.abilities.cannot(formPermission),
            acceptButtonHelpText: this.abilities.cannot(formPermission) ? this.intl.t('common.unauthorized') : null,
            keepOpen: true,
            formPermission,
            role,
            setPermissions: (permissions) => {
                role.permissions = permissions;
            },
            confirm: async (modal) => {
                modal.startLoading();

                if (!role.name || typeof role.name !== 'string') {
                    modal.stopLoading();
                    return this.notifications.warning('Role name is required.');
                }

                const roleName = role.name.toLowerCase();
                if (roleName === 'administrator' || roleName.startsWith('admin')) {
                    modal.stopLoading();
                    return this.notifications.error('Creating a role with name "Administrator" or a role name that starts with "Admin" is prohibited, as the name is system reserved.');
                }

                if (this.abilities.cannot(formPermission)) {
                    modal.stopLoading();
                    return this.notifications.warning(this.intl.t('common.permissions-required-for-changes'));
                }

                try {
                    await role.save();
                    this.notifications.success(this.intl.t('iam.roles.index.changes-role-saved'));
                    modal.done();
                    return this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
            ...options,
        });
    }

    /**
     * Toggles dialog to delete Role
     *
     * @void
     */
    @action deleteRole(role) {
        if (!role.is_deletable) {
            return this.notifications.warning(this.intl.t('iam.roles.index.unable-delete-role-warning', { roleType: role.type }));
        }

        this.modalsManager.confirm({
            title: `Delete (${role.name || 'Untitled'}) role`,
            body: this.intl.t('iam.roles.index.data-assosciated-this-role-deleted'),
            confirm: async (modal) => {
                modal.startLoading();
                try {
                    await role.destroyRecord();
                    this.notifications.success(this.intl.t('iam.roles.index.role-deleted', { roleName: role.name }));
                    return this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * View role permissions
     *
     * @param {RoleModel} role
     * @memberof RolesIndexController
     */
    @action viewRolePermissions(role) {
        this.modalsManager.show('modals/view-role-permissions', {
            title: this.intl.t('iam.components.modals.view-role-permissions.view-permissions', { roleName: role.name }),
            hideDeclineButton: true,
            acceptButtonText: this.intl.t('common.done'),
            role,
        });
    }

    /**
     * Toggles dialog to export roles
     *
     * @void
     */
    @action exportRoles() {
        this.crud.export('role');
    }

    /**
     * Reload data.
     */
    @action reload() {
        return this.hostRouter.refresh();
    }

    @action CreateRoleTour() {
    const driverObj = driver({
      showProgress: true,
      nextBtnText: this.intl.t('fleetbase.common.next'),
      prevBtnText: this.intl.t('fleetbase.common.previous'),
      doneBtnText: this.intl.t('fleetbase.common.done'),
      closeBtnText: this.intl.t('fleetbase.common.close'),
      allowClose: false,
      disableActiveInteraction: true,
        onPopoverRender: (popover) => {
            const closeBtn = popover.wrapper.querySelector('.driver-popover-close-btn');
            if (closeBtn) {
                closeBtn.style.display = 'inline-block';
            }
        },
      steps: [
        {
          element: '.create-role-button',
          onHighlightStarted: (element) => {
            element.style.setProperty('pointer-events', 'none', 'important');
            element.disabled = true;
          },
          onDeselected: (element) => {
            element.style.pointerEvents = 'auto';
            element.disabled = false;
          },
          popover: {
            title: this.intl.t('fleetbase.roles.tour.new_button.title'),
            description: this.intl.t('fleetbase.roles.tour.new_button.description', { htmlSafe: true }),
            onNextClick: () => {
              this.createRole();
 
               const checkModal = setInterval(() => {
            const modal = document.querySelector('.create-role-modal');
            if (modal && modal.classList.contains('show')) {
            clearInterval(checkModal);
            driverObj.moveNext(); // Move to the next step
            }
        }, 100);
            },
          },
        },
        {   
          element: '.create-role-modal .input-group:has(.role-name)',
          popover: {
            title: this.intl.t('fleetbase.roles.tour.name_field.title'),
            description: this.intl.t('fleetbase.roles.tour.name_field.description', { htmlSafe: true }),
           
          },
        },
        {
          element: '.create-role-modal .input-group:has(.role-description)',
          popover: {
            title: this.intl.t('fleetbase.roles.tour.description_field.title'),
            description: this.intl.t('fleetbase.roles.tour.description_field.description', { htmlSafe: true }),
           
          },
        },
        {
          element: '.create-role-modal .input-group:has(.policy-attacher)',
          popover: {
            title: this.intl.t('fleetbase.roles.tour.policies_field.title'),
            description: this.intl.t('fleetbase.roles.tour.policies_field.description', { htmlSafe: true }),
           
          },
        },
        {
          element: '.create-role-modal .input-group:has(.permissions-picker)',
          popover: {
            title: this.intl.t('fleetbase.roles.tour.permissions_field.title'),
            description: this.intl.t('fleetbase.roles.tour.permissions_field.description', { htmlSafe: true }),
           
          },
        },
        {
          element: '.create-role-modal .btn-primary',
          popover: {
            title: this.intl.t('fleetbase.roles.tour.submit.title'),
            description: this.intl.t('fleetbase.roles.tour.submit.description', { htmlSafe: true }),
           
          },
        },
      ],
    });

    driverObj.drive();
  }
}
