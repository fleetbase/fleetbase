import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class MapContainerComponent extends Component {
    @tracked mapContainerNodeRef;

    @action setupComponent(element) {
        this.mapContainerNodeRef = element;

        if (typeof this.args.onReady === 'function') {
            this.args.onReady(element);
        }
    }
}
