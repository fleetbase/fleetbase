import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class OrderBoardComponent extends Component {
    /**
     * Inject the `fetch` service
     *
     * @var {Service}
     */
    @service fetch;

    @tracked type;
    @tracked orderTypes = [];
    @tracked columns = [];

    constructor() {
        super(...arguments);
        this.loadOrderTypes();
    }

    /**
     * Fetches the available order types from the server and updates the
     * `orderTypes` property with the retrieved data. If the `type` query
     * parameter is set (bound to `this.type`), it also finds and sets the
     * corresponding selected order type in `selectedOrderType`.
     *
     * @action
     * @returns {Promise} A promise that resolves when the order types have been loaded
     */
    @action loadOrderTypes() {
        return this.fetch.get('orders/types').then((types) => {
            this.orderTypes = types;

            if (typeof this.args.onTypesLoaded === 'function') {
                this.args.onTypesLoaded(types);
            }

            if (typeof this.args.type === 'string') {
                const selectedType = types.find(({ key }) => key === this.args.type);

                if (selectedType) {
                    this.selectOrderType(selectedType);
                }
            }
        });
    }

    /**
     * Selectes the order type.
     *
     * @action
     * @param {Object} type
     * @memberof OrderBoardComponent
     */
    @action selectOrderType(type) {
        this.type = type;
        this.setColumnsFromOrderType(type);

        if (typeof this.args.onOrderTypeChanged === 'function') {
            this.args.onOrderTypeChanged(type);
        }
    }

    @action setColumnsFromOrderType(type) {
        const columns = [];

        for (let event in type.meta.flow) {
            if (!event.includes('|')) {
                columns.push(event);
            }
        }

        columns.push('canceled');
        columns.push('completed');

        this.columns = columns;
        return this.columns;
    }
}
