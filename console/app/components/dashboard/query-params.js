import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class DashboardQueryParamsComponent extends Component {
    @tracked changedParams = {};

    @action onChange(param, value) {
        const component = this.args.params[param].component;

        if (component === 'date-picker') {
            value = value.formattedDate;
        }

        this.changedParams = { ...this.changedParams, [param]: value };

        if (typeof this.args.onChange === 'function') {
            this.args.onChange(this.changedParams);
        }
    }
}
