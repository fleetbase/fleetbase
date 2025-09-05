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
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { later } from '@ember/runloop';
import { getOwner } from '@ember/application';
import { on } from '@ember/object/evented';
import Controller from '@ember/controller';
import { inject as controller } from '@ember/controller';
import ENV from '@fleetbase/console/config/environment';

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
    @tracked timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    @controller('operations/orders/index/new') newController;
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
        'on',
        'trip_id',
        'fleet'
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
     * Check if auto allocation should be enabled based on URL parameter
     *
     * @type {Boolean}
     */
    get isAutoAllocationEnabled() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('auto_allocation') === 'true';
    }
    @tracked sta_op;
    /**
     * The filterable param `trip_id`
     *
     * @var {String}
     */
    @tracked trip_id;
    @tracked fleet
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
            label: this.intl.t('fleet-ops.operations.orders.index.block-id'),
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
            filterParam: 'public_id',
        },
        {
            label: this.intl.t('fleet-ops.operations.orders.index.trip-id'),
            valuePath: 'trip_id',
            width: '140px',
            cellComponent: 'table/cell/base',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
            filterParam: 'trip_id',
        },
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
            filterComponentPlaceholder: this.intl.t('fleet-ops.operations.orders.index.select-driver'),
            filterParam: 'driver',
            model: 'driver',
        },
        {
            label: this.intl.t('fleet-ops.operations.orders.index.pickup'),
            valuePath: 'pickupName',
            cellComponent: 'table/cell/base',
            width: '120px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/model',
            filterOptionLabel: 'address',
            filterComponentPlaceholder: this.intl.t('fleet-ops.operations.orders.index.select-pickup-location'),
            filterParam: 'pickup',
            modelNamePath: 'name',
            model: 'place',
        },
        // {
        //     label: this.intl.t('fleet-ops.common.dropoff'),
        //     valuePath: 'dropoffName',
        //     width: '180px',
        //     cellComponent: 'table/cell/link-to',
        //     route: 'operations.orders.routes-segments',
        //     routeParam: 'payload_uuid',
        //     // Link styling with flex to align text and icon
        //     linkClass: 'text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium transition-colors duration-150 flex items-center group',
        //     // Icon configuration - will appear AFTER the text
        //     linkIcon: 'external-link-alt',
        //     linkIconPrefix: 'fas',
        //     linkIconSize: 'xs',
        //     linkIconClass: 'text-blue-400 group-hover:text-blue-600 ml-2 transition-colors duration-150', // ml-2 = margin-left to space it from text
        //     onLinkClick: this.viewRouteSegments,
        //     permission: 'fleet-ops view routes-segments',
        //     resizable: true,
        //     sortable: true,
        //     filterable: true,
        //     filterComponent: 'filter/string',
        //     // Enable waypoint check for conditional link behavior
        //     waypointCheck: true,
        // },
        {
            label: this.intl.t('fleet-ops.operations.orders.index.dropoff'),
            valuePath: 'dropoffName',
            cellComponent: 'table/cell/dropoff',
            width: '210px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/model',
            filterComponentPlaceholder: this.intl.t('fleet-ops.operations.orders.index.select-dropoff-location'),
            filterParam: 'dropoff',
            modelNamePath: 'name',
            model: 'place',
        },
        {
            label: this.intl.t('fleet-ops.operations.orders.index.vehicle-assigned'),
            cellComponent: 'cell/vehicle-name',
            valuePath: 'vehicle_assigned.plate_number',
            modelPath: 'vehicle_assigned',
            showOnlineIndicator: true,
            width: '170px',
            hidden: true,
            resizable: true,
            sortable: true,
            filterable: false,
            filterComponent: 'filter/model',
            filterComponentPlaceholder: this.intl.t('fleet-ops.operations.orders.index.select-vehicle'),
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
        // {
        //     label: this.intl.t('fleet-ops.operations.orders.index.tracking'),
        //     valuePath: 'tracking_number.tracking_number',
        //     cellComponent: 'click-to-copy',
        //     width: '170px',
        //     resizable: true,
        //     sortable: true,
        //     filterable: false,
        //     filterComponent: 'filter/string',
        // },
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
            label: this.intl.t('fleet-ops.common.fleet'),
            // cellComponent: 'cell/fleet-name',
            valuePath: 'fleet.name',
            modelPath: 'fleet',
            // action: (fleet) => {
            //     this.contextPanel.focus(fleet);
            // },
            width: '180px',
            resizable: true,
            hidden: false,
            filterable: true,
            filterComponent: 'filter/model',
            filterComponentPlaceholder: this.intl.t('fleet-ops.common.select-fleet'),
            filterParam: 'fleet',
            model: 'fleet',
        },
        {
            label: this.intl.t('fleet-ops.common.status'),
            valuePath: 'status',
            cellComponent: 'table/cell/status',
            width: '150px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/select',
            filterOptions: this.sta_op,
            // filterOptions : ['completed',],
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
            ddMenuLabel: this.intl.t('fleet-ops.operations.orders.index.view.order-actions'),
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

    @tracked showAutoAllocationPanel = false;
    @tracked autoAllocationDate = []; // array for range
    @tracked selectedFleet = null;
    @tracked fleetOptions = [];

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
        // Fetch fleet list from API and set fleetOptions
        this.fetch.get('fleets').then((response) => {
            // response is { fleets: [...], meta: {...} }
            const fleets = Array.isArray(response.fleets) ? response.fleets : [];
            if (fleets.length > 0) {
                this.fleetOptions = fleets.map(fleet => ({
                    label: fleet.name,
                    value: fleet.uuid // or fleet.id if you prefer
                }));
            } else {
                this.fleetOptions = [];
            }
        });
    }
    @task *getOrderStatusOptions() {
        try {
          if (this.statusOptions.length > 0) {
            this.sta_op=this.statusOptions.map(option => 
                option.label.toLowerCase().replace(/\s+/g, '-')
              );
            // Convert existing statusOptions to array of strings
            return this.sta_op;
          }
          // Fetch statuses from API
          this.statusOptions = yield this.fetch.get('orders/statuses?is_filter_status=1');
          this.sta_op=this.statusOptions.map(option => 
            option.label.toLowerCase().replace(/\s+/g, '-')
          );

         
          return this.sta_op;
        } catch (error) {
          this.notifications.serverError(error);
          // Return empty array in case of error
          return [];
        }
      }
    // @task *getOrderStatusOptions() {
    //     try {
    //         if (this.statusOptions.length > 0) {
    //             this.statusOptions = this.statusOptions.map(option => {  
    //                 return {  
    //                     label: `${option.label.toLowerCase().replace(/\s+/g, '_')}`,
    //                     code: `${option.label.toLowerCase().replace(/\s+/g, '_')}`, // Adjust this if the property name is different  
    //                 };  
    //             }); 
    //             return this.statusOptions; 
    //         }
    //         this.statusOptions = yield this.fetch.get('orders/statuses?is_filter_status=1');
    //         this.statusOptions = this.statusOptions.map(option => {  
    //             return {  
    //                 label: `${option.label.toLowerCase().replace(/\s+/g, '_')}`,
    //                 code: `${option.label.toLowerCase().replace(/\s+/g, '_')}`,// Adjust this if the property name is different  
    //             };  
    //         });
    //         return this.statusOptions;
    //     } catch (error) {
    //         this.notifications.serverError(error);
    //     }
    // }

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
        this.crud.export('order', { params: { selections } }, true);
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
            acceptButtonText: this.intl.t('fleet-ops.operations.orders.index.view.dispatch'),
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
            acceptButtonText: this.intl.t('fleet-ops.operations.orders.index.delete-orders'),
            onSuccess: async () => {
                await this.hostRouter.refresh();
                this.table.untoggleSelectAll();
            },
        });
    }

    /**
     * Auto-allocates multiple selected orders.
     *
     * @param {Array} [selected=[]] - Orders selected for auto-allocation.
     * @action
     * @memberof OperationsOrdersIndexController
     */
    @action
    async bulkAutoAllocate(selected = []) {
        selected = selected.length > 0 ? selected : this.table.selectedRows;
    
        if (!Array.isArray(selected) || selected.length === 0) {
            return;
        }

        // Check if all selected orders have the same fleet_uuid
        const fleetUuids = selected.map(order => order.fleet_uuid).filter(uuid => uuid);
        const uniqueFleetUuids = [...new Set(fleetUuids)];
        
        if (uniqueFleetUuids.length > 1) {
            this.notifications.warning(this.intl.t('fleet-ops.operations.orders.index.auto-allocate-fleet-mismatch'));
            return;
        }
        
        if (fleetUuids.length !== selected.length) {
            this.notifications.warning(this.intl.t('fleet-ops.operations.orders.index.auto-allocate-missing-fleet'));
            return;
        }
    
        const selectedOrders = selected.map(order => order.public_id).join(',');
        const companyUuid = this.currentUser?.company_uuid || 
                            this.session?.data?.authenticated?.company_uuid ||
                            this.currentUser?.user?.company_uuid;
                            
        const url = `${ENV.API.host}/api/v1/shift-assignments/data?selected_orders=[${selectedOrders}]&company_uuid=${companyUuid}&fleet_uuid=${uniqueFleetUuids}`;
    
        this.isLoading = true;
    
        this.modalsManager.confirm({
            title: this.intl.t('fleet-ops.operations.orders.index.auto-allocate-title'),
            body: this.intl.t('fleet-ops.operations.orders.index.auto-allocate-body', {
                count: selected.length,
                plural: selected.length > 1 ? 's' : ''
            }),
            acceptButtonScheme: 'primary',
            acceptButtonText: this.intl.t('fleet-ops.common.auto-allocate'),
            acceptButtonIcon: 'users-cog',
            confirm: async (modal) => {
                modal.startLoading();
    
                try {
                    // ---- First API call ----
                    const getResp = await fetch(url, {
                        method: 'GET',
                        headers: this.fetch.getHeaders()
                    });
    
                    const getData = await getResp.json(); // This will be your payload for the next call
    
                    // this.notifications.success(
                    //     this.intl.t('fleet-ops.operations.orders.index.auto-allocate-success', {
                    //         count: selected.length
                    //     })
                    // );
    
                    // ---- Second API call ----
                    const result = await this.#submitAllocation(getData);

                    if (!result.ok && !result.skipped) {
                        throw new Error(`Follow-up API failed with status ${result.status}`);
                    }

                    if (result.skipped) {
                        this.notifications.warning(result.message);
                    } else {
                        this.notifications.success('Auto-allocation completed successfully.');
                        this.#handleAllocationResult(result);
                    }

                    await this.hostRouter.refresh();
                    this.table.untoggleSelectAll();
                } catch (error) {
                    console.error('Auto-allocation or follow-up failed:', error);
                    this.notifications.serverError(error);
                } finally {
                    this.isLoading = false;
                    modal.stopLoading();
                }
            }
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
            acceptButtonText: this.intl.t('fleet-ops.operations.orders.index.dispatch-orders'),
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

    @action
    viewRouteSegments(order) {
    // Navigate to the route segments page using payload_uuid
        this.router.transitionTo('operations.orders.routes-segments', order.payload_uuid);
    }

    @action startOrdersTour(skipFirstStep = false) {
        const sidebarSelector = '.next-content-overlay-panel-body:has(new-order-route)';

    const scrollElementIntoView = (element) => {
    const sidebar = document.querySelector(sidebarSelector);
    if (sidebar && sidebar.contains(element)) {
                const sidebarRect = sidebar.getBoundingClientRect();
                const elementRect = element.getBoundingClientRect();
                const offset = elementRect.top - sidebarRect.top + sidebar.scrollTop;
                const centerOffset = offset - (sidebar.clientHeight / 2) + (element.clientHeight / 2);
                sidebar.scrollTo({ top: centerOffset, behavior: 'smooth' });
            }
        };

        const driverObj = driver({
            showProgress: false,
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
            onDestroyStarted: () => {
                const newOrderController = getOwner(this).lookup('controller:operations.orders.index.new');
                newOrderController.toggleMultiDropOrder(true);
                driverObj.destroy();
            },
            steps: [
                {
                    element: '.import-order', // import button
                    popover: {
                        title: this.intl.t('fleetbase.orders.tour.import_button.title'),
                        description: this.intl.t('fleetbase.orders.tour.import_button.description'),
                        onNextClick: () => {
                            const newOrderController = getOwner(this).lookup('controller:operations.orders.index.new');
                            newOrderController.importOrder();
                            const checkModal = setInterval(() => {
                            const modal = document.querySelector('.flb--modal');
                            if (modal && modal.classList.contains('show')) {
                            clearInterval(checkModal);
                            driverObj.moveNext(); // Move to the next step
                            }
                        }, 100);
                        }
                    },
                },
                {
                    element: '.flb--modal .dropzone', // upload spreadsheets popup
                    popover: {
                        title: this.intl.t('fleetbase.common.upload_spreadsheets.title'),
                        description: this.intl.t('fleetbase.common.upload_spreadsheets.description'),
                    },
                },
                {
                    element: '.flb--modal .modal-footer-actions .btn-magic', // start upload button
                    popover: {
                        title: this.intl.t('fleetbase.common.start_upload.title'),
                        description: this.intl.t('fleetbase.common.start_upload.description'),
                        onNextClick: () => {
                            this.modalsManager.done();
                            const checkModalClosed = setInterval(() => {
                                const modal = document.querySelector('.flb--modal');
                                if (!modal || !modal.classList.contains('show')) {
                                    clearInterval(checkModalClosed);
                                    driverObj.moveNext();
                                }
                            }, 100);
                        },
                    },
                },
                {
                    element: '#next-view-section-subheader-actions .new-order button',
                    onHighlightStarted: (element) => {
                        element.style.setProperty('pointer-events', 'none', 'important');
                        element.disabled = true;
                      },
                      onDeselected: (element) => {
                        element.style.pointerEvents = 'auto';
                        element.disabled = false;
                      },
                    popover: {
                        title: this.intl.t('fleetbase.orders.tour.add.title'),
                        description: this.intl.t('fleetbase.orders.tour.add.description'),
                        onNextClick: () => {
                            this.createOrder();
    
                            later(this, () => {
                                const el = document.querySelector('.next-content-overlay > .next-content-overlay-panel-container > .next-content-overlay-panel');
    
                                if (el) {
                                    const onTransitionEnd = () => {
                                        el.removeEventListener('transitionend', onTransitionEnd);
                                        driverObj.moveNext();
                                    };
    
                                    el.addEventListener('transitionend', onTransitionEnd);
                                }
                            }, 100);
                        },
                        onPrevClick: () => {
                            driverObj.moveTo(0);
                        }
                    },
                },
                
                {
                    element: '.next-content-panel-body-inner.next-content-panel-body-wrapper',
                    popover: {
                        title: this.intl.t('fleetbase.orders.tour.dates.title'),
                        description: this.intl.t('fleetbase.orders.tour.dates.description'),
                        onPrevClick: async () => {
                            // Click the ops table view button
                            document.querySelector('#ops-table-view-button')?.click();
                            await new Promise(resolve => setTimeout(resolve, 300));
                            document.querySelector('.next-content-overlay-panel-cancel-button')?.click();
                                driverObj.drive(0);
                        }

                    },
                    onHighlightStarted: (element) => {
                        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                    disableButtons: ['previous'],

                },
                {
                    element: '.new-order-route-toggle span[role="checkbox"]',
                    popover: {
                        title: this.intl.t('fleetbase.orders.tour.multiple_dropoff.title'),
                        description: this.intl.t('fleetbase.orders.tour.multiple_dropoff.description'),
                    },
                    onHighlightStarted: (element) => {
                        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                },
                {
                    element: '.add-waypoint-btn',
                    popover: {
                        title: this.intl.t('fleetbase.orders.tour.add_waypoint.title'),
                        description: this.intl.t('fleetbase.orders.tour.add_waypoint.description'),
                        onNextClick: () => {
                            const newOrderController = getOwner(this).lookup('controller:operations.orders.index.new');
                            const waypoint2 = document.querySelector('#waypoint_2');

                            // Only add waypoints if both are missing
                            if (!waypoint2) {
                                newOrderController.addWaypoint();
                            }
                            driverObj.moveNext();
                        },
                    },
                   onHighlightStarted: (element) => {
                        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                },
                {
                    element: '.dragSortList.multi-drop-select-container',
                    popover: {
                        title: this.intl.t('fleetbase.orders.tour.select_waypoint.title'),
                        description: this.intl.t('fleetbase.orders.tour.select_waypoint.description'),
                        onNextClick: () => {
                            const newOrderController = getOwner(this).lookup('controller:operations.orders.index.new');
                            newOrderController.toggleMultiDropOrder(false);
                            driverObj.moveNext();
                        },
                    },
                    onHighlightStarted: (element) => {
                        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                },
                {
                    element: '.new-order-route-toggle span[role="checkbox"]',
                    popover: {
                        title: this.intl.t('fleetbase.orders.tour.multiple_dropoff_disabled.title'),
                        description: this.intl.t('fleetbase.orders.tour.multiple_dropoff_disabled.description'),
                        onPrevClick: () => {
                            const newOrderController = getOwner(this).lookup('controller:operations.orders.index.new');
                            newOrderController.toggleMultiDropOrder(true);
                            newOrderController.addWaypoint();
                             (function waitForEl() {
                            if (document.querySelector('.dragSortList.multi-drop-select-container')) {
                                driverObj.movePrevious();
                            } else {
                                setTimeout(waitForEl, 100);
                            }
                        })();
                        },
                    },
                    onHighlightStarted: (element) => {
                        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                },
                {
                    element: '.grid.grid-cols-1.lg\\:grid-cols-2.gap-4.lg\\:gap-2.text-xs.dark\\:text-gray-100',
                    popover: {
                        title: this.intl.t('fleetbase.orders.tour.pickup_dropoff_section.title', 'Pickup/Dropoff/Return'),
                        description: this.intl.t('fleetbase.orders.tour.pickup_dropoff_section.description', 'Set the pickup, dropoff, and return locations for the order.'),
                    },
                    onHighlightStarted: (element) => {
                        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                },
                {
                    element: '.new-order-notes .next-content-panel-container ',
                    popover: {
                        title: this.intl.t('fleetbase.orders.tour.notes.title'),
                        description: this.intl.t('fleetbase.orders.tour.notes.description'),
                    },
                    onHighlightStarted: scrollElementIntoView,
                },
                {
                    element: '.new-order-documents .next-content-panel-container ',
                    popover: {
                        title: this.intl.t('fleetbase.orders.tour.documents.title'),
                        description: this.intl.t('fleetbase.orders.tour.documents.description'),
                    },
                    onHighlightStarted: scrollElementIntoView,
                },
                {
                    element: '.new-order-submit',
                    popover: {
                        title: this.intl.t('fleetbase.orders.tour.submit.title'),
                        description: this.intl.t('fleetbase.orders.tour.submit.description'),
                    },
                    onHighlightStarted: (element) => {
                         element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                }
            ],
        });

        // Defensive: handle case where skipFirstStep is an event or pointer, not a boolean
        if (typeof skipFirstStep !== 'boolean') {
            skipFirstStep = false;
        }
        if (skipFirstStep) {
            driverObj.drive(4); // Start from step 4 (skip first)
        } else {
            driverObj.drive();
        }
    }

    @action startOrdersTourFromHelp() {
        this.startOrdersTour(true);
    }
    
    @action
    importOrder() {
      return this.newController.importOrder();
    }
  


    @action setAutoAllocationDate(dateObj) {
        // For range, dateObj.formattedDate is an array
        if (Array.isArray(dateObj?.formattedDate)) {
            this.autoAllocationDate = dateObj.formattedDate;
        } else if (dateObj?.formattedDate) {
            this.autoAllocationDate = [dateObj.formattedDate];
        } else {
            this.autoAllocationDate = [];
        }
    }

    @action toggleAutoAllocationPanel() {
        this.showAutoAllocationPanel = !this.showAutoAllocationPanel;
    }

    @action setSelectedFleet(fleet) {
        // PowerSelect passes the whole fleet object
        this.selectedFleet = fleet;
    }

    @action allocateNow() {
        // Validate that we have the required data
        try {
            // Close the auto allocation panel
            this.showAutoAllocationPanel = false;
        } catch (error) {
            console.error('Error in allocateNow:', error);
            this.notifications.error(this.intl.t('fleet-ops.operations.orders.index.failed_allocation_process'));
        }
    }

    /**
     * Private method to submit allocation data to a second API endpoint
     * @param {Object} data - The allocation data to submit
     * @returns {Promise<Object>} - The API response
     */
    async #submitAllocation(data) {
        // Build proper payload from the component's logic
        const payload = this.#buildAllocationPayload(data);
        
        // Check if we have trips to allocate (from component logic)
        const hasDatedTrips = Array.isArray(payload.dated_shifts) && payload.dated_shifts.some((s) => {
            if (!s || typeof s !== 'object') return false;
            const id = s.id || s.shift_id;
            const st = s.start_time;
            return Boolean(id && st);
        });
        const hasRecurringTrips = Array.isArray(payload.recurring_shifts) && payload.recurring_shifts.length > 0;
        
        if (!hasDatedTrips && !hasRecurringTrips) {
            return {
                skipped: true,
                reason: 'no_trips',
                message: this.intl.t('fleet-ops.operations.orders.index.trips_already_assigned')
            };
        }

        const authSession = this.#getAuthSession();
        const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
        
        // Get bearer token from environment, component args, or authenticated session
        const token = ENV.resourceAllocation?.bearerToken || authSession?.authenticated?.token;
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Use the external API URL from environment
        const apiUrl = ENV.resourceAllocation?.apiUrl;
        if (!apiUrl) {
            throw new Error(this.intl.t('fleet-ops.operations.orders.index.api_url_not_configured'));
        }

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });
            
            const body = await response.json().catch(() => null);
            
            return {
                status: response.status,
                ok: response.ok,
                body,
                payload
            };
        } catch (error) {
            console.error('Error in submitAllocation:', error);
            return { ok: false, error: error.message };
        }
    }

    /**
     * Private method to build allocation payload (based on component logic)
     * @param {Object} data - The raw allocation data
     * @returns {Object} - The formatted payload
     */
    #buildAllocationPayload(data) {
        const datesArr = Array.isArray(data?.data?.dates) ? data.data.dates : [];
        const rawResources = Array.isArray(data?.data?.resources) ? data.data.resources : [];

        const resources = rawResources.map((r) => {
            const prefs = r?.preferences || {};
            const resolvedStart = prefs.preferred_start_time ?? null;
            const resolvedEnd = prefs.preferred_end_time ?? null;

            const preferences = (resolvedStart == null && resolvedEnd == null)
                ? null
                : {
                    ...prefs,
                    preferred_start_time: resolvedStart,
                    preferred_end_time: resolvedEnd,
                };

            return {
                ...r,
                preferences,
            };
        });

        // Build dated_shifts
        const normalizeShift = (s, date) => {
            const id = s?.id ?? s?.uuid ?? s?.shift_id ?? null;
            const start_time = s?.start_time ?? s?.startTime ?? s?.starttime ?? s?.start ?? null;
            const d = s?.date ?? date ?? null;
            return { ...s, id, start_time, date: d };
        };

        let dated_shifts = [];
        if (Array.isArray(data?.data?.dated_shifts) && data.data.dated_shifts.length > 0) {
            dated_shifts = data.data.dated_shifts.map((s) => normalizeShift(s, s?.date));
        } else if (Array.isArray(data?.data?.shifts) && data.data.shifts.length > 0) {
            dated_shifts = data.data.shifts.map((s) => normalizeShift(s, s?.date));
        } else if (data?.data?.shifts_by_date && typeof data.data.shifts_by_date === 'object') {
            for (const [date, arr] of Object.entries(data.data.shifts_by_date)) {
                if (Array.isArray(arr)) {
                    dated_shifts.push(...arr.map((s) => normalizeShift(s, date)));
                }
            }
        } else if (Array.isArray(datesArr) && datesArr.length > 0 && typeof datesArr[0] === 'object') {
            dated_shifts = datesArr.map((s) => normalizeShift(s, s?.date));
        } else {
            dated_shifts = datesArr.map((d) => ({ date: d }));
        }

        const company_uuid = this.currentUser?.user?.company_uuid || this.session?.data?.authenticated?.company_uuid;
        const pre_assigned_shifts = Array.isArray(data?.data?.pre_assigned_shifts) ? data.data.pre_assigned_shifts : [];
        console.log('data', data);
        return {
            problem_type: 'shift_assignment',
            dates: datesArr,
            dated_shifts,
            resources,
            previous_allocation_data: data?.data?.previous_allocation_data ?? {},
            vehicles_data: data?.data?.vehicles_data ?? [],
            company_uuid,
            pre_assigned_shifts,
            ...(Array.isArray(data?.data?.recurring_shifts) ? { recurring_shifts: data.data.recurring_shifts } : {}),
        };
    }

    /**
     * Private method to get authentication session from localStorage
     * @returns {Object|null} - The auth session object
     */
    #getAuthSession() {
        try {
            return JSON.parse(localStorage.getItem('ember_simple_auth-session'));
        } catch (_) {
            return null;
        }
    }

    /**
     * Private method to handle allocation result processing
     * @param {Object} result - The allocation result to process
     */
    #handleAllocationResult(result) {
        try {
            // Handle results based on component logic
            if (result.skipped) {
                return; // Already handled in the calling code
            }

            // If API indicates success and provides URL or UUID for results
            if (result.ok && result.body?.success === true) {
                let targetUrl = typeof result.body.url === 'string' ? result.body.url.trim() : '';
                // if (!targetUrl) {
                const uuid = result.body?.uuid;
                if (uuid) {
                    const apiKey = ENV.resourceAllocation?.bearerToken || this.#getAuthSession()?.authenticated?.token;
                    if (apiKey) {
                        targetUrl = `${targetUrl}?allocation_uuid=${encodeURIComponent(uuid)}&api_key=${encodeURIComponent(apiKey)}`;
                    } else {
                        targetUrl = `${targetUrl}?allocation_uuid=${encodeURIComponent(uuid)}`;
                    }
                }
                
                if (targetUrl) {
                    this.#openResultsInNewTab(targetUrl);
                }
            }
        } catch (error) {
            console.error('Error handling allocation result:', error);
            this.notifications.error('Failed to process allocation result');
        }
    }

    /**
     * Private method to open results in new tab
     * @param {string} targetUrl - The URL to open
     */
    #openResultsInNewTab(targetUrl) {
        let newTabRef = null;
        
        try {
            newTabRef = window.open('', '_blank');
        } catch (_) {}

        if (newTabRef) {
            let navigated = false;
            try { 
                newTabRef.location.replace(targetUrl); 
                navigated = true; 
            } catch (_) {}
            
            if (!navigated) {
                try {
                    const doc = newTabRef.document;
                    if (doc) {
                        const p = doc.createElement('p');
                        p.style.fontFamily = 'Arial, sans-serif';
                        p.style.margin = '16px';
                        p.appendChild(doc.createTextNode('Click to view results: '));
                        const a = doc.createElement('a');
                        a.href = targetUrl;
                        a.target = '_self';
                        a.textContent = 'Open Results';
                        p.appendChild(a);
                        if (doc.body) {
                            doc.body.innerHTML = '';
                            doc.body.appendChild(p);
                        } else if (doc.documentElement) {
                            const body = doc.createElement('body');
                            body.appendChild(p);
                            doc.documentElement.appendChild(body);
                        }
                    }
                } catch (_) {}
            }
        } else {
            try { window.open(targetUrl, '_blank'); } catch (_) {}
        }
    }

}

