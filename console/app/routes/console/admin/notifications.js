import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';
import groupBy from '@fleetbase/ember-core/utils/group-by';

export default class ConsoleAdminNotificationsRoute extends Route {
    @service fetch;

    model() {
        return hash({
            registry: this.fetch.get('notifications/registry'),
            notifiables: this.fetch.get('notifications/notifiables'),
        });
    }

    setupController(controller, { registry, notifiables }) {
        controller.groupedNotifications = groupBy(registry, 'package');
        controller.notifiables = notifiables;
    }
}
