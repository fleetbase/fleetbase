import { helper } from '@ember/component/helper';
import { humanize } from 'ember-cli-string-helpers/helpers/humanize';

export default helper(function safeHumanize(params) {
    return humanize(params.map((param) => `${param}`));
});
