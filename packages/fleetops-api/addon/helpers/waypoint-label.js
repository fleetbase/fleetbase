import { helper } from '@ember/component/helper';
import waypointLabelUtil from '../utils/waypoint-label';

export default helper(function waypointLabel([index]) {
    return waypointLabelUtil(index);
});
