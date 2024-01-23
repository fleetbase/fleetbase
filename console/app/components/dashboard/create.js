import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isArray, A } from '@ember/array';
import { task } from 'ember-concurrency-decorators';
import FleetbaseBlogComponent from '../fleetbase-blog';
import GithubCardComponent from '../github-card';
import DashboardCountComponent from './count';

export default class DashboardCreateComponent extends Component {
    @tracked dashboard;

    constructor(owner, { dashboard }) {
        super(...arguments);

        this.dashboard = {
            title: 'Fleetops stats',
            widgets: [
                {
                    name: 'Blog',
                    component: FleetbaseBlogComponent,
                    gridOptions: { w: 8, h: 3, minW: 2 },
                    options: {},
                },
                {
                    name: 'Github',
                    component: GithubCardComponent,
                    gridOptions: { w: 4, h: 3, minW: 2 },
                    options: {},
                },
                {
                    name: 'Blog',
                    component: DashboardCountComponent,
                    gridOptions: { w: 2, h: 2, minW: 2 },
                    options: {
                        format: 'money',
                        value: '150',
                        currency: '$',
                    },
                },
                {
                    name: 'Blog',
                    component: DashboardCountComponent,
                    gridOptions: { w: 2, h: 2, minW: 2 },
                    options: {
                        format: 'money',
                        value: '150',
                        currency: '$',
                    },
                },
                {
                    name: 'Blog',
                    component: DashboardCountComponent,
                    gridOptions: { w: 2, h: 2, minW: 2 },
                    options: {
                        format: 'money',
                        value: '150',
                        currency: '$',
                    },
                },
                {
                    name: 'Blog',
                    component: DashboardCountComponent,
                    gridOptions: { w: 2, h: 2, minW: 2 },
                    options: {
                        format: 'money',
                        value: '150',
                        currency: '$',
                    },
                },
                {
                    name: 'Blog',
                    component: DashboardCountComponent,
                    gridOptions: { w: 2, h: 2, minW: 2 },
                    options: {
                        format: 'money',
                        value: '150',
                        currency: '$',
                    },
                },
                {
                    name: 'Blog',
                    component: DashboardCountComponent,
                    gridOptions: { w: 2, h: 2, minW: 2 },
                    options: {
                        format: 'money',
                        value: '150',
                        currency: '$',
                    },
                },
            ],
        };
    }

    @action
    toggleFloat() {
        this.shouldFloat = !this.shouldFloat;
    }

    @action onQueryParamsChanged(changedParams) {
        this.reloadDashboard.perform(changedParams);
    }

    @action onChangeGrid(event) {
        console.log('Grid Stack event: ', event);
    }

    @action onDragToDashboard(event) {
        console.log('Grid Stack drag event: ', event);
    }
}
