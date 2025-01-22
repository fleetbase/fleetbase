import { get } from '@ember/object';
import { isArray } from '@ember/array';
import { isBlank } from '@ember/utils';
import config from '@fleetbase/console/config/environment';

const isRoutingInCountry = (country, payload, waypoints = []) => {
    if (isBlank(payload)) {
        payload = {};
    }

    let countryCode = null;

    if (get(payload, 'pickup.country') === country || get(payload, 'dropoff.country') === country) {
        countryCode = country;
    }

    if (isArray(waypoints) && !isBlank(waypoints?.firstObject) && get(waypoints?.firstObject, 'place.country') === country) {
        countryCode = country;
    }

    return countryCode === country;
};

export { isRoutingInCountry };

export default function getRoutingHost(payload, waypoints = []) {
    const isRoutingInCanada = isRoutingInCountry('CA', payload, waypoints);
    const isRoutingInUSA = isRoutingInCountry('US', payload, waypoints);

    if (isRoutingInCanada && typeof config.osrm?.servers?.ca === 'string') {
        return config.osrm.servers.ca;
    }

    if (isRoutingInUSA && typeof config.osrm?.servers?.us === 'string') {
        return config.osrm.servers.us;
    }

    return config.osrm.host;
}
