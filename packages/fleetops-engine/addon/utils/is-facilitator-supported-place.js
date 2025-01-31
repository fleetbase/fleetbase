import { isEmpty } from '@ember/utils';
import { isArray } from '@ember/array';

export default function isFacilitatorSupportedPlace(facilitator, place) {
    const supportedCountries = facilitator?.get('supported_countries');
    const country = place?.get('country');

    if (isEmpty(supportedCountries) || isEmpty(country)) {
        return true;
    }

    return isArray(supportedCountries) && supportedCountries.includes(country);
}
