import { helper } from '@ember/component/helper';
import isFacilitatorSupportedPlaceUtil from '../utils/is-facilitator-supported-place';

export default helper(function isNotFacilitatorSupportedPlace([facilitator, place]) {
    return !isFacilitatorSupportedPlaceUtil(facilitator, place);
});
