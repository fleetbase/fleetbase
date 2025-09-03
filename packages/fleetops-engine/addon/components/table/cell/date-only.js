import Component from '@glimmer/component';
import { format, parseISO, isValid } from 'date-fns';

export default class TableCellDateComponent extends Component {
  get formattedDate() {
    let date = this.args.value;
    if (!date) return '';
    let parsed = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(parsed)) {
      parsed = new Date(date);
    }
    return isValid(parsed) ? format(parsed, "MMMM do, yyyy") : '';
  }
}
