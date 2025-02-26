export default function removeBootLoader() {
    const bootLoaderElement = document.getElementById('boot-loader');
    if (bootLoaderElement && typeof bootLoaderElement.remove === 'function') {
        bootLoaderElement.remove();
    }
}
