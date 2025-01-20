import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { computed, get, action } from '@ember/object';

export default class OrderPlaceCardComponent extends Component {
    /**
     * Flag to state if place has no name or street1
     *
     * @var {Boolean}
     */
    @computed('args.place.{name,street1}')
    get noTitle() {
        // eslint-disable-next-line ember/no-get
        return !get(this, 'args.place.name') || !get(this, 'args.place.street1');
    }

    /**
     * Action to toggle `showingMeta` flag
     *
     * @void
     */
    @action
    showMeta() {
        this.showingMeta = this.showingMeta ? false : true;
    }

    /**
     * Whether or not to display meta
     *
     * @var {Boolean}
     */
    @tracked showingMeta = false;
}
