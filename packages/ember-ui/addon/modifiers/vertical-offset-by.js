import { modifier } from 'ember-modifier';
import { isArray } from '@ember/array';
import { isBlank } from '@ember/utils';
import { later } from '@ember/runloop';
import numbersOnly from '../utils/numbers-only';

function calculateOffset(offset = 0, elements) {
    let calculatedOffset = 0;

    if (offset) {
        calculatedOffset += parseInt(numbersOnly(offset));
    }

    if (isArray(elements)) {
        for (let i = 0; i < elements.length; i++) {
            const element = elements.objectAt(i);

            if (element instanceof HTMLElement) {
                calculatedOffset += element.offsetHeight;
            }

            if (typeof element === 'string') {
                const foundElement = document.querySelector(element);

                if (foundElement instanceof HTMLElement) {
                    calculatedOffset += foundElement.offsetHeight;
                }
            }
        }
    }

    return calculatedOffset;
}

/**
 * Creates offset for top/bottom by either a set offset in pixels or elements in which it calculates their heights and uses it as offset
 * ex {{vertical-offset-by "bottom" (hash offset = 20)}}
 * ex {{vertical-offset-by "bottom" (hash elements = "#header,.subheader")}}
 */
export default modifier(function verticalOffsetBy(element, [direction = 'bottom'], { offset = null, elements = null }) {
    if (isBlank(offset) && isBlank(elements)) {
        return;
    }

    if (typeof elements === 'string' && elements.includes(',')) {
        elements = elements.split(',');
    }

    if (typeof elements === 'string' && elements.includes('|')) {
        elements = elements.split('|');
    }

    if (typeof elements === 'string') {
        elements = [elements];
    }

    const calculatedOffset = calculateOffset(offset, elements);

    later(
        this,
        () => {
            element.style[direction] = `${calculatedOffset}px`;
        },
        0
    );
});
