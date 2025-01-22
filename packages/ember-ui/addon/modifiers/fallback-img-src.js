import { modifier } from 'ember-modifier';

export default modifier(function fallbackImgSrc(element, [fallbackUrl]) {
    const useFallbackUrl = function () {
        if (typeof fallbackUrl === 'string') {
            const url = new URL(fallbackUrl);

            if (url.protocol === 'http:' || url.protocol === 'https:') {
                this.src = url.toString();
                this.setAttribute('fallback-url', url.toString());
            }
        }
    };

    element.addEventListener('error', useFallbackUrl);

    return () => element.removeEventListener('error', useFallbackUrl);
});
