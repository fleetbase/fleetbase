import { dasherize } from '@ember/string';

export default function words(string = '') {
    return dasherize(string).replace(/-/g, ' ');
}
