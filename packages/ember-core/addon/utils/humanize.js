import { humanize as humanizeString } from 'ember-cli-string-helpers/helpers/humanize';

export default function humanize(string) {
    const uppercase = ['api', 'vat', 'id', 'uuid', 'sku', 'ean', 'upc', 'erp', 'tms', 'wms', 'ltl', 'ftl', 'lcl', 'fcl', 'rfid', 'jot', 'roi', 'eta', 'pod', 'asn', 'oem', 'ddp', 'fob'];

    return humanizeString([string])
        .split(' ')
        .map((word) => {
            if (uppercase.includes(word.toLowerCase())) {
                return word.toUpperCase();
            }

            return word;
        })
        .join(' ');
}
