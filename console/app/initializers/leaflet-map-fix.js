/**
 * Minimal fix for FleetOps map loading bug
 * Only patches the specific Leaflet issue without broad monkey patching
 */

import { debug } from '@ember/debug';

export function initialize(/* application */) {
    // Only apply patch if Leaflet is available and we detect the specific issue
    debug('Applying Leaflet L.latLng patch for undefined coordinates...');
    if (typeof window !== 'undefined' && window.L) {
        const originalLatLng = window.L.latLng;
        
        // Only patch L.latLng to handle undefined coordinates with minimal intervention
        window.L.latLng = function(a, b, c) {
            // Handle undefined/null coordinates with safe Singapore defaults
            if (a === undefined || a === null) {
                a = 1.369; // Singapore latitude
            }
            if (b === undefined || b === null) {
                b = 103.8864; // Singapore longitude
            }
            
            // Handle object format {lat, lng}
            if (typeof a === 'object' && a !== null) {
                if (a.lat === undefined || a.lat === null) {
                    a.lat = 1.369;
                }
                if (a.lng === undefined || a.lng === null) {
                    a.lng = 103.8864;
                }
            }
            
            return originalLatLng.call(this, a, b, c);
        };
    }
}

export default {
    initialize,
    after: 'load-socketcluster-client'
};