import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import { format as formatDate } from 'date-fns';

export default class ConfigurePlatformApiTokenComponent extends Component {
    @service fetch;
    @service intl;
    @service modalsManager;
    @service notifications;

    @tracked status = null;
    @tracked token = null;

    constructor() {
        super(...arguments);
        this.loadStatus.perform();
    }

    get isConfigured() {
        return Boolean(this.status?.configured);
    }

    get rotatedAt() {
        return this.formatDate(this.status?.rotated_at);
    }

    get lastUsedAt() {
        return this.formatDate(this.status?.last_used_at);
    }

    @action copyToken() {
        if (!this.token) {
            return;
        }

        navigator.clipboard?.writeText(this.token);
        this.notifications.success(this.intl.t('console.admin.platform-api-token.copied'));
    }

    @action generateToken() {
        this.rotateToken.perform(false).catch((error) => {
            this.notifications.serverError(error);
        });
    }

    @action confirmRotateToken() {
        this.modalsManager.confirm({
            title: this.intl.t('console.admin.platform-api-token.rotate-confirm-title'),
            body: this.intl.t('console.admin.platform-api-token.rotate-warning'),
            acceptButtonText: this.intl.t('console.admin.platform-api-token.rotate-token'),
            acceptButtonScheme: 'warning',
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await this.rotateToken.perform(true);
                    return modal.done();
                } catch (error) {
                    modal.stopLoading();
                    return this.notifications.serverError(error);
                }
            },
        });
    }

    @action confirmRevokeToken() {
        this.modalsManager.confirm({
            title: this.intl.t('console.admin.platform-api-token.revoke-confirm-title'),
            body: this.intl.t('console.admin.platform-api-token.revoke-warning'),
            acceptButtonText: this.intl.t('console.admin.platform-api-token.revoke-token'),
            acceptButtonScheme: 'danger',
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await this.revokeToken.perform();
                    return modal.done();
                } catch (error) {
                    modal.stopLoading();
                    return this.notifications.serverError(error);
                }
            },
        });
    }

    @task *loadStatus() {
        try {
            this.status = yield this.fetch.get('settings/platform-api-token');
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *rotateToken(isRotation = false) {
        const response = yield this.fetch.post('settings/platform-api-token');
        this.status = {
            configured: response.configured,
            rotated_at: response.rotated_at,
            last_used_at: response.last_used_at,
        };
        this.token = response.token;
        this.notifications.success(this.intl.t(isRotation ? 'console.admin.platform-api-token.rotated' : 'console.admin.platform-api-token.generated'));
    }

    @task *revokeToken() {
        const response = yield this.fetch.delete('settings/platform-api-token');
        this.status = response;
        this.token = null;
        this.notifications.success(this.intl.t('console.admin.platform-api-token.revoked'));
    }

    formatDate(value) {
        if (!value) {
            return this.intl.t('console.admin.platform-api-token.never');
        }

        return formatDate(new Date(value), 'PP p');
    }
}
