import Component from '@glimmer/component';
import { computed } from '@ember/object';

export default class ModelSelectOptionsComponent extends Component {
    @computed('args.{infiniteScroll,infiniteModel,select.loading}')
    get showLoader() {
        return this.args.infiniteScroll && this.args.infiniteModel && !this.args.select.loading;
    }
}
