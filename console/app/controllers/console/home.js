import Controller from '@ember/controller';

export default class ConsoleHomeController extends Controller {
    rows = [
        {
            name: 'Jason',
            age: 24,
            vehicle: 'Honda',
        },
    ];

    columns = [
        {
            label: 'Name',
            valuePath: 'name',
        },
        {
            label: 'Age',
            valuePath: 'age',
        },
        {
            label: 'Vehicle',
            valuePath: 'vehicle',
        },
    ];
}
