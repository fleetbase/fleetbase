export default function getLeafletLayerById(map, layerId) {
    let targetLayer = null;

    map.eachLayer((layer) => {
        // Check if the layer has an ID property
        if (layer.options && layer.options.id === layerId) {
            targetLayer = layer;
        }
    });

    return targetLayer;
}
