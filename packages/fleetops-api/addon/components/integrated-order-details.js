import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { equal } from '@ember/object/computed';

export default class IntegratedOrderDetailsComponent extends Component {
    @equal('args.integratedVendor.provider', 'lalamove') isLalamove;
    @tracked skipInPriceBreakdown = ['currency', 'total'];
    @action setupComponent() {}
}
