import { isEmpty } from '@ember/utils';

export default function isNotEmpty(...params) {
    return !isEmpty(...params);
}
