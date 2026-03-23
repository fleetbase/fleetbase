import CurrentUserService from '@fleetbase/ember-core/services/current-user';

export default class AppCurrentUserService extends CurrentUserService {
    async getUserSnapshot(user) {
        const role = await user.get('role');
        const snapshot = user.serialize({ includeId: true });

        return {
            ...snapshot,
            id: snapshot.uuid,
            company_name: user.get('company_name'),
            role_name: user.get('role_name'),
            role: role
                ? {
                      ...role.serialize({ includeId: true }),
                      id: role.get('id'),
                  }
                : null,
        };
    }

    getCompany() {
        const companyUuid = this.user?.company_uuid ?? this.companyId;

        if (!companyUuid) {
            this.company = null;
            return null;
        }

        this.company = this.store.peekRecord('company', companyUuid);
        return this.company;
    }

    async loadCompany() {
        const companyUuid = this.user?.company_uuid ?? this.companyId;

        if (!companyUuid) {
            return null;
        }

        const company = this.store.peekRecord('company', companyUuid);
        if (company) {
            return company;
        }

        return this.store.findRecord('company', companyUuid);
    }

    getCompanyOption(key, defaultValue = null) {
        if (!this.companyId) {
            return defaultValue;
        }

        return super.getCompanyOption(key, defaultValue);
    }
}
