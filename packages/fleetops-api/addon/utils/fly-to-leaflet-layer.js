import { isBlank } from '@ember/utils';

export default function flyToLeafletLayer(map, layer, zoom, options = {}) {
    if (!map || !layer) {
        return;
    }

    // Check the type of the layer (marker, polygon, etc.) and get its center or bounds
    let targetLatLng;

    if (layer instanceof L.Marker) {
        // For markers, you can directly get the marker's LatLng
        targetLatLng = layer.getLatLng();
    } else {
        // For other types of layers, like polygons or circles, you can calculate the center
        if (layer.getCenter) {
            targetLatLng = layer.getCenter();
        } else if (layer.getBounds) {
            targetLatLng = layer.getBounds().getCenter();
        }
    }

    // set `flyTo` duration
    if (isBlank(options.duration)) {
        options.duration = 5.5;
    }

    // Check if we have a valid LatLng
    if (targetLatLng) {
        map.flyTo(targetLatLng, zoom, options);
    }
}
