import { modifier } from 'ember-modifier';
import numbersOnly from '../utils/numbers-only';

export default modifier(function setHeight(element, [height]) {
    if (height === undefined || height === null) {
        return;
    }

    let heightValue = height;
    let unit = '';

    // Check if height is a string with a unit
    if (typeof height === 'string') {
        const match = height.match(/^(\d+(?:\.\d+)?)(\D+)?$/);
        if (match !== null) {
            heightValue = match[1];
            unit = match[2] || '';
        }
    }

    // Convert the height value to pixels
    if (unit === 'em') {
        heightValue *= 16; // 1em = 16px
    } else if (unit === 'rem') {
        heightValue *= 16; // 1rem = 16px (assuming default font size of 16px)
    } else if (unit === 'pt') {
        heightValue *= 1.33; // 1pt = 1.33px (assuming 96dpi)
    } else if (unit === 'pc') {
        heightValue *= 16; // 1pc = 16px (assuming 12pt = 16px)
    }

    // Set the height of the element by the value
    element.style.height = `${numbersOnly(heightValue)}px`;
});
