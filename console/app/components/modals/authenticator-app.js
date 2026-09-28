import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';

/**
 * Sets up, removes, or issues new recovery codes for the current user's authenticator app.
 * Every flow starts by checking the current password.
 *
 * Options:
 * - `mode`: `setup` (default), `recovery-codes` or `disable`
 * - `onChanged(response)`: called once the server has made the change
 * - `onClosed(changed)`: called when the modal closes
 */
export default class ModalsAuthenticatorAppComponent extends Component {
    @service fetch;
    @service notifications;
    // The constructor assigns the modal's options straight away, so this initializer
    // never runs.
    /* istanbul ignore next -- always assigned before first read */
    @tracked options = {};
    @tracked step = 'password';
    @tracked password;
    @tracked code;
    @tracked setup;
    @tracked recoveryCodes = [];
    changed = false;

    constructor(owner, { options }) {
        super(...arguments);
        this.options = options;
        this.setupOptions();
    }

    get mode() {
        return this.options.mode ?? 'setup';
    }

    get formattedSecret() {
        return (this.setup?.secret ?? '').replace(/(.{4})/g, '$1 ').trim();
    }

    setupOptions() {
        const titles = {
            setup: 'Set up an authenticator app',
            'recovery-codes': 'New recovery codes',
            disable: 'Remove authenticator app',
        };

        this.options.title = titles[this.mode];
        this.options.acceptButtonText = this.mode === 'disable' ? 'Remove authenticator app' : 'Continue';
        this.options.acceptButtonScheme = this.mode === 'disable' ? 'danger' : 'primary';
        this.options.keepOpen = true;
        this.options.confirm = (modal, done) => this.next.perform(modal, done);
        this.options.decline = (modal, done) => this.close(done);
    }

    @action close(done) {
        if (typeof this.options.onClosed === 'function') {
            this.options.onClosed(this.changed);
        }

        return done();
    }

    @task *next(modal, done) {
        modal.startLoading();

        try {
            if (this.step === 'password') {
                return yield this.submitPassword(modal, done);
            }

            if (this.step === 'scan') {
                const response = yield this.fetch.post('users/two-fa/authenticator/confirm', { code: this.code });
                this.markChanged(response);
                this.showRecoveryCodes(modal, response.recovery_codes);
                return;
            }

            // The recovery codes have been shown; closing finishes the flow
            return this.close(done);
        } catch (error) {
            this.notifications.serverError(error);
        } finally {
            modal.stopLoading();
        }
    }

    async submitPassword(modal, done) {
        const password = this.password;

        if (this.mode === 'disable') {
            const response = await this.fetch.post('users/two-fa/authenticator/disable', { password });
            this.markChanged(response);
            this.notifications.success('Authenticator app removed.');
            return this.close(done);
        }

        if (this.mode === 'recovery-codes') {
            const response = await this.fetch.post('users/two-fa/recovery-codes', { password });
            this.markChanged(response);
            return this.showRecoveryCodes(modal, response.recovery_codes);
        }

        this.setup = await this.fetch.post('users/two-fa/authenticator/setup', { password });
        this.step = 'scan';
        modal.setOption('acceptButtonText', 'Verify code');
    }

    markChanged(response) {
        this.changed = true;
        this.password = undefined;

        if (typeof this.options.onChanged === 'function') {
            this.options.onChanged(response);
        }
    }

    showRecoveryCodes(modal, recoveryCodes = []) {
        this.recoveryCodes = recoveryCodes;
        this.step = 'recovery-codes';
        modal.setOption('acceptButtonText', "I've saved my recovery codes");
        modal.setOption('hideDeclineButton', true);
    }

    @action async copyRecoveryCodes() {
        try {
            await navigator.clipboard.writeText(this.recoveryCodes.join('\n'));
            this.notifications.success('Recovery codes copied.');
        } catch {
            this.notifications.error('Could not copy. Select the codes and copy them instead.');
        }
    }

    @action downloadRecoveryCodes() {
        const blob = new Blob([`Recovery codes\n\n${this.recoveryCodes.join('\n')}\n\nEach code can be used once.\n`], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'recovery-codes.txt';
        link.click();
        URL.revokeObjectURL(url);
    }
}
