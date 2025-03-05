import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

export default class ModalsAssignDriverComponent extends Component {
    @tracked timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
}
