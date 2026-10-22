import VirtualIndexRoute from './index';

/**
 * A public page at /~/{slug}/{path}, e.g. /~/t/{company}/{tracking number}. As with
 * /~/{slug}, the `virtual` route renders it and the page reads the rest of the path.
 */
export default class VirtualPathRoute extends VirtualIndexRoute {}
