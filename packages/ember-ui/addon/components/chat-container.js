import Component from '@glimmer/component';
import { inject as service } from '@ember/service';

export default class ChatContainerComponent extends Component {
    @service chat;
    constructor() {
        super(...arguments);
        this.chat.restoreOpenedChats();
    }
}
