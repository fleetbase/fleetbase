import loadLeafletPlugins from '@fleetbase/ember-ui/utils/load-leaflet-plugins';

export function initialize() {
    let waitForLeaflet = setInterval(() => {
        let leafletLoaded = window.L !== undefined;
        if (leafletLoaded) {
            loadLeafletPlugins({
                scripts: ['leaflet.contextmenu.js', 'leaflet.draw-src.js'],
                stylesheets: ['leaflet.contextmenu.css', 'leaflet.draw.css'],
                globalIndicatorKey: 'fleetopsLeafletPluginsLoaded',
            });
            clearInterval(waitForLeaflet);
        }
    }, 100);
}

export default {
    initialize,
};
