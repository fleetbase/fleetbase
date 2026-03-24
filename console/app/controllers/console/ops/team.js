import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

const defaultMemberForm = () => ({
    name: '',
    email: '',
    phone: '',
    status: 'active',
    role_key: 'dispatcher',
});

export default class ConsoleOpsTeamController extends Controller {
    @service fetch;
    @service notifications;

    @tracked team = [];
    @tracked rolePresets = [];
    @tracked memberForm = defaultMemberForm();
    @tracked isSubmitting = false;

    hydrate(payload) {
        this.team = payload.team ?? [];
        this.rolePresets = payload.role_presets ?? [];
    }

    async reload() {
        const payload = await this.fetch.get('ops/team');
        this.hydrate(payload);
    }

    @action updateField(field, event) {
        this.memberForm = { ...this.memberForm, [field]: event.target.value };
    }

    @action async createMember(event) {
        event.preventDefault();
        this.isSubmitting = true;

        try {
            await this.fetch.post('ops/team', {
                name: this.memberForm.name,
                email: this.memberForm.email,
                phone: this.memberForm.phone || null,
                status: this.memberForm.status,
                role_key: this.memberForm.role_key,
            });

            this.notifications.success('Team member created.');
            this.memberForm = defaultMemberForm();
            await this.reload();
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to create team member.');
        } finally {
            this.isSubmitting = false;
        }
    }

    @action async changeRole(member, event) {
        try {
            await this.fetch.post(`ops/team/${member.uuid}/role`, {
                role_key: event.target.value,
            });

            this.notifications.success('Role updated.');
            await this.reload();
        } catch (error) {
            this.notifications.error(error.message ?? 'Unable to update role.');
        }
    }
}
