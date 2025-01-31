import { later } from '@ember/runloop';

function corslite(url, callback, cors) {
    var sent = false;

    if (typeof window.XMLHttpRequest === 'undefined') {
        return callback(Error('Browser not supported'));
    }

    if (typeof cors === 'undefined') {
        var m = url.match(/^\s*https?:\/\/[^\/]*/);
        cors = m && m[0] !== location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '');
    }

    var x = new window.XMLHttpRequest();

    function isSuccessful(status) {
        return (status >= 200 && status < 300) || status === 304;
    }

    if (cors && !('withCredentials' in x)) {
        // IE8-9
        x = new window.XDomainRequest();

        // Ensure callback is never called synchronously, i.e., before
        // x.send() returns (this has been observed in the wild).
        // See https://github.com/mapbox/mapbox.js/issues/472
        var original = callback;
        callback = function () {
            if (sent) {
                original.apply(this, arguments);
            } else {
                later(
                    this,
                    function () {
                        original.apply(this, arguments);
                    },
                    0
                );
            }
        };
    }

    function loaded() {
        if (
            // XDomainRequest
            x.status === undefined ||
            // modern browsers
            isSuccessful(x.status)
        )
            callback.call(x, null, x);
        else callback.call(x, x, null);
    }

    // Both `onreadystatechange` and `onload` can fire. `onreadystatechange`
    // has [been supported for longer](http://stackoverflow.com/a/9181508/229001).
    if ('onload' in x) {
        x.onload = loaded;
    } else {
        x.onreadystatechange = function readystate() {
            if (x.readyState === 4) {
                loaded();
            }
        };
    }

    // Call the callback with the XMLHttpRequest object as an error and prevent
    // it from ever being called again by reassigning it to `noop`
    x.onerror = function error(evt) {
        // XDomainRequest provides no evt parameter
        callback.call(this, evt || true, null);
        callback = function () {};
    };

    // IE9 must have onprogress be set to a unique function.
    x.onprogress = function () {};

    x.ontimeout = function (evt) {
        callback.call(this, evt, null);
        callback = function () {};
    };

    x.onabort = function (evt) {
        callback.call(this, evt, null);
        callback = function () {};
    };

    // GET is the only supported HTTP Verb by XDomainRequest and is the
    // only one supported here.
    x.open('GET', url, true);

    // Send the request. Sending data is not supported.
    x.send(null);
    sent = true;

    return x;
}

export default corslite;
