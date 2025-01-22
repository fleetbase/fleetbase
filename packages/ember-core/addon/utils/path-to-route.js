export default function pathToRoute(path = '') {
    if (!path.startsWith('console')) {
        path = `console.${path}`;
    }

    path = path.replace(/\//gi, '.');
    path = path.replace('.ops.', '.operations.');

    return path;
}
