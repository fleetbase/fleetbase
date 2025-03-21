import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action, set } from '@ember/object';
import { equal } from '@ember/object/computed';
import { isArray } from '@ember/array';
import { isBlank } from '@ember/utils';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';
import fromStore from '@fleetbase/ember-core/decorators/from-store';

export default class OperationsOrdersIndexController extends BaseController {
    @service currentUser;
    @service fetch;
    @service intl;
    @service filters;
    @service hostRouter;
    @service notifications;
    @service modalsManager;
    @service crud;
    @service universe;
    @service socket;
    @service abilities;
    @service session;
    /**
     * Queryable parameters for this controller's model
     *
     * @var {Array}
     */
    queryParams = [
        'page',
        'limit',
        'sort',
        'query',
        'public_id',
        'internal_id',
        'payload',
        'tracking_number',
        'facilitator',
        'customer',
        'driver',
        'vehicle',
        'pickup',
        'dropoff',
        'created_by',
        'updated_by',
        'status',
        'type',
        'layout',
        'drawerOpen',
        'drawerTab',
        'orderPanelOpen',
        'on'
    ];

    /**
     * The current driver being focused.
     *
     * @var {DriverModel|null}
     */
    @tracked focusedDriver;

    /**
     * The current vehicle being focused.
     *
     * @var {VehicleModel|null}
     */
    @tracked focusedVehicle;

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
     * The filterable param `tracking`
     *
     * @var {String}
     */
    @tracked tracking;

    /**
     * The filterable param `facilitator`
     *
     * @var {String}
     */
    @tracked facilitator;

    /**
     * The filterable param `customer`
     *
     * @var {String}
     */
    @tracked customer;

    /**
     * The filterable param `driver`
     *
     * @var {String}
     */
    @tracked driver;

    /**
     * The filterable param `vehicle`
     *
     * @var {String}
     */
    @tracked vehicle;

    /**
     * The filterable param `payload`
     *
     * @var {String}
     */
    @tracked payload;

    /**
     * The filterable param `pickup`
     *
     * @var {String}
     */
    @tracked pickup;

    /**
     * The filterable param `dropoff`
     *
     * @var {String}
     */
    @tracked dropoff;

    /**
     * The filterable param `updated_by`
     *
     * @var {String}
     */
    @tracked updated_by;

    /**
     * The filterable param `created_by`
     *
     * @var {String}
     */
    @tracked created_by;

    /**
     * The filterable param `status`
     *
     * @var {String}
     */
    @tracked status;

    /**
     * The filterable param `type` - Filter by order type
     *
     * @var {String}
     */
    @tracked type;

    /**
     * Flag to determine if the search is visible
     *
     * @type {Boolean}
     */
    @tracked isSearchVisible = false;

    /**
     * Flag to determine if the orders panel is visible
     *
     * @type {Boolean}
     */
    @tracked isOrdersPanelVisible = false;

    /**
     * Count of active orders
     *
     * @type {Number}
     */
    @tracked activeOrdersCount = 0;

    /**
     * The context for the order list overlay panel.
     *
     * @type {Object}
     */
    @tracked orderListOverlayContext;

    /**
     * Reference to the leaflet map object
     *
     * @type {Object}
     */
    @tracked leafletMap;

    /**
     * Reference to the drawer context API.
     *
     * @type {Object}
     */
    @tracked drawer;

    /**
     * Current layout type (e.g., 'map', 'table', 'kanban', 'analytics')
     *
     * @type {String}
     */
    @tracked layout = 'table';

    /**
     * Decides if scope drawer is open.
     *
     * @type {Boolean}
     */
    @tracked drawerOpen = 0;

    /**
     * The drawer tab that is active.
     *
     * @type {Boolean}
     */
    @tracked drawerTab;

    /**
     * Filterable status options for orders.
     *
     * @type {Array}
     */
    @tracked statusOptions = [];

    /**
     * Flag to determine if the layout is 'map'
     *
     * @type {Boolean}
     */
    @equal('layout', 'map') isMapLayout;

    /**
     * Flag to determine if the layout is 'table'
     *
     * @type {Boolean}
     */
    @equal('layout', 'table') isTableLayout;

