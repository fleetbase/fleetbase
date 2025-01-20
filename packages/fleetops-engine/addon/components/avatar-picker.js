import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { pluralize } from 'ember-inflector';
import getModelName from '@fleetbase/ember-core/utils/get-model-name';

function isUuid(str) {
    if (typeof str !== 'string') {
        return false;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

export default class AvatarPickerComponent extends Component {
    @service store;
    @tracked model;
    @tracked type;
    @tracked endpoint;

    constructor(owner, { model, endpoint }) {
        super(...arguments);

        this.model = model;
        this.type = getModelName(model);
        this.endpoint = endpoint ?? `${pluralize(this.type)}/avatars`;
    }

    /**
     * Set the selected avatar
     *
     * @param {String} url
     */
    @action selectAvatar(url) {
        // custom avatar file selected
        if (isUuid(url)) {
            return this.store.findRecord('file', url).then((file) => {
                this.model.set('avatar_custom_url', file.url);
                this.model.set('avatar_url', file.id);

                if (typeof this.args.onSelect === 'function') {
                    this.args.onSelect(this.model, file.url);
                }
            });
        }

        // default url
        this.model.set('avatar_url', url);
        this.model.set('avatar_custom_url', null);

        if (typeof this.args.onSelect === 'function') {
            this.args.onSelect(this.model, url);
        }
    }
}
