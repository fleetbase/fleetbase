export default function layerCanBindContextmenu(layer) {
    return typeof layer === 'object' && typeof layer.bindContextMenu === 'function';
}