    /**
     * Flag to determine if the view is 'kanban'
     *
     * @type {Boolean}
     */
    @equal('layout', 'kanban') isKanbanView;

    /**
     * Flag to determine if the layout is 'analytics'
     *
     * @type {Boolean}
     */
    @equal('layout', 'analytics') isAnalyticsLayout;

    /**
     * All available order configs.
     *
     * @memberof OperationsOrdersIndexController
     */
    @fromStore('order-config', { limit: -1 }) orderConfigs;

    /**
     * All columns applicable for orders
     *
     * @var {Array}
     */
    @tracked columns = [
        {
            label: this.intl.t('fleet-ops.common.id'),
            valuePath: 'public_id',
            width: '140px',
            cellComponent: 'table/cell/link-to',
            route: 'operations.orders.index.view',
            onLinkClick: this.viewOrder,
            permission: 'fleet-ops view order',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        // {
        //     label: this.intl.t('fleet-ops.common.internal-id'),
        //     valuePath: 'internal_id',
        //     cellComponent: 'click-to-copy',
        //     width: '125px',
        //     hidden: true,
        //     resizable: true,
        //     sortable: true,
        //     filterable: true,
        //     filterComponent: 'filter/string',
        // },
        // {
        //     label: this.intl.t('fleet-ops.operations.orders.index.payload'),
        //     valuePath: 'payload.public_id',
        //     cellComponent: 'click-to-copy',
        //     resizable: true,
        //     hidden: true,
        //     width: '125px',
        //     filterable: true,
        //     filterLabel: 'Payload ID',
        //     filterParam: 'payload',
        //     filterComponent: 'filter/string',
        // },
        {
            label: this.intl.t('fleet-ops.operations.orders.index.driver-assigned'),
            cellComponent: 'cell/driver-name',
            valuePath: 'driver_assigned',
            modelPath: 'driver_assigned',
            width: '210px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/model',
            filterComponentPlaceholder: 'Select driver for order',
            filterParam: 'driver',
            model: 'driver',
        },
        {
            label: this.intl.t('fleet-ops.operations.orders.index.pickup'),
            valuePath: 'pickupName',
            cellComponent: 'table/cell/base',
            width: '160px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/model',
            filterOptionLabel: 'address',
            filterComponentPlaceholder: 'Select pickup location',
            filterParam: 'pickup',
            modelNamePath: 'name',
            model: 'place',
        },
        {
            label: this.intl.t('fleet-ops.operations.orders.index.dropoff'),
            valuePath: 'dropoffName',
            cellComponent: 'table/cell/base',
            width: '160px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/model',
            filterComponentPlaceholder: 'Select dropoff location',
            filterParam: 'dropoff',
            modelNamePath: 'name',
            model: 'place',
        },
        {
            label: this.intl.t('fleet-ops.operations.orders.index.vehicle-assigned'),
            cellComponent: 'cell/vehicle-name',
            valuePath: 'vehicle_assigned.display_name',
            modelPath: 'vehicle_assigned',
            showOnlineIndicator: true,
            width: '170px',
            hidden: true,
            resizable: true,
            sortable: true,
            filterable: false,
            filterComponent: 'filter/model',
            filterComponentPlaceholder: 'Select vehicle for order',
            filterParam: 'vehicle',
            model: 'vehicle',
        },
        {
            label: this.intl.t('fleet-ops.common.schedule'),
            valuePath: 'scheduledAt',
            sortParam: 'scheduled_at',
            filterLabel: this.intl.t('fleet-ops.operations.orders.index.scheduled-at'),
            filterParam: 'on',
            width: '150px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/date',
        },
        {
            label: this.intl.t('fleet-ops.operations.orders.index.estimated-end-date'),
            valuePath: 'estimatedEndDate',
            sortParam: 'estimated-end-date',
            filterParam: 'estimated-end-date',
            width: '150px',
            resizable: true,
            sortable: true,
            filterable: false,
            filterComponent: 'filter/date',
        },
        // {
        //     label: this.intl.t('fleet-ops.operations.orders.index.items'),
        //     cellComponent: 'table/cell/base',
        //     valuePath: 'item_count',
        //     resizable: true,
        //     hidden: true,
        //     width: '50px',
        // },
        // {
        //     label: this.intl.t('fleet-ops.operations.orders.index.transaction'),
        //     cellComponent: 'table/cell/base',
        //     valuePath: 'transaction_amount',
        //     width: '50px',
        //     resizable: true,
        //     hidden: true,
        //     sortable: true,
        // },
        {
            label: this.intl.t('fleet-ops.operations.orders.index.tracking'),
            valuePath: 'tracking_number.tracking_number',
            cellComponent: 'click-to-copy',
            width: '170px',
            resizable: true,
            sortable: true,
            filterable: false,
            filterComponent: 'filter/string',
        },
        // {
        //     label: this.intl.t('fleet-ops.common.type'),
        //     valuePath: 'type',
        //     width: '100px',
        //     resizable: true,
        //     hidden: true,
        //     sortable: true,
        //     filterable: true,
        //     filterComponent: 'filter/select',
        //     filterOptions: this.orderConfigs,
        //     filterOptionLabel: 'name',
        //     filterOptionValue: 'id',
        //     filterComponentPlaceholder: 'Filter by order config',
        // },
        {
            label: this.intl.t('fleet-ops.common.status'),
            valuePath: 'status',
            cellComponent: 'table/cell/status',
            width: '150px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/select',
            filterOptions: this.statusOptions,
            filterOptionLabel: 'label', // Specify which property to use as the display label
            filterOptionValue: 'code',
        },
        {
            label: this.intl.t('fleet-ops.common.created-at'),
            valuePath: 'createdAt',
            sortParam: 'created_at',
            filterParam: 'created_at',
            width: '140px',
            resizable: true,
            sortable: true,
            filterable: false,
            filterComponent: 'filter/date',
        },
        {
            label: this.intl.t('fleet-ops.common.updated-at'),
            valuePath: 'updatedAtShort',
            sortParam: 'updated_at',
            filterParam: 'updated_at',
            width: '125px',
            resizable: true,
            sortable: true,
            hidden: true,
            filterable: false,
            filterComponent: 'filter/date',
        },
        {
            label: this.intl.t('fleet-ops.operations.orders.index.created-by'),
            valuePath: 'created_by_name',
            modelPath: 'created_by_name',
            width: '125px',
            resizable: true,
            hidden: true,
            filterable: false,
            filterComponent: 'filter/model',
            filterComponentPlaceholder: 'Select user',
            filterParam: 'created_by',
            model: 'user',
        },
        {
            label: this.intl.t('fleet-ops.operations.orders.index.updated-by'),
            valuePath: 'updated_by_name',
            modelPath: 'updated_by_name',
            width: '125px',
            resizable: true,
            hidden: true,
            filterable: false,
            filterComponent: 'filter/model',
            filterComponentPlaceholder: 'Select user',
            filterParam: 'updated_by',
            model: 'user',
        },
        {
            label: '',
            cellComponent: 'table/cell/dropdown',
            ddButtonText: false,
            ddButtonIcon: 'ellipsis-h',
            ddButtonIconPrefix: 'fas',
            ddMenuLabel: 'Order Actions',
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            width: '12%',
            actions: [
                {
                    label: this.intl.t('fleet-ops.operations.orders.index.view-order'),
                    icon: 'eye',
                    fn: this.viewOrder,
                    permission: 'fleet-ops view order',
                },
                {
                    label: this.intl.t('fleet-ops.operations.orders.index.dispatch-order'),
                    icon: 'paper-plane',
                    fn: this.dispatchOrder,
                    permission: 'fleet-ops dispatch order',
                    isVisible: (order) => order.canBeDispatched,
                },
                // {
                //     label: this.intl.t('fleet-ops.operations.orders.index.cancel-order'),
                //     icon: 'ban',
                //     fn: this.cancelOrder,
                //     permission: 'fleet-ops cancel order',
                // },
                {
                    separator: true,
                },
                {
                    label: this.intl.t('fleet-ops.operations.orders.index.delete-order'),
                    icon: 'trash',
                    fn: this.deleteOrder,
                    permission: 'fleet-ops delete order',
                },
            ],
            sortable: false,
            filterable: false,
            resizable: false,
            searchable: false,
        },
    ];

    /**
     * Creates an instance of OperationsOrdersIndexController.
     * @memberof OperationsOrdersIndexController
     */
    constructor() {
        super(...arguments);
        this.listenForOrderEvents();
        if (this.session?.isAuthenticated) {
            this.getOrderStatusOptions.perform();
        }
    }

    @task *getOrderStatusOptions() {
        try {
            if (this.statusOptions.length > 0) {
                return this.statusOptions;
            }
            this.statusOptions = yield this.fetch.get('orders/statuses?is_filter_status=1');
            return this.statusOptions;
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    /**
     * Listen for incoming order events to refresh listing.
     *
     * @memberof OperationsOrdersIndexController
     */
    @action async listenForOrderEvents() {
        // wait for user to be loaded into service
        this.currentUser.on('user.loaded', () => {
            // Get socket instance
            const socket = this.socket.instance();

            // The channel ID to listen on
            const channelId = `company.${this.currentUser.companyId}`;

            // Listed on company channel
            const channel = socket.subscribe(channelId);

            // Events which should trigger refresh
            const listening = ['order.ready', 'order.driver_assigned'];

            // Listen for channel subscription
            (async () => {
                for await (let output of channel) {
                    const { event } = output;

                    // if an order event refresh orders
                    if (typeof event === 'string' && listening.includes(event)) {
                        this.hostRouter.refresh();
                    }
                }
            })();

            // disconnect when transitioning
            this.hostRouter.on('routeWillChange', () => {
                channel.close();
            });
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
            set(this, 'query', null);
            this.hostRouter.refresh();
            return;
        }
        // timeout for typing
        yield timeout(200);

        // reset page for results
        if (this.page > 1) {
            set(this, 'page', 1);
        }

        // update the query param
        set(this, 'query', value);
        this.hostRouter.refresh();
    }

    /**
     * Reload layout view.
     */
    @action reload() {
        return this.hostRouter.refresh();
    }

    /**
     * Hides all elements on the live map.
     * @action
     * @memberof OperationsOrdersIndexController
     */
    @action resetView() {
        if (this.leafletMap && this.leafletMap.liveMap) {
            this.leafletMap.liveMap.hideAll();
        }
    }

    /**
     * Toggles the visibility of the search interface.
     * @action
     * @memberof OperationsOrdersIndexController
     */
    @action toggleSearch() {
        this.isSearchVisible = !this.isSearchVisible;
    }

    /**
     * Set the order list overlay context.
     * @action
     * @memberof OperationsOrdersIndexController
     */
    @action setOrderListOverlayContext(orderListOverlayContext) {
        this.orderListOverlayContext = orderListOverlayContext;
    }

    /**
     * Toggles the visibility of the orders panel.
     * @action
     * @memberof OperationsOrdersIndexController
     */
    @action toggleOrdersPanel() {
        if (this.orderListOverlayContext) {
            this.orderListOverlayContext.toggle();
        }
    }

    /**
     * Hides the orders panel.
     * @action
     * @memberof OperationsOrdersIndexController
     */
    @action hideOrdersPanel() {
        if (this.orderListOverlayContext) {
            this.orderListOverlayContext.close();
        }
    }

    /**
     * Shows the orders panel.
     * @action
     * @memberof OperationsOrdersIndexController
     */
    @action showOrdersPanel() {
        if (this.orderListOverlayContext) {
            this.orderListOverlayContext.open();
        }
    }

    /**
     * Zooms the map in or out.
     * @param {string} [direction='in'] - The direction to zoom. Either 'in' or 'out'.
     * @action
     * @memberof OperationsOrdersIndexController
     */
    @action zoomMap(direction = 'in') {
        if (direction === 'in') {
            this.leafletMap?.zoomIn();
        } else {
            this.leafletMap?.zoomOut();
        }
    }

    /**
     * Sets the layout mode and triggers a layout change event.
     * @param {string} mode - The layout mode to set. E.g., 'table'.
     * @action
     * @memberof OperationsOrdersIndexController
     */
    @action setLayoutMode(mode) {
        this.layout = mode;

        if (mode === 'table') {
            this.isSearchVisible = true;
        }

        this.universe.trigger('fleet-ops.dashboard.layout.changed', mode);
    }

    /**
     * Sets the map references for this component.
     * Extracts the `liveMap` from the `target` object passed in the event and sets it as `this.liveMap`.
     * Also, sets `target` as `this.leafletMap`.
     *
     * @param {Object} event - The event object containing the map references.
     * @param {Object} event.target - The target map object.
     * @param {Object} event.target.liveMap - The live map reference.
     * @action
     * @memberof OperationsOrdersIndexController
     */
    @action setMapReference({ target, target: { liveMap } }) {
        this.leafletMap = target;
        this.liveMap = liveMap;
    }

    @action previewOrderRoute(order) {
        if (this.liveMap) {
            this.liveMap.previewOrderRoute(order);
        }
    }

    @action restoreDefaultLiveMap() {
        if (this.liveMap) {
            this.liveMap.restoreDefaultLiveMap();
        }
    }

    /**
     * Sets the drawer component context api.
     *
     * @param {Object} drawerApi
     * @memberof OperationsOrdersIndexController
     */
    @action setDrawerContext(drawerApi) {
        this.drawer = drawerApi;
    }

    /**
     * Toggles the LiveMap drawer component.
     *
     * @memberof OperationsOrdersIndexController
     */
    @action onPressLiveMapDrawerToggle() {
        if (this.drawer) {
            this.drawer.toggleMinimize({
                onToggle: (drawerApi) => {
                    this.drawerOpen = drawerApi.isMinimized ? 0 : 1;
                },
            });
        }
    }

    /**
     * Handles the resize end event for the `<LiveMapDrawer />` component.
     *
     * @params {Object} event
     * @params {Object.drawerPanelNode|HTMLElement}
     * @memberof OperationsOrdersIndexController
     */
    @action onDrawerResizeEnd({ drawerPanelNode }) {
        const rect = drawerPanelNode.getBoundingClientRect();

        if (rect.height === 0) {
            this.drawerOpen = 0;
        } else if (rect.height > 1) {
            this.drawerOpen = 1;
        }
    }

    @action onDrawerTabChanged(tabName) {
        this.drawerTab = tabName;
    }

    /**
     * Exports all orders.
     * @action
     * @memberof OperationsOrdersIndexController
     */
    @action exportOrders() {
        const selections = this.table.selectedRows.map((_) => _.id);
        this.crud.export('order', { params: { selections } });
    }

    /**
     * Redirects to the new order creation page.
     * @action
     * @memberof OperationsOrdersIndexController
     */
    @action createOrder() {
        return this.transitionToRoute('operations.orders.index.new');
    }

    /**
     * Redirects to the view page of a specific order.
     * @param {Object} order - The order to view.
     * @action
     * @memberof OperationsOrdersIndexController
     */
    @action viewOrder(order) {
        return this.transitionToRoute('operations.orders.index.view', order);
    }

    /**
     * Cancels a specific order after confirmation.
     * @param {Object} order - The order to cancel.
     * @param {Object} [options={}] - Additional options for the modal.
     * @action
     * @memberof OperationsOrdersIndexController
     */
    @action cancelOrder(order, options = {}) {
        this.modalsManager.confirm({
            title: this.intl.t('fleet-ops.operations.orders.index.cancel-title'),
            body: this.intl.t('fleet-ops.operations.orders.index.cancel-body'),
            order,
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await this.fetch.patch('orders/cancel', { order: order.id });
                    order.set('status', 'canceled');
                    this.notifications.success(this.intl.t('fleet-ops.operations.orders.index.cancel-success', { orderId: order.public_id }));
                    modal.done();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
            ...options,
        });
    }

    /**
     * Dispatches a specific order after confirmation.
     * @param {Object} order - The order to dispatch.
     * @param {Object} [options={}] - Additional options for the modal.
     * @action
     * @memberof OperationsOrdersIndexController
     */
    @action dispatchOrder(order, options = {}) {
        this.modalsManager.confirm({
            title: this.intl.t('fleet-ops.operations.orders.index.dispatch-title'),
            body: this.intl.t('fleet-ops.operations.orders.index.dispatch-body'),
            acceptButtonScheme: 'primary',
            acceptButtonText: 'Dispatch',
            acceptButtonIcon: 'paper-plane',
            order,
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await this.fetch.patch('orders/dispatch', { order: order.id });
                    order.set('status', 'dispatched');
                    this.notifications.success(this.intl.t('fleet-ops.operations.orders.index.dispatch-success', { orderId: order.public_id }));
                    modal.done();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
            ...options,
        });
    }

    /**
     * Deletes a specific order.
     * @param {Object} order - The order to delete.
     * @param {Object} [options={}] - Additional options for deletion.
     * @action
     * @memberof OperationsOrdersIndexController
     */
    @action deleteOrder(order, options = {}) {
        this.crud.delete(order, {
            onSuccess: () => {
                return this.hostRouter.refresh();
            },
            ...options,
        });
    }

    /**
     * Deletes multiple selected orders.
     * @param {Array} [selected=[]] - Orders selected for deletion.
     * @action
     * @memberof OperationsOrdersIndexController
     */
    @action bulkDeleteOrders(selected = []) {
        selected = selected.length > 0 ? selected : this.table.selectedRows;

        this.crud.bulkDelete(selected, {
            modelNamePath: `public_id`,
            acceptButtonText: 'Delete Orders',
            onSuccess: async () => {
                await this.hostRouter.refresh();
                this.table.untoggleSelectAll();
            },
        });
    }

    /**
     * Cancels multiple selected orders.
     *
     * @param {Array} [selected=[]] - Orders selected for cancellation.
     * @action
     * @memberof OperationsOrdersIndexController
     */
    @action bulkCancelOrders(selected = []) {
        selected = selected.length > 0 ? selected : this.table.selectedRows;

        if (!isArray(selected) || selected.length === 0) {
            return;
        }

        this.crud.bulkAction('cancel', selected, {
            acceptButtonText: 'Cancel Orders',
            acceptButtonScheme: 'danger',
            acceptButtonIcon: 'ban',
            modelNamePath: `public_id`,
            actionPath: `orders/bulk-cancel`,
            actionMethod: `PATCH`,
            onConfirm: (canceledOrders) => {
                canceledOrders.forEach((order) => {
                    order.set('status', 'canceled');
                });
            },
            onSuccess: async () => {
                await this.hostRouter.refresh();
                this.table.untoggleSelectAll();
            },
        });
    }

    /**
     * Dispatches multiple selected orders.
     *
     * @param {Array} [selected=[]] - Orders selected for dispatch.
     * @action
     * @memberof OperationsOrdersIndexController
     */
    @action bulkDispatchOrders(selected = []) {
        selected = selected.length > 0 ? selected : this.table.selectedRows;

        if (!isArray(selected) || selected.length === 0) {
            return;
        }

        this.crud.bulkAction('dispatch', selected, {
            acceptButtonText: 'Dispatch Orders',
            acceptButtonScheme: 'magic',
            acceptButtonIcon: 'rocket',
            modelNamePath: 'public_id',
            actionPath: 'orders/bulk-dispatch',
            actionMethod: 'POST',
            onConfirm: (dispatchedOrders) => {
                dispatchedOrders.forEach((order) => {
                    order.set('status', 'dispatched');
                });
            },
            onSuccess: async () => {
                await this.hostRouter.refresh();
                this.table.untoggleSelectAll();
            },
        });
    }

    /**
     * Triggers when the map container is ready.
     * @action
     * @memberof OperationsOrdersIndexController
     */
    @action onMapContainerReady() {
        this.fetchActiveOrdersCount();
    }

    /**
     * Fetches the count of active orders.
     * @action
     * @memberof OperationsOrdersIndexController
     */
    @action fetchActiveOrdersCount() {
        this.fetch.get('fleet-ops/metrics', { discover: ['orders_in_progress'] }).then((response) => {
            this.activeOrdersCount = response.orders_in_progress;
        });
    }
}
