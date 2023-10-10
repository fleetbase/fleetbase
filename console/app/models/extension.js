import Model, { attr } from '@ember-data/model';
import { computed } from '@ember/object';
import { notEmpty } from '@ember/object/computed';
import { getOwner } from '@ember/application';
import { format, formatDistanceToNow } from 'date-fns';

export default class ExtensionModel extends Model {
    /** @ids */
    @attr('string') uuid;
    @attr('string') author_uuid;
    @attr('string') category_uuid;
    @attr('string') type_uuid;
    @attr('string') icon_uuid;
    @attr('string') extension_id;

    /** @relationships */

    /** @attributes */
    @attr('string') name;
    @attr('string') display_name;
    @attr('string') description;
    @attr('string') icon_url;
    @attr('string') namespace;
    @attr('string') key;
    @attr('string') internal_route;
    @attr('string') fa_icon;
    @attr('string') version;
    @attr('string') website_url;
    @attr('string') privacy_policy_url;
    @attr('string') tos_url;
    @attr('string') contact_email;
    @attr('string') domains;
    @attr('string') type_name;
    @attr('string') category_name;
    @attr('string') author_name;
    @attr('number') install_count;
    @attr('string') secret;
    @attr('string') client_token;
    @attr('string') status;
    @attr('string') slug;

    /** @boolean */
    @attr('boolean') core_service;
    @attr('boolean') is_installed;
    @attr('boolean') installed;

    /** @json */
    @attr('raw') tags;
    @attr('raw') meta;
    @attr('raw') config;

    /** @dates */
    @attr('date') deleted_at;
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @methods */
    toJSON() {
        const json = {};

        this.eachAttribute((key) => {
            json[key] = this[key];
        });

        return json;
    }

    install() {
        const owner = getOwner(this);
        const fetch = owner.lookup(`service:fetch`);

        return new Promise((resolve, reject) => {
            fetch
                .post('installer/install', {
                    extension: this.id,
                })
                .then((response) => {
                    this.is_installed = true;
                    resolve(response);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    uninstall() {
        const owner = getOwner(this);
        const fetch = owner.lookup(`service:fetch`);

        return new Promise((resolve, reject) => {
            fetch
                .post('installer/uninstall', {
                    extension: this.id,
                })
                .then((response) => {
                    this.is_installed = false;
                    resolve(response);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    /** @computed */
    @notEmpty('icon_uuid') hasIcon;

    @computed('updated_at') get updatedAgo() {
        return formatDistanceToNow(this.updated_at);
    }

    @computed('updated_at') get updatedAt() {
        return format(this.updated_at, 'PPP p');
    }

    @computed('updated_at') get updatedAtShort() {
        return format(this.updated_at, 'PP');
    }

    @computed('created_at') get createdAgo() {
        return formatDistanceToNow(this.created_at);
    }

    @computed('created_at') get createdAt() {
        return format(this.created_at, 'PPP p');
    }

    @computed('created_at') get createdAtShort() {
        return format(this.created_at, 'PP');
    }
}
