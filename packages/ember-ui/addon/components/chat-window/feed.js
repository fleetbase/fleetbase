import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class ChatWindowFeedComponent extends Component {
    @tracked channelFeedContainerElement;
    @tracked channelFeedElement;

    @action setChannelFeedElements(channelFeedElement) {
        this.channelFeedElement = channelFeedElement;
        this.channelFeedContainerElement = channelFeedElement.parentNode;
    }
}
