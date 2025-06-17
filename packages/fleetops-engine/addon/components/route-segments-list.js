// Create: app/components/route-segments-list.js
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency-decorators';

export default class RouteSegmentsListComponent extends Component {
  @service fetch;
  @service notifications;
  @service intl;

  @tracked routeSegments = [];
  @tracked isLoading = true;
  @tracked error = null;
  @tracked meta = {};

  constructor() {
    super(...arguments);
    this.loadData.perform();
  }

  /**
   * All columns for route segments
   */
  get columns() {
    return [
      {
        label: this.intl.t('fleet-ops.common.id'),
        valuePath: 'public_id',
        width: '130px',
        cellComponent: 'table/cell/base',
        resizable: true,
        sortable: true,
        filterable: true,
        filterComponent: 'filter/string',
      },
      {
        label: this.intl.t('fleet-ops.operations.orders.route-segments.order-id'),
        valuePath: 'order_public_id',
        width: '110px',
        cellComponent: 'table/cell/base',
        resizable: true,
        sortable: true,
        filterable: true,
        filterComponent: 'filter/string',
      },
      {
        label: this.intl.t('fleet-ops.operations.orders.route-segments.from-location'),
        valuePath: 'from_place_name',
        width: '170px',
        cellComponent: 'table/cell/base',
        resizable: true,
        sortable: true,
        filterable: true,
        filterComponent: 'filter/string',
      },
      {
        label: this.intl.t('fleet-ops.operations.orders.route-segments.to-location'),
        valuePath: 'to_place_name',
        width: '170px',
        cellComponent: 'table/cell/base',
        resizable: true,
        sortable: true,
        filterable: true,
        filterComponent: 'filter/string',
      },
    //   {
    //     label: this.intl.t('fleet-ops.common.created-at'),
    //     valuePath: 'created_at',
    //     sortParam: 'created_at',
    //     filterParam: 'created_at',
    //     width: '140px',
    //     resizable: true,
    //     sortable: true,
    //     filterable: false,
    //     filterComponent: 'filter/date',
    // },
      // {
      //   label: this.intl.t('fleet-ops.operations.orders.index.driver-assigned'),
      //   cellComponent: 'cell/driver-name',
      //   valuePath: 'driver_assigned',
      //   modelPath: 'driver_assigned',
      //   width: '200px',
      //   resizable: true,
      //   sortable: true,
      //   filterable: true,
      //   filterComponent: 'filter/model',
      //   filterComponentPlaceholder: this.intl.t('fleet-ops.operations.orders.index.select-driver'),
      //   filterParam: 'driver',
      //   model: 'driver',
      // }
    ];
  }

  /**
   * Load route segments data
   */
  @task({ restartable: true })
  *loadData() {
    console.log('=== COMPONENT LOADING DATA ===');
    console.log('Payload UUID:', this.args.payloadUuid);

    this.isLoading = true;
    this.error = null;

    try {
      if (!this.args.payloadUuid) {
        throw new Error('No payload UUID provided');
      }

      const url = `orders/${this.args.payloadUuid}/route-segments`;
      console.log('Fetching from URL:', url);

      // Add cache busting
      const response = yield this.fetch.get(url, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Timestamp': Date.now()
        }
      });

      console.log('Component API Response:', response);

      // Extract data from various possible structures
      let segments = [];
      if (Array.isArray(response)) {
        segments = response;
      } else if (response?.data && Array.isArray(response.data)) {
        segments = response.data;
      } else if (response?.routeSegments && Array.isArray(response.routeSegments)) {
        segments = response.routeSegments;
      } else if (response?.route_segments && Array.isArray(response.route_segments)) {
        segments = response.route_segments;
      }

      console.log('Extracted segments:', segments);
      console.log('Segments length:', segments.length);

      this.routeSegments = segments;
      this.meta = response?.meta || response?.pagination || {};
      this.isLoading = false;

      console.log('Component data loaded successfully');

    } catch (error) {
      console.error('Component load error:', error);
      this.error = error.message || 'Failed to load route segments';
      this.routeSegments = [];
      this.isLoading = false;
      this.notifications.serverError(error);
    }
  }

  /**
   * Refresh data
   */
  @action refresh() {
    console.log('Component refresh triggered');
    this.loadData.perform();
  }

  /**
   * Handle search
   */
  @action handleSearch(searchTerm) {
    console.log('Component search:', searchTerm);
    // You can add search logic here or pass it up to parent
    if (this.args.onSearch) {
      this.args.onSearch(searchTerm);
    }
  }
}