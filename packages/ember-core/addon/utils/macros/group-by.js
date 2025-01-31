import { A } from '@ember/array';
import { computed, get } from '@ember/object';
import { isPresent } from '@ember/utils';

export default function groupBy(collection, property) {
    let dependentKey = collection + '.@each.' + property;

    return computed(dependentKey, function () {
        let groups = A();
        let items = get(this, collection);

        if (items) {
            items.forEach(function (item) {
                let value = get(item, property);
                let group = groups.findBy('value', value);

                if (isPresent(group)) {
                    group.items.push(item);
                } else {
                    group = { property: property, value: value, items: [item] };
                    groups.push(group);
                }
            });
        }

        return groups;
    }).readOnly();
}
