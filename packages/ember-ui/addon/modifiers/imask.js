import { modifier } from 'ember-modifier';
import { isEmpty } from '@ember/utils';
import IMask from 'imask';

export default modifier(function imask(element, [maskOptions = {}]) {
    if (isEmpty(maskOptions?.mask)) {
        return;
    }

    const mask = IMask(element, maskOptions);

    return () => {
        mask.destroy();
    };
});
