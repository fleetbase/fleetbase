import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

const DOC_OPTIONS = ['bol', 'pod', 'insurance_cert', 'customs'];

/**
 * Documents tab. Emits:
 *
 *   {
 *     'documents.auto_request_pod_on_delivery': <bool>,
 *     'documents.pod_due_days':                 <int >= 0>,
 *     'documents.required_documents':           <array of strings>,
 *   }
 */
export default class SettingsTabsDocumentsComponent extends Component {
    @tracked autoRequestPod = Boolean(this.args.values?.auto_request_pod_on_delivery ?? true);
    @tracked podDueDays = String(this.args.values?.pod_due_days ?? 3);
    @tracked requiredDocs = Array.isArray(this.args.values?.required_documents)
        ? [...this.args.values.required_documents]
        : ['bol', 'pod'];

    docOptions = DOC_OPTIONS;

    isDocRequired = (code) => this.requiredDocs.includes(code);

    @action toggleAutoRequest(event) {
        this.autoRequestPod = Boolean(event.target.checked);
    }
    @action updatePodDueDays(event) {
        this.podDueDays = event.target.value;
    }

    @action
    toggleDoc(code, event) {
        if (event.target.checked && !this.requiredDocs.includes(code)) {
            this.requiredDocs = [...this.requiredDocs, code];
        } else if (!event.target.checked) {
            this.requiredDocs = this.requiredDocs.filter((c) => c !== code);
        }
    }

    @action
    submit(event) {
        event.preventDefault();
        this.args.onSave?.({
            'documents.auto_request_pod_on_delivery': this.autoRequestPod,
            'documents.pod_due_days': parseInt(this.podDueDays, 10) || 0,
            'documents.required_documents': [...this.requiredDocs],
        });
    }
}
