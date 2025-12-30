import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';
import groupBy from '@fleetbase/ember-core/utils/group-by';

export default class ConsoleSettingsNotificationsRoute extends Route {
    @service fetch;
    @service currentUser;

    model() {
        return hash({
            registry: this.fetch.get('notifications/registry'),
            notifiables: this.fetch.get('notifications/notifiables'),
        });
    }

    async setupController(controller, { registry, notifiables }) {
        super.setupController(...arguments);

        controller.groupedNotifications = groupBy(registry, 'package');
        controller.notifiables = notifiables;
        controller.company = await this.currentUser.loadCompany();
    }
}
