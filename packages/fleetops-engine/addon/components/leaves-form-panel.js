import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class LeavesFormPanelComponent extends Component {
    @service store;
    @service notifications;
    @service intl;
    @service hostRouter;

    @tracked leave = this.args.leave;
    @tracked isSaving = false;

    leaveTypes = [
        this.intl.t('leaves.sick'),
        this.intl.t('leaves.vacation'),
        this.intl.t('leaves.other')
    ];

    statusOptions = [
        this.intl.t('leaves.submitted'),
        this.intl.t('leaves.approve'),
        this.intl.t('leaves.reject')
    ];

    @action
    async saveLeave() {
        this.isSaving = true;
        try {
            await this.leave.save();
            this.notifications.success(this.intl.t('leaves.saved_successfully'));
            if (typeof this.args.onSave === 'function') {
                this.args.onSave(this.leave);
            }
        } catch (error) {
            this.notifications.serverError(error);
        } finally {
            this.isSaving = false;
        }
    }

    @action
    cancel() {
        if (typeof this.args.onCancel === 'function') {
            this.args.onCancel();
        }
    }
}