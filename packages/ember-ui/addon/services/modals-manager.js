import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action, set, get, getProperties, setProperties } from '@ember/object';
import { assert } from '@ember/debug';
import { isArray } from '@ember/array';
import { defer } from 'rsvp';

const { assign } = Object;

export default class ModalsManagerService extends Service {
    @tracked modalIsOpened = false;
    @tracked modalDefer = null;
    @tracked componentToRender = null;
    @tracked options = {};
    @tracked defaultOptions = {
        title: null,
        body: null,
        footer: null,
        confirmButtonDefaultText: 'Yes',
        confirmButtonFulfilledText: 'Yes',
        confirmButtonPendingText: 'Yes',
        confirmButtonRejectedText: 'Yes',
        declineButtonDefaultText: 'No',
        declineButtonFulfilledText: 'No',
        declineButtonPendingText: 'No',
        declineButtonRejectedText: 'No',
        cancel: 'Cancel',
        backdrop: true,
        backdropClose: true,
        backdropTransitionDuration: 150,
        fade: true,
        keyboard: true,
        position: 'top',
        renderInPlace: false,
        scrollable: false,
        size: null,
        transitionDuration: 300,
        confirmIsActive: false,
        confirmButtonSize: 'md',
        confirmButtonType: 'primary',
        confirmIconActive: '',
        confirmIconInactive: '',
        declineIsActive: false,
        declineButtonSize: 'md',
        declineButtonType: 'secondary',
        declineIconActive: '',
        declineIconInactive: '',
        modalClass: '',
    };

    /**
     * @throws {Error} if some modal is already opened
     * @param componentToRender Component's child-class represents needed modal
     * @param options options passed to the rendered modal
     */
    @action show(componentToRender, options) {
        if (this.modalIsOpened) {
            // Set this to false to allow a new modal to open
            this.modalIsOpened = false;
            // If there's an active defer, resolve it
            if (this.modalDefer) {
                this.modalDefer.resolve(this);
                this.modalDefer = null;
            }
            // Clear existing options
            this.clearOptions();
        }
        // assert('Only one modal may be opened in the same time!', !this.modalIsOpened);

        const component = componentToRender;
        const opts = assign({}, this.defaultOptions, options);
        this.componentToRender = component;
        this.modalIsOpened = true;
        this.options = opts;
        const modalDefer = defer();
        this.modalDefer = modalDefer;
        return modalDefer.promise;
    }

    /**
     * Shows a confirmation dialog
     *
     * @method confirm
     * @param {object} options
     * @return {RSVP.Promise}
     */
    @action confirm(options = {}) {
        let modalClass = 'flb--confirm-modal modal-sm';

        if (typeof options.modalClass === 'string') {
            modalClass = `flb--confirm-modal ${options.modalClass}`;
        }

        options = assign(options, {
            hideTitle: true,
            modalClass,
        });
        return this.show('modal/layouts/confirm', options);
    }

    /**
     * Shows a alert dialog
     */
    @action alert(options = {}) {
        let modalClass = 'flb--alert-modal modal-sm';

        if (typeof options.modalClass === 'string') {
            modalClass = `flb--alert-modal ${options.modalClass}`;
        }

        options = assign(options, {
            hideTitle: true,
            hideAcceptButton: true,
            declineButtonText: 'OK',
            modalClass,
        });

        return this.show('modal/layouts/alert', options);
    }

    /**
     * Shows a prompt dialog
     */
    @action prompt(options = {}) {
        return this.show('modal/layouts/prompt', options);
    }

    /**
     * Shows a bulk action dialog
     */
    @action bulk(options = {}) {
        return this.show('modal/layouts/bulk-action', options);
    }

    /**
     * Shows a progress dialog
     * @category Default Modals
     * @throws {Error} if `options.promises` is not an array
     */
    @action progress(options = {}) {
        assert('`options.promises` must be an array', options && isArray(options.promises));
        return this.show('modal/layouts/progress', options);
    }

    /**
     * Shows a process dialog
     * @category Default Modals
     * @throws {Error} if `options.process` is not defined
     */
    @action process(options = {}) {
        assert('`options.process` must be defined', !!(options && options?.process));
        return this.show('modal/layouts/process', options);
    }

    /**
     * Shows a loading dialog
     *
     * @method confirm
     * @param {object} options
     * @return {RSVP.Promise}
     */
    @action async displayLoader(options = {}) {
        await this.done();

        this.show('modal/layouts/loading', { title: 'Loading...', ...options });
    }

