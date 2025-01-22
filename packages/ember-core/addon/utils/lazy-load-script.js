import { guidFor } from '@ember/object/internals';

export default function lazyLoadScript(path) {
    return new Promise(function (resolve, reject) {
        const id = guidFor(path);

        if (document.getElementById(id)) {
            return resolve();
        }

        const element = document.createElement('script');
        element.id = id;
        element.src = path;

        element.addEventListener('load', function () {
            resolve();
        });

        element.addEventListener('error', function () {
            reject(`Failed to load script (${path})`);
        });

        document.getElementsByTagName('head')[0].appendChild(element);
    });
}
