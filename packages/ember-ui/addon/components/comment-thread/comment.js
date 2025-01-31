import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency-decorators';

/**
 * Component to handle individual comments in a comment thread.
 */
export default class CommentThreadCommentComponent extends Component {
    /**
     * Service to handle data store operations.
     * @service
     */
    @service store;

    /**
     * The text input for replying or editing comments.
     * @tracked
     */
    @tracked input = '';

    /**
     * Flag to indicate if the reply interface is active.
     * @tracked
     */
    @tracked replying = false;

    /**
     * Flag to indicate if the edit interface is active.
     * @tracked
     */
    @tracked editing = false;

    /**
     * The constructor for the comment component.
     * @param owner - The owner of the component.
     * @param comment - The comment data for the component.
     */
    constructor(owner, { comment, contextApi }) {
        super(...arguments);

        this.comment = comment;
        this.contextApi = contextApi;
    }

    /**
     * Activates the reply interface.
     * @action
     */
    @action reply() {
        this.replying = true;
    }

    /**
     * Deactivates the reply interface.
     * @action
     */
    @action cancelReply() {
        this.replying = false;
    }

    /**
     * Activates the edit interface.
     * @action
     */
    @action edit() {
        this.editing = true;
    }

    /**
     * Deactivates the edit interface.
     * @action
     */
    @action cancelEdit() {
        this.editing = false;
    }

    /**
     * Deletes the current comment.
     * @action
     */
    @action delete() {
        this.comment.destroyRecord();
    }

    /**
     * Asynchronous task to update the current comment.
     * @task
     */
    @task *updateComment() {
        if (this.contextApi && this.contextApi.isCommentInvalid(this.comment.content)) {
            return;
        }

        yield this.comment.save();
        this.editing = false;
    }

    /**
     * Asynchronous task to publish a reply to the current comment.
     * @task
     */
    @task *publishReply() {
        if (this.contextApi && this.contextApi.isCommentInvalid(this.input)) {
            return;
        }

        let comment = this.store.createRecord('comment', {
            content: this.input,
            parent_comment_uuid: this.comment.id,
            subject_uuid: this.comment.subject_uuid,
            subject_type: this.comment.subject_type,
        });

        yield comment.save();
        yield this.reloadReplies.perform();

        this.replying = false;
        this.input = '';
    }

    /**
     * Asynchronous task to reload replies to the current comment.
     * @task
     */
    @task *reloadReplies() {
        this.comment = yield this.comment.reload();
    }
}
