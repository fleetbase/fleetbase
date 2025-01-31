import { helper } from '@ember/component/helper';
import { isNone } from '@ember/utils';

/**
 * Helper function to determine if a visibility control is set to true.
 *
 * @param {Array} params - An array containing the control object and the name of the control.
 * @returns {boolean} - True if the control is set to true, otherwise false.
 */
export default helper(function isVisibilityControlVisible([control, name]) {
    // Check if an object with visibilityControls is passed
    if (!isNone(control) && !isNone(control.visibilityControls)) {
        return control.visibilityControls[name] === true;
    }

    // Check if control property directly exists and is true
    return !isNone(control) && control[name] === true;
});
