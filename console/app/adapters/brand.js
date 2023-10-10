import ApplicationAdapter from './application';

export default class BrandAdapter extends ApplicationAdapter {
    urlForFindRecord() {
        return `${this.host}/${this.namespace}/settings/branding`;
    }

    urlForUpdateRecord() {
        return `${this.host}/${this.namespace}/settings/branding`;
    }

    urlForCreateRecord() {
        return `${this.host}/${this.namespace}/settings/branding`;
    }
}
