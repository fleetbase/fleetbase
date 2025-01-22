import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

export default class ChatWindowLogComponent extends Component {
    @tracked chatLog;
    constructor(owner, { record }) {
        super(...arguments);
        this.chatLog = record;
    }
}
