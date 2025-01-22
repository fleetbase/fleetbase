/* eslint-disable no-empty-pattern */
import { modifier } from 'ember-modifier';

export default modifier(function backgroundUrl(element, [url], modifierOptions = {}) {
    const options = {
        overlay: false,
        gradient: 'linear-gradient(0deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3))',
        size: 'cover',
        ...modifierOptions,
    };
    //{ url, overlay: false, gradient: 'linear-gradient(0deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3))', size: 'cover' }
    element.style.background = options.overlay ? `${options.gradient}, url('${url}')` : `url('${url}')`;
    element.style.backgroundSize = options.size;
});