    /**
     * Alias for showing a loading dialog
     *
     * @method confirm
     * @param {object} options
     * @return {RSVP.Promise}
     */
    @action async loader(options = {}) {
        return this.displayLoader(options);
    }

    /**
     * Shows a dialog that allows user to select options from prompt
     *
     * @method confirm
     * @param {object} options
     * @return {RSVP.Promise}
     */
    @action async userSelectOption(title, promptOptions = [], modalOptions = {}) {
        await this.done();

        return new Promise((resolve) => {
            const selected = null;

            this.show('modal/layouts/option-prompt', {
                title,
                promptOptions,
                selected,
                selectOption: (event) => {
                    const { value } = event.target;

                    this.setOption('selected', value);
                },
                confirm: () => {
                    this.startLoading();
                    const selected = this.getOption('selected');

                    this.done();
                    resolve(selected);
                },
                decline: () => {
                    this.done();
                    resolve(null);
                },
                ...modalOptions,
            });
        });
    }

    /**
     * Same as onClickConfirm but allows a handler to run then resolve by user
     *
     * @param {EbmmModalOptions} v
     */
    @action onClickConfirmWithDone() {
        const done = this.done.bind(this, this, 'onConfirm');
        const { confirm, keepOpen } = this.options;

        if (typeof confirm === 'function') {
            const response = confirm(this, done);

            // hack keep dialog open until hold is true
            if (keepOpen === true) {
                return;
            }

            if (response && typeof response.then === 'function') {
                return response.finally(() => {
                    return done();
                });
            }
            return;
        }

        return done();
    }

    /**
     * Same as onClickDecline but allows a handler to run then resolve by user
     *
     * @param {EbmmModalOptions} v
     */
    @action onClickDeclineWithDone() {
        const done = this.done.bind(this, this, 'onDecline');
        const { decline, keepOpen } = this.options;

        if (typeof decline === 'function') {
            const response = decline(this, done);

            // hack keep dialog open until hold is true
            if (keepOpen === true) {
                return;
            }

            if (response && typeof response.then === 'function') {
                return response.finally(() => {
                    return done();
                });
            }
            return;
        }

        return done();
    }

    /**
     * Closes the modal and cleans up
     *
     * @void
     */
    @action done(instance, action) {
        return new Promise((resolve) => {
            const callback = get(this, `options.${action}`);
            const onFinish = get(this, `options.onFinish`);

            set(this, 'modalIsOpened', false);
            this.modalDefer?.resolve(this);
            this.clearOptions();

            if (typeof callback === 'function') {
                callback(this.options);
            }

            if (typeof onFinish === 'function') {
                onFinish(this.options);
            }

            resolve(true);
        });
    }

    /**
     * Retrieves an option
     *
     * @param {String} key
     * @param {Mixed} defaultValue
     * @return {Mixed}
     */
    @action getOption(key, defaultValue = null) {
        if (isArray(key)) {
            return this.getOptions(key);
        }

        const value = get(this.options, key);
        if (value === undefined) {
            return defaultValue;
        }

        return value;
    }

    /**
     * Allows multiple options to be get
     *
     * @param {Object} options
     * @void
     */
    @action getOptions(props = []) {
        if (props?.length === 0) {
            return this.options ?? {};
        }

        return getProperties(this.options, props);
    }

    /**
     * Updates an option in the service
     *
     * @param {String} key
     * @param {Mixed} value
     * @void
     */
    @action setOption(key, value) {
        set(this.options, key, value);
    }

    /**
     * Allows multiple options to be updated
     *
     * @param {Object} options
     * @void
     */
    @action setOptions(options = {}) {
        setProperties(this.options, options);
    }

    /**
     * Executes a function passed in options
     *
     * @void
     */
    @action invoke(fn, ...params) {
        const callable = get(this.options, fn);

        if (typeof callable === 'function') {
            return callable(...params);
        }

        return null;
    }

    /**
     * Alias to start loading indicator on modal
     *
     * @void
     */
    @action startLoading() {
        this.setOption('isLoading', true);
    }

    /**
     * Alias to stop loading indicator on modal
     *
     * @void
     */
    @action stopLoading() {
        this.setOption('isLoading', false);
    }

    /**
     * Clear modalsManager options.
     *
     * @memberof ModalsManagerService
     */
    @action clearOptions() {
        this.options = {};
    }
}
