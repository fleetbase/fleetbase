import { getOwner } from '@ember/application';

export default function isFastBoot(context) {
    let owner = getOwner(context);
    let fastbootService = owner.lookup('service:fastboot');
    return fastbootService ? fastbootService.get('isFastBoot') : false;
}
