import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';

/**
 * Service for managing loading overlays.
 *
 * @class LoaderService
 * @extends Service
 */
export default class LoaderService extends Service {
    /**
     * Tracks the routes that have been loaded.
     *
     * @type {Array}
     * @tracked
     */
    @tracked routesLoaded = [];

    /**
     * Shows the loader based on a condition.
     *
     * @param {String|HTMLElement} target - The loader target.
     * @param {Object} options - Options for controlling the loader.
     * @param {Function|null} condition - The condition to evaluate.
     */
    showOnCondition(target, options = {}, condition = null) {
        if (typeof condition === 'function') {
            condition = condition();
        }

        if (condition) {
            this.showLoader(target, options);
        }
    }

    /**
     * Shows loader during the initial route transition.
     *
     * @param {Object} transition - The Ember.js transition object.
     * @param {String|HTMLElement} target - The loader target.
     * @param {Object} options - Options for controlling the loader.
     */
    showOnInitialTransition(transition, target, options = { loadingMessage: 'Loading...', opacity: 0.1 }) {
        const route = transition.to.name;
        const isSameRoute = transition.from ? transition.to.name === transition.from.name : false;

        if (!this.routesLoaded.includes(route) || !isSameRoute) {
            if (document.querySelectorAll('.overloader').length > 0) {
                return;
            }

            this.showLoader(target, options);

            transition.finally(() => {
                this.removeLoader(target);
            });
        }

        this.routesLoaded.pushObject(route);
    }

    /**
     * Creates an HTML element node for a loading overlay with a message.
     *
     * @param {String|HTMLElement} targetSelector - The loader target.
     * @param {Object} options - Options for controlling the loader.
     * @returns {HTMLElement} - The loader element.
     */
    showLoader(targetSelector, options = {}) {
        let target = typeof targetSelector === 'string' ? document.querySelector(targetSelector) : targetSelector;

        if (!target) {
            target = document.body;
        }

        const loadingMessage = typeof options.loadingMessage === 'string' ? options.loadingMessage : 'Loading...';
        const opacity = typeof options.opacity === 'number' ? options.opacity : 0;
        const isDarkMode = document.body.dataset.theme ? document.body.dataset.theme === 'dark' : true;
        const preserveTargetPosition = options.preserveTargetPosition === true;
        const loaderContainerClass = options.loaderContainerClass ?? '';

        if (!preserveTargetPosition) {
            target.style.position = 'relative';
        }

        let loader = document.createElement('div');
        loader.classList.add('overloader');
        loader.style.backgroundColor = isDarkMode ? `rgba(128, 128, 128, ${opacity})` : `rgba(249, 250, 251, ${opacity})`;
        loader.innerHTML = `<div class="loader-container flex items-center justify-center text-center ${loaderContainerClass}">
            <div>
                <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" role="img" focusable="false" aria-hidden="true" data-icon="spinner-third" data-prefix="fad" id="ember240" class="svg-inline--fa fa-spinner-third fa-w-16 fa-spin ember-view text-[black] fa-spin-800ms mr-3"><g class="fa-group"><path class="fa-secondary" fill="currentColor" d="M478.71 364.58zm-22 6.11l-27.83-15.9a15.92 15.92 0 0 1-6.94-19.2A184 184 0 1 1 256 72c5.89 0 11.71.29 17.46.83-.74-.07-1.48-.15-2.23-.21-8.49-.69-15.23-7.31-15.23-15.83v-32a16 16 0 0 1 15.34-16C266.24 8.46 261.18 8 256 8 119 8 8 119 8 256s111 248 248 248c98 0 182.42-56.95 222.71-139.42-4.13 7.86-14.23 10.55-22 6.11z"></path><path class="fa-primary" fill="currentColor" d="M271.23 72.62c-8.49-.69-15.23-7.31-15.23-15.83V24.73c0-9.11 7.67-16.78 16.77-16.17C401.92 17.18 504 124.67 504 256a246 246 0 0 1-25 108.24c-4 8.17-14.37 11-22.26 6.45l-27.84-15.9c-7.41-4.23-9.83-13.35-6.2-21.07A182.53 182.53 0 0 0 440 256c0-96.49-74.27-175.63-168.77-183.38z"></path></g>
                </svg>
            </div>

            <span class="font-semibold text-gray-700 dark:text-gray-100 test-xs md:text-sm">${loadingMessage}</span>
        </div>`;

        target.appendChild(loader);

        return loader;
    }

    /**
     * Shows a loader on the document body.
     *
     * @param {Object} options - Options for controlling the loader.
     * @returns {HTMLElement} - The loader element.
     */
    show(options = { loadingMessage: 'Loading...', opacity: 0.1 }) {
        return this.showLoader(document.body, options);
    }

    /**
     * Removes a loader from a target.
     *
     * @param {String|HTMLElement} targetSelector - The loader target.
     * @returns {Service} - The current service instance.
     */
    removeLoader(targetSelector) {
        let target = typeof targetSelector === 'string' ? document.querySelector(targetSelector) : targetSelector;
        const removeStyle = (el, styleProperty) => {
            if (el.style.removeProperty) {
                el.style.removeProperty(styleProperty);
            } else {
                el.style.removeAttribute(styleProperty);
            }
        };

        if (!target) {
            target = document.body;
        }

        if (target.classList.contains('overloader')) {
            target.remove();

            return this;
        }

        const loader = target.querySelector('.overloader');

        if (!loader) {
            return;
        }

        removeStyle(target, 'position');
        target.removeChild(loader);

        return this;
    }

    /**
     * Removes all loader instances after a delay.
     *
     * @param {Number} delay - The delay in milliseconds.
     * @returns {Service} - The current service instance.
     */
    remove(delay = 0) {
        const loaders = document.querySelectorAll(`.overloader`);

        later(
            this,
            () => {
                loaders.forEach((loader) => {
                    loader.remove();
                });
            },
            delay
        );

        return this;
    }
}
