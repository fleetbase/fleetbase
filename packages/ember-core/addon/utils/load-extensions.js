export default async function loadExtensions() {
    return new Promise((resolve, reject) => {
        return fetch('/extensions.json')
            .then((resp) => resp.json())
            .then(resolve)
            .catch(reject);
    });
}
