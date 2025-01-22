import { modifier } from 'ember-modifier';
import numbersOnly from '../utils/numbers-only';

export default modifier(function setWidth(element, [width]) {
    if (width === undefined || width === null) {
        return;
    }

    let widthValue = width;
    let unit = '';

    // Check if width is a string with a unit
    if (typeof width === 'string') {
        const match = width.match(/^(\d+(?:\.\d+)?)(\D+)?$/);
        if (match !== null) {
            widthValue = match[1];
            unit = match[2] || '';
        }
    }

    // Convert the width value to pixels
    if (unit === 'em') {
        widthValue *= 16; // 1em = 16px
    } else if (unit === 'rem') {
        widthValue *= 16; // 1rem = 16px (assuming default font size of 16px)
    } else if (unit === 'pt') {
        widthValue *= 1.33; // 1pt = 1.33px (assuming 96dpi)
    } else if (unit === 'pc') {
        widthValue *= 16; // 1pc = 16px (assuming 12pt = 16px)
    }

    // Set the width of the element by the value
    element.style.width = `${numbersOnly(widthValue)}px`;
});
