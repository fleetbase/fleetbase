<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Trusted Proxies
    |--------------------------------------------------------------------------
    |
    | The proxies (load balancers, ingress controllers, the bundled httpd) whose
    | X-Forwarded-* headers are believed when resolving the client IP. Without
    | this, $request->ip() is the nearest proxy's address, so every caller looks
    | like the same client to anything keyed on IP (rate limiting, audit logs).
    |
    | The default trusts private and loopback ranges only: a public client cannot
    | spoof its address, and a directly-exposed server ignores the headers. A load
    | balancer that connects from public addresses (e.g. Google Cloud's front ends)
    | must be listed explicitly. "*" trusts whichever proxy connected.
    |
    | Example: TRUSTED_PROXIES=10.0.0.0/8,35.191.0.0/16,130.211.0.0/22
    |
    */
    'proxies' => ($proxies = env('TRUSTED_PROXIES', '10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,127.0.0.0/8,::1,fc00::/7')) === '*'
        ? '*'
        : array_values(array_filter(array_map('trim', explode(',', (string) $proxies)))),
];
