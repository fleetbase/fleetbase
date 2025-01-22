/**
 * Represents an icon to provide when creating a marker.
 * More information about its possible options [here](https://leafletjs.com/reference-1.7.1.html#icon-option).
 *
 * @function leafletIcon
 * @param {Object} options the Icon options object
 * @return {Icon}
 */
export default function leafletIcon(options = {}) {
    return L.icon(options);
}
