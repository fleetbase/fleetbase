import LeafletTrackingMarkerComponent from '../components/leaflet-tracking-marker';

export function initialize(owner) {
    let emberLeafletService = owner.lookup('service:ember-leaflet');

    if (emberLeafletService) {
        // we then invoke the `registerComponent` method
        emberLeafletService.registerComponent('leaflet-tracking-marker', {
            as: 'tracking-marker',
            component: LeafletTrackingMarkerComponent,
        });
    }
}

export default {
    initialize,
};
