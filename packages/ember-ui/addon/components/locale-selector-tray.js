import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { debug } from '@ember/debug';
import { task } from 'ember-concurrency-decorators';
import calculatePosition from 'ember-basic-dropdown/utils/calculate-position';

export default class LocaleSelectorTrayComponent extends Component {
    @service intl;
    @service fetch;
    @service media;

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
     * Calculate dropdown content position.
     *
     * @param {HTMLElement} trigger
     * @param {HTMLElement} content
     * @return {Object}
     * @memberof LocaleSelectorTrayComponent
     */
    @action calculatePosition(trigger, content) {
        if (this.media.isMobile) {
            content.classList.add('is-mobile');
            const triggerRect = trigger.getBoundingClientRect();
            const top = triggerRect.height + triggerRect.top;

            return { style: { left: '0px', right: '0px', top, padding: '0 0.5rem', width: '100%' } };
        }

        return calculatePosition(...arguments);
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
        try {
            this.countries = yield this.fetch.get(
                'lookup/countries',
                { columns: ['name', 'cca2', 'flag', 'emoji', 'languages'] },
                { fromCache: true, expirationInterval: 1, expirationIntervalUnit: 'week' }
            );
            this.availableLocales = this._createAvailableLocaleMap();
        } catch (error) {
            debug(`Locale Error: ${error.message}`);
        }
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
        localStorage.setItem('userLocale', locale);
        yield this.fetch.post('users/locale', { locale });
        const cacheBuster = new Date().getTime();
        const url = new URL(window.location.href);
        // Remove existing cacheBuster parameter if it exists
        if (url.searchParams.has('_')) {
            url.searchParams.delete('_');
        }
        // Add the new cacheBuster parameter
        url.searchParams.set('_', cacheBuster);
        // Navigate to the new URL
        window.location.href = url.toString();
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
        const excludedCountryCodes = ['AE'];
        for (let i = 0; i < this.locales.length; i++) {
            const locale = this.locales.objectAt(i);    
            const countryData = this._findCountryDataForLocale(locale);
        
        // Skip if country is in excluded list
            if (countryData && excludedCountryCodes.includes(countryData.cca2)) {
                continue;
            }
            // Option with comments explaining the reasoning
            if(countryData && countryData.language === 'Austro-Bavarian German'){
                // South Tyrol uses Italian as co-official language
                countryData.language = 'Italian';
            }
            if(countryData && countryData.language === 'Catalan'){
                // For most Catalan speakers, Spanish is also an official language
                countryData.language = 'Spanish';
            }
            localeMap[locale] = countryData;
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
