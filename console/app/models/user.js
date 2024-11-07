import { set } from '@ember/object';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
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
    @attr('string') role_name;
    @attr('string') type;
    @attr('string') session_status;
    @attr('string') status;
    @attr('string') locale;
    @attr('boolean') is_online;
    @attr('boolean') is_admin;
    @attr('raw') meta;

    /** @relationships */
    @belongsTo('role') role;
    @hasMany('policy') policies;
    @hasMany('permission') permissions;

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
        const fetch = owner.lookup('service:fetch');

        return fetch.patch(`users/deactivate/${this.id}`).then((response) => {
            this.session_status = 'inactive';

            return response;
        });
    }

    activate() {
        const owner = getOwner(this);
        const fetch = owner.lookup('service:fetch');

        return fetch.patch(`users/activate/${this.id}`).then((response) => {
            this.session_status = 'active';

            return response;
        });
    }

    verify() {
        const owner = getOwner(this);
        const fetch = owner.lookup('service:fetch');

        return fetch.patch(`users/verify/${this.id}`).then((response) => {
            set(this, 'email_verified_at', response.email_verified_at);

            return response;
        });
    }

    removeFromCurrentCompany() {
        const owner = getOwner(this);
        const fetch = owner.lookup('service:fetch');

        return fetch.delete(`users/remove-from-company/${this.id}`);
    }

    resendInvite() {
        const owner = getOwner(this);
        const fetch = owner.lookup('service:fetch');

        return fetch.post(`users/resend-invite`, { user: this.id });
    }

    getPermissions() {
        const permissions = [];

        // get direct applied permissions
        if (this.get('permissions')) {
            permissions.pushObjects(this.get('permissions').toArray());
        }

        // get role permissions and role policies permissions
        if (this.get('role')) {
            if (this.get('role.permissions')) {
                permissions.pushObjects(this.get('role.permissions').toArray());
            }

            if (this.get('role.policies')) {
                for (let i = 0; i < this.get('role.policies').length; i++) {
                    const policy = this.get('role.policies').objectAt(i);
                    if (policy.get('permissions')) {
                        permissions.pushObjects(policy.get('permissions').toArray());
                    }
                }
            }
        }

        // get direct applied policy permissions
        if (this.get('policies')) {
            for (let i = 0; i < this.get('policies').length; i++) {
                const policy = this.get('policies').objectAt(i);
                if (policy.get('permissions')) {
                    permissions.pushObjects(policy.get('permissions').toArray());
                }
            }
        }

        return permissions;
    }

    /** @computed */
    @not('isEmailVerified') emailIsNotVerified;
    @not('isPhoneVerified') phoneIsNotVerified;

    /** @computed */
    get allPermissions() {
        return this.getPermissions();
    }

    @computed('meta.two_factor_enabled') get isTwoFactorEnabled() {
        return this.meta && this.meta.two_factor_enabled;
    }

    @computed('is_admin') get isAdmin() {
        return this.is_admin === true;
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
