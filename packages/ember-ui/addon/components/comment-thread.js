import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency-decorators';
import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';
import getModelName from '@fleetbase/ember-core/utils/get-model-name';

/**
 * Component to handle a thread of comments.
 */
export default class CommentThreadComponent extends Component {
    /**
     * Service to handle data store operations.
     * @service
     */
    @service store;

    /**
     * Service for handling notifications.
     * @service
     */
    @service notifications;

    /**
     * Service for internationalization.
     * @service
     */
    @service intl;

    /**
     * The subject related to the comments.
     * @tracked
     */
    @tracked subject;

    /**
     * Array of comments related to the subject.
     * @tracked
     */
    @tracked comments = [];

    /**
     * The text input for publishing a new comment.
     * @tracked
     */
    @tracked input = '';

    /**
     * Context object containing utility functions.
     */
    context = {
        isCommentInvalid: this.isCommentInvalid.bind(this),
        reloadComments: () => {
            return this.reloadComments.perform();
        },
    };

    /**
     * Constructor for the comment thread component.
     * @param owner - The owner of the component.
     * @param subject - The subject of the comment thread.
     * @param subjectType - The type of the subject.
     */
    constructor(owner, { subject, subjectType }) {
        super(...arguments);

        this.subject = subject;
        this.comments = getWithDefault(subject, 'comments', []);
        this.subjectType = subjectType ? subjectType : getModelName(subject);
    }

    /**
     * Asynchronous task to publish a new comment.
     * @task
     */
    @task *publishComment() {
        if (this.isCommentInvalid(this.input)) {
            return;
        }

        let comment = this.store.createRecord('comment', {
            content: this.input,
            subject_uuid: this.subject.id,
            subject_type: this.subjectType,
        });

        yield comment.save();
        yield this.reloadComments.perform();

        this.input = '';
    }

    /**
     * Asynchronous task to reload the comments related to the subject.
     * @task
     */
    @task *reloadComments() {
        this.comments = yield this.store.query('comment', { subject_uuid: this.subject.id, withoutParent: 1, sort: '-created_at' });
    }

    /**
     * Checks if a comment is invalid.
     * @param {string} comment - The comment to validate.
     * @returns {boolean} True if the comment is invalid, false otherwise.
     */
    isCommentInvalid(comment) {
        if (!comment) {
            this.notifications.warning(this.intl.t('component.comment-thread.comment-input-empty-notification'));
            return true;
        }

        // make sure comment is at least 2 characters
        if (typeof comment === 'string' && comment.length <= 1) {
            this.notifications.warning(this.intl.t('component.comment-thread.comment-min-length-notification'));
            return true;
        }

        return false;
    }
}
