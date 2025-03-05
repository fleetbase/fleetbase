import { helper } from '@ember/component/helper';

export default helper(function getTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
});