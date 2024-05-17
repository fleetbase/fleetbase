import Model, { attr } from '@ember-data/model';
import { computed, get } from '@ember/object';
import { not } from '@ember/object/computed';
import { getOwner } from '@ember/application';
import { format, formatDistanceToNow, isValid } from 'date-fns';
import config from 'ember-get-config';

export default class UserModel extends Model {
    /** @ids */
    @attr('string') public_id;
    @attr('string') company_uuid;
    @attr('string') avatar_uuid;

    /** @attributes */
    @attr('string') name;
    @attr('string', { defaultValue: get(config, 'defaultValues.userImage') }) avatar_url;
    @attr('string') email;
    @attr('string') password;
    @attr('string') phone;
    @attr('string') company_name;
    @attr('string') date_of_birth;
    @attr('string') timezone;
    @attr('string') country;
    @attr('string') ip_address;
    @attr('string') slug;
    @attr('string') type;
    @attr('string') session_status;
    @attr('string') status;
    @attr('boolean') is_online;
    @attr('boolean') is_admin;
    @attr('raw') types;
    @attr('raw') meta;

    /** @dates */
    @attr('date') last_seen_at;
    @attr('date') phone_verified_at;
    @attr('date') email_verified_at;
    @attr('date') last_login;
    @attr('date') deleted_at;
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @methods */
    deactivate() {
        const owner = getOwner(this);
        const fetch = owner.lookup(`service:fetch`);

        return fetch.patch(`users/deactivate/${this.id}`).then((response) => {
            this.session_status = 'inactive';

            return response;
        });
    }

    activate() {
        const owner = getOwner(this);
        const fetch = owner.lookup(`service:fetch`);

        return fetch.patch(`users/activate/${this.id}`).then((response) => {
            this.session_status = 'active';

            return response;
        });
    }

    removeFromCurrentCompany() {
        const owner = getOwner(this);
        const fetch = owner.lookup(`service:fetch`);

        return fetch.delete(`users/remove-from-company/${this.id}`);
    }

    resendInvite() {
        const owner = getOwner(this);
        const fetch = owner.lookup(`service:fetch`);

        return fetch.post(`users/resend-invite`, { user: this.id });
    }

    /** @computed */
    @not('isEmailVerified') emailIsNotVerified;
    @not('isPhoneVerified') phoneIsNotVerified;

    /** @computed */
    @computed('meta.two_factor_enabled') get isTwoFactorEnabled() {
        return this.meta && this.meta.two_factor_enabled;
    }

    @computed('types') get typesList() {
        const types = Array.from(this.types);
        return types.join(', ');
    }

    @computed('email_verified_at') get isEmailVerified() {
        return this.email_verified_at && isValid(new Date(this.email_verified_at));
    }

    @computed('phone_verified_at') get isPhoneVerified() {
        return this.phone_verified_at && isValid(new Date(this.phone_verified_at));
    }

    @computed('last_login') get lastLogin() {
        if (!this.last_login || !isValid(this.last_login)) {
            return 'Never';
        }

        return format(this.last_login, 'PP p');
    }

    @computed('updated_at') get updatedAgo() {
        if (!isValid(this.updated_at)) {
            return '-';
        }
        return formatDistanceToNow(this.updated_at);
    }

    @computed('updated_at') get updatedAt() {
        if (!isValid(this.updated_at)) {
            return '-';
        }
        return format(this.updated_at, 'PPP p');
    }

    @computed('updated_at') get updatedAtShort() {
        if (!isValid(this.updated_at)) {
            return '-';
        }
        return format(this.updated_at, 'PP');
    }

    @computed('created_at') get createdAgo() {
        if (!isValid(this.created_at)) {
            return '-';
        }
        return formatDistanceToNow(this.created_at);
    }

    @computed('created_at') get createdAt() {
        if (!isValid(this.created_at)) {
            return '-';
        }
        return format(this.created_at, 'PPP p');
    }

    @computed('created_at') get createdAtShort() {
        if (!isValid(this.created_at)) {
            return '-';
        }
        return format(this.created_at, 'PP');
    }
}
