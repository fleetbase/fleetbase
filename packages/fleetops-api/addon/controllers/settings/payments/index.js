import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { isEmpty } from '@ember/utils';
import { task } from 'ember-concurrency';
import config from 'ember-get-config';

export default class SettingsPaymentsIndexController extends Controller {
    @service fetch;
    @tracked hasStripeConnectAccount = true;
    @tracked table;
    @tracked page = 1;
    @tracked limit = 30;
    @tracked sort = '-created_at';
    @tracked query = null;
    queryParams = ['page', 'limit', 'sort', 'query'];
    columns = [
        {
            label: 'Purchase Rate ID',
            valuePath: 'public_id',
            cellComponent: 'click-to-copy',
            width: '20%',
        },
        {
            label: 'Service Quote',
            valuePath: 'service_quote_id',
            cellComponent: 'click-to-copy',
            width: '20%',
        },
        {
            label: 'Order',
            valuePath: 'order_id',
            cellComponent: 'click-to-copy',
            width: '20%',
        },
        {
            label: 'Customer',
            valuePath: 'customer.name',
            width: '20%',
        },
        {
            label: 'Amount',
            valuePath: 'amount',
            cellComponent: 'table/cell/currency',
            width: '20%',
        },
        {
            label: 'Date',
            valuePath: 'created_at',
            width: '20%',
        },
    ];

    get isStripeEnabled() {
        return window.stripeInstance !== undefined || !isEmpty(config.stripe.publishableKey);
    }

    @task *lookupStripeConnectAccount() {
        try {
            const { hasStripeConnectAccount } = yield this.fetch.get('fleet-ops/payments/has-stripe-connect-account');
            this.hasStripeConnectAccount = hasStripeConnectAccount;
        } catch (error) {
            this.hasStripeConnectAccount = false;
        }
    }
}
