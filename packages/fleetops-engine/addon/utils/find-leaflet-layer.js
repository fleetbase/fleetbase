export default function findLeafletLayer(map, findCallback) {
    const layers = [];

    map.eachLayer((layer) => {
        layers.push(layer);
    });

    if (typeof findCallback === 'function') {
        return layers.find(findCallback);
    }

    return null;
}
