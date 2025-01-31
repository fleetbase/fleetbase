import { isBlank } from '@ember/utils';

export default function withDefaultValue(value, defaultValue = 'N/A') {
    return isBlank(value) ? defaultValue : value;
}
