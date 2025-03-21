// app/helpers/format-translation-key.js
import { helper } from '@ember/component/helper';

export function formatTranslationKey(params) {
  const [label] = params;
  if (!label) return '';
  return `fleet-ops.common.${label.toLowerCase().replace(/ /g, '-')}`;
}

export default helper(formatTranslationKey);