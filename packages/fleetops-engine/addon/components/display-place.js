import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class DisplayPlaceComponent extends Component {
    @tracked ref;

    @action setupComponent(element) {
        this.ref = element;
    }
}
