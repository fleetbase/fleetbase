import LeafletDrawControl from '../components/leaflet-draw-control';

export function initialize(owner) {
    let emberLeafletService = owner.lookup('service:ember-leaflet');

    if (emberLeafletService) {
        // we then invoke the `registerComponent` method
        emberLeafletService.registerComponent('leaflet-draw-control', {
            as: 'draw-control',
            component: LeafletDrawControl,
        });
    }
}

export default {
    initialize,
};
