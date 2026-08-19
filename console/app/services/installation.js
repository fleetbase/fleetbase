import Service from '@ember/service';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { later, cancel } from '@ember/runloop';
import window from 'ember-window-mock';

const NOT_CONFIGURED_ERROR = 'fleetbase_not_configured';
const INSTALL_CHANNEL = 'fleetbase.install';
const INSTALLED_EVENT = 'fleetbase.installed';

export default class InstallationService extends Service {
    @service fetch;
    @service router;
    @service socket;

    @tracked status = 'unknown';
    @tracked shouldOnboard = false;
    @tracked isRefreshing = false;

    installChannel = null;
    listenRetry = null;

    async checkOnboarding() {
        try {
            const { should_onboard: shouldOnboard = false } = await this.fetch.get('onboard/should-onboard', {}, { rawError: true });

            this.status = 'configured';
            this.shouldOnboard = shouldOnboard === true;

            return {
                notConfigured: false,
                shouldOnboard: this.shouldOnboard,
            };
        } catch (error) {
            const transition = this.handleNotConfigured(error);

            if (transition) {
                return {
                    notConfigured: true,
                    shouldOnboard: false,
                    transition,
                };
            }

            throw error;
        }
    }

    async redirectIfConfiguredFromInstall() {
        try {
            const { should_onboard: shouldOnboard = false } = await this.fetch.get('onboard/should-onboard', {}, { rawError: true });

            this.status = 'configured';
            this.shouldOnboard = shouldOnboard === true;

            if (this.shouldOnboard) {
                return this.router.transitionTo('onboard');
            }

            return this.router.transitionTo('auth.login');
        } catch (error) {
            if (this.isNotConfiguredError(error)) {
                this.status = 'not-configured';
                this.shouldOnboard = false;

                return false;
            }

            throw error;
        }
    }

    handleError(error) {
        return this.handleNotConfigured(error);
    }

    handleNotConfigured(error) {
        if (!this.isNotConfiguredError(error)) {
            return false;
        }

        this.status = 'not-configured';
        this.shouldOnboard = false;

        return this.transitionToInstall();
    }

    transitionToInstall() {
        if (this.router.currentRouteName === 'install') {
            return true;
        }

        return this.router.transitionTo('install');
    }

    async listenForInstallComplete() {
        // listenRetry holds a runloop timer id, and those are plain integers that can
        // legitimately be 0 — compare against the null sentinel rather than truthiness, or a
        // retry scheduled as timer 0 looks like "nothing pending" and we subscribe twice.
        if (this.installChannel || this.listenRetry !== null) {
            return;
        }

        try {
            const socket = this.socket.instance();
            const channel = socket.subscribe(INSTALL_CHANNEL);

            this.installChannel = channel;

            await channel.listener('subscribe').once();

            for await (let payload of channel) {
                this.handleInstallCompleteEvent(payload);
            }
        } catch (error) {
            if (this.shouldRetrySocketListen(error)) {
                this.scheduleListenRetry();
                return;
            }

            if (!this.isDestroying && !this.isDestroyed) {
                console.warn('[Install] Unable to listen for install completion:', error);
            }
        }
    }

    stopListeningForInstallComplete() {
        // Same reason as above: timer id 0 is falsy but perfectly valid, and skipping the
        // cancel would leave the retry to fire after we have stopped listening.
        if (this.listenRetry !== null) {
            cancel(this.listenRetry);
        }

        if (this.installChannel && typeof this.installChannel.close === 'function') {
            this.installChannel.close();
        }

        this.installChannel = null;
        this.listenRetry = null;
    }

    shouldRetrySocketListen(error) {
        return !this.isDestroying && !this.isDestroyed && error instanceof ReferenceError && error.message?.includes('socketClusterClient');
    }

    scheduleListenRetry() {
        this.listenRetry = later(
            this,
            () => {
                this.listenRetry = null;
                this.listenForInstallComplete();
            },
            300
        );
    }

    handleInstallCompleteEvent(payload) {
        if (payload?.event !== INSTALLED_EVENT || payload?.installed !== true) {
            return;
        }

        this.isRefreshing = true;
        window.location.reload();
    }

    isNotConfiguredError(error) {
        if (!error) {
            return false;
        }

        if (typeof error === 'string') {
            return error === NOT_CONFIGURED_ERROR;
        }

        if (error.error === NOT_CONFIGURED_ERROR || error.code === NOT_CONFIGURED_ERROR || error.message === NOT_CONFIGURED_ERROR) {
            return true;
        }

        if (Array.isArray(error.errors) && error.errors.some((entry) => this.isNotConfiguredError(entry))) {
            return true;
        }

        return [error.payload, error.responseJSON, error.json].some((entry) => this.isNotConfiguredError(entry));
    }
}
