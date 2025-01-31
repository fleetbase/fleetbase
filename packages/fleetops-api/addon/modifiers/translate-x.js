import { modifier } from 'ember-modifier';

export default modifier(function translateX(element, [x, unit = 'rem']) {
    element.style.transform = `translateX(${x}${unit})`;
});
