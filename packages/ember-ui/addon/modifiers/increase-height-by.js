import { modifier } from 'ember-modifier';
import { later } from '@ember/runloop';
import numbersOnly from '../utils/numbers-only';

export default modifier(function increaseHeightBy(element, [increaseBy]) {
    if (increaseBy === undefined || increaseBy === null) {
        return;
    }

    later(
        this,
        () => {
            const { offsetHeight } = element;
            let increaseByValue = increaseBy;
            let unit = '';

            // Check if increaseBy is a string with a unit
            if (typeof increaseBy === 'string') {
                const match = increaseBy.match(/^(\d+(?:\.\d+)?)(\D+)?$/);
                if (match !== null) {
                    increaseByValue = match[1];
                    unit = match[2] || '';
                }
            }

            // Convert the increaseBy value to pixels
            if (unit === 'em') {
                increaseByValue *= 16; // 1em = 16px
            } else if (unit === 'rem') {
                increaseByValue *= 16; // 1rem = 16px (assuming default font size of 16px)
            } else if (unit === 'pt') {
                increaseByValue *= 1.33; // 1pt = 1.33px (assuming 96dpi)
            } else if (unit === 'pc') {
                increaseByValue *= 16; // 1pc = 16px (assuming 12pt = 16px)
            }

            // Increase the height of the element by the calculated value
            element.style.height = `${offsetHeight + numbersOnly(increaseByValue)}px`;
        },
        600
    );
});
