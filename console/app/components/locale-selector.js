import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency-decorators';

export default class LocaleSelectorComponent extends Component {
    /**
     * Inject the intl service.
     *
     * @memberof LocaleSelectorComponent
     */
    @service intl;

    /**
     * Inject the intl service.
     *
     * @memberof LocaleSelectorComponent
     */
    @service fetch;

    /**
     * Tracks all the available locales.
     *
     * @memberof LocaleSelectorComponent
     */
    @tracked locales = [];

    /**
     * All available countries data.
     *
     * @memberof LocaleSelectorComponent
     */
    @tracked countries = [];

    /**
     * The current locale in use.
     *
     * @memberof LocaleSelectorComponent
     */
    @tracked currentLocale;

    /**
     * Creates an instance of LocaleSelectorComponent.
     * @memberof LocaleSelectorComponent
     */
    constructor() {
        super(...arguments);

        this.locales = this.intl.locales;
        this.currentLocale = this.intl.primaryLocale;
        this.loadAvailableCountries.perform();

        // Check for locale change
        this.intl.onLocaleChanged(() => {
            this.currentLocale = this.intl.primaryLocale;
        });
    }

    /**
     * Handles the change of locale.
     * @param {string} selectedLocale - The selected locale.
     * @returns {void}
     * @memberof LocaleSelectorComponent
     * @method changeLocale
     * @instance
     * @action
     */
    @action changeLocale(selectedLocale) {
        this.currentLocale = selectedLocale;
        this.intl.setLocale(selectedLocale);
        // Persist to server
        this.saveUserLocale.perform(selectedLocale);
    }

    /**
     * Loads available countries asynchronously.
     * @returns {void}
     * @memberof LocaleSelectorComponent
     * @method loadAvailableCountries
     * @instance
     * @task
     * @generator
     */
    @task *loadAvailableCountries() {
        this.countries = yield this.fetch.get('lookup/countries', { columns: ['name', 'cca2', 'flag', 'emoji', 'languages'] });
        this.availableLocales = this._createAvailableLocaleMap();
    }

    /**
     * Saves the user's selected locale to the server.
     * @param {string} locale - The user's selected locale.
     * @returns {void}
     * @memberof LocaleSelectorComponent
     * @method saveUserLocale
     * @instance
     * @task
     * @generator
     */
    @task *saveUserLocale(locale) {
        yield this.fetch.post('users/locale', { locale });
    }

    /**
     * Creates a map of available locales.
     * @private
     * @returns {Object} - The map of available locales.
     * @memberof LocaleSelectorComponent
     * @method _createAvailableLocaleMap
     * @instance
     */
    _createAvailableLocaleMap() {
        const localeMap = {};

        for (let i = 0; i < this.locales.length; i++) {
            const locale = this.locales.objectAt(i);

            localeMap[locale] = this._findCountryDataForLocale(locale);
        }

        return localeMap;
    }

    /**
     * Finds country data for a given locale.
     * @private
     * @param {string} locale - The locale to find country data for.
     * @returns {Object|null} - The country data or null if not found.
     * @memberof LocaleSelectorComponent
     * @method _findCountryDataForLocale
     * @instance
     */
    _findCountryDataForLocale(locale) {
        const localeCountry = locale.split('-')[1];
        const country = this.countries.find((country) => country.cca2.toLowerCase() === localeCountry);

        if (country) {
            // get the language
            country.language = Object.values(country.languages)[0];
        }

        return country;
    }
}
