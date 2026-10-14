import Route from '@ember/routing/route';

/**
 * A public page at /~/{slug}. The `virtual` route renders it; this route only keeps
 * the `virtual` body class, which lets the page scroll, on the route that is current.
 */
export default class VirtualIndexRoute extends Route {
    bodyClassNames = ['virtual'];
}
