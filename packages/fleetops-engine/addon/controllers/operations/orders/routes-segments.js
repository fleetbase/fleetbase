import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { action } from '@ember/object';

export default class FleetOpsRoutesSegmentsController extends BaseController {
  
  /**
   * Navigate back to orders list
   */
  @action goBack() {
    return this.transitionToRoute('operations.orders.index');
  }
}