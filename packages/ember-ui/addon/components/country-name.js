import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { later } from '@ember/runloop';
import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';

/**
 * Represents the `CountryName` component which fetches and sets the name of a country.
 *
 * @class CountryNameComponent
 * @extends {Component}
 * @memberof @fleetbase/ember-ui
 *
 * @property {Service} fetch - Service for fetching data.
 * @property {string} countryName - The name of the country.
 *
 * @example
 * // Usage:
 * <CountryName @country="US" />
 */
export default class CountryNameComponent extends Component {
    /**
     * Fetch service
     *
     * @type {Service}
     * @memberof CountryNameComponent
     */
    @service fetch;

    /**
     * The country name property.
     *
     * @type {String}
     * @memberof CountryNameComponent
     */
    @tracked countryName;

    /**
     * Creates an instance of CountryNameComponent.
     * @param {ApplicationInstance} owner
     * @param {Object|country=string} { country }
     * @memberof CountryNameComponent
     */
    constructor(owner, { country }) {
        super(...arguments);
        this.setCountryName(country);
    }

    /**
     * Asynchronously sets the country name. If the country code is a 2-letter string,
     * it fetches the country name; otherwise, it uses the country argument as the country name.
     *
     * @private
     * @param {string} country - The country code or country name.
     * @returns {void}
     */
    async setCountryName(country) {
        later(
            this,
            () => {
                if (typeof country === 'string' && country.length === 2) {
                    this.fetch.get(`lookup/country/${country}`).then((response) => {
                        this.countryName = getWithDefault(response, 'name', country);
                    });
                } else {
                    this.countryName = country;
                }
            },
            300
        );
    }
}
