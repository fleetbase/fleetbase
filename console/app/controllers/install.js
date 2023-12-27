import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency-decorators';

export default class InstallController extends Controller {
    @service fetch;
    @service notifications;
    @service router;
    @tracked error;
    @tracked steps = [
        { task: 'createdb', name: 'Create Database', status: 'pending' },
        { task: 'migrate', name: 'Run Migrations', status: 'pending' },
        { task: 'seed', name: 'Seed Database', status: 'pending' },
    ];

    @action updateTask(task, properties = {}) {
        const steps = [...this.steps];
        const index = steps.findIndex((step) => step.task === task);

        if (index > -1) {
            steps[index] = { ...steps[index], ...properties };
        }

        this.steps = [...steps];
    }

    @action startInstall() {
        this.install.perform();
    }

    @action reset(options = {}) {
        const install = options.install === true;

        this.steps.forEach((step) => {
            this.updateTask(step.task, { status: 'pending' });
        });

        if (install) {
            this.install.perform();
        }
    }

    @action onInstallCompleted() {
        const isCompleted = this.steps.every(({ status }) => status === 'completed');

        if (isCompleted) {
            this.notifications.success('Install completed successfully!');
            return this.router.transitionTo('onboard');
        }
    }

    @task({ enqueue: true, maxConcurrency: 1 }) *install() {
        try {
            yield this.createdb.perform();
            yield this.migrate.perform();
            yield this.seed.perform();
        } catch (error) {
            this.error = error;
            return this.reset();
        }

        this.onInstallCompleted();
    }

    @task *createdb() {
        this.updateTask('createdb', { status: 'in_progress' });

        try {
            yield this.fetch.post('installer/createdb');
            this.updateTask('createdb', { status: 'completed' });
        } catch (error) {
            this.updateTask('createdb', { status: 'failed' });
            throw error;
        }
    }

    @task *migrate() {
        this.updateTask('migrate', { status: 'in_progress' });

        try {
            yield this.fetch.post('installer/migrate');
            this.updateTask('migrate', { status: 'completed' });
        } catch (error) {
            this.updateTask('migrate', { status: 'failed' });
            throw error;
        }
    }

    @task *seed() {
        this.updateTask('seed', { status: 'in_progress' });

        try {
            yield this.fetch.post('installer/seed');
            this.updateTask('seed', { status: 'completed' });
        } catch (error) {
            this.updateTask('seed', { status: 'failed' });
            throw error;
        }
    }
}
