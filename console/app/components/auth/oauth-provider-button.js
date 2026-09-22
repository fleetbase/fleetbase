import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class AuthOauthProviderButtonComponent extends Component {
    @action onClick(provider) {
        if (typeof this.args.onClick === 'function') {
            this.args.onClick(provider);
        }
    }
}
