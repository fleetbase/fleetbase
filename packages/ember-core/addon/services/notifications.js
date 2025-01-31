import EmberNotificationsService from 'ember-cli-notifications/services/notifications';
import { isArray } from '@ember/array';
import getWithDefault from '../utils/get-with-default';

export default class NotificationsService extends EmberNotificationsService {
    serverError(error, fallbackMessage = 'Oops! Something went wrong with your request.', options = {}) {
        if (isArray(error.errors)) {
            const errors = getWithDefault(error, 'errors');
            const errorMessage = getWithDefault(errors, '0', fallbackMessage);

            return this.error(errorMessage, options);
        }

        if (error instanceof Error) {
            const errorMessage = getWithDefault(error, 'message', fallbackMessage);
            return this.error(errorMessage, options);
        }

        if (typeof error === 'string') {
            return this.error(error, options);
        }

        return this.error(fallbackMessage, options);
    }

    invoke(type, message, ...params) {
        if (typeof message === 'function') {
            this[type](message(...params));
        } else {
            this[type](message);
        }
    }
}
