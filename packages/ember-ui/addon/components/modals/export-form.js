import Component            from '@glimmer/component';
import { tracked }          from '@glimmer/tracking';
import { action }           from '@ember/object';

export default class ExportFormComponent extends Component {
    filterOptions = ['startDate', 'createdAt'];

    @tracked filterBy = null;      

    @action setFilterBy(option) {
        this.filterBy                 = option;    
        this.args.options.startDate   = null;   
        this.args.options.createdAt   = null;
    }
}
