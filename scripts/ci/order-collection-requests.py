#!/usr/bin/env python3
"""Emit `-i <Folder/Request>` args for a Postman git-native collection directory,
in the collection's own order, with every DELETE — and any explicitly pinned
request — deferred to the end.

The collection doubles as published API reference, so its on-disk structure and
ordering must not change. Deferring at run time keeps full coverage without
letting one request destroy state the rest of the run still needs.

Two deferral rules, in ascending order of precedence:

  1. DELETE (heuristic). Any DELETE may strand a later request that reads the
     record, so all of them move to the tail.
  2. RUN_LAST (explicit). Session teardown cannot be expressed as a heuristic,
     because ordering matters *between* the deferred requests — see below.
"""
import os, re, sys

# Requests relocated to the very end of the run, in exactly the order listed.
# Keyed by collection directory name.
#
# Fleetbase API / Customers issues a Sanctum token (`Customer-Token`) and has
# three requests that destroy it:
#
#   * Logout Customer              revokes the token used on that request
#   * Logout All Customer Sessions revokes every token for the user
#   * Reset Customer Password      revokes every token as a side effect
#                                  (CustomerController::resetPassword calls
#                                  deleteUserTokens after setting the password)
#
# Deferring all three is not sufficient: whichever logout runs first leaves the
# other holding a dead token, so a fresh token has to be minted in between.
# Login Customer is relocated here to do exactly that — safe to move out of its
# natural position because Create a Customer already bootstraps customer_token
# earlier in the run via its afterResponse script.
#
# Reset Customer Password is a *public* route (no AuthenticateCustomerToken
# middleware) — it needs no token, it only destroys them — so it is free to run
# dead last.
# Request Customer Login SMS is pinned for a different reason: Create a Customer
# sends {{$randomPhoneNumber}}, and creating the customer Contact syncs that phone
# onto the linked User row — so after it runs, User.phone is a random number and
# looking the customer up by the fixed {{customer_phone}} 400s with "No customer
# with this phone number found". Update Authenticated Customer sends
# {{customer_phone}} and mirrors it back onto the User, so this request only
# succeeds once that has run. Pinning it to the head of the tail puts it after
# Update Authenticated Customer (order 9000) while keeping it before the logouts.
# It is a public route, so it needs no token.
# Deletes are deferred as a batch, and within that batch they keep folder order —
# which can delete a parent before its children. Zones carry a service_area, so
# Delete a Service Area (Service Areas sorts before Zones) cascaded the zone away and
# Delete a Zone then answered "Zone resource not found." — a 404 manufactured entirely
# by this script's own ordering, not by the API.
#
# Listed paths sort to the FRONT of the delete batch, in the order given. Add a child
# here whenever its parent's delete would remove it.
# Requests whose dependency lives in a LATER folder. The published collection's folder
# order is documentation, not a dependency graph — Cart sorts before Products, so
# Add Item to Cart fired before Create Product ever ran and {{product_id}} was unset,
# giving "Invalid product provided". These run after every ordinary request but BEFORE
# the deletes, in the order listed here.
# Requests that CANNOT be covered by a public-API contract run, with the reason. They are
# not emitted, so the job's result reflects only what the run can legitimately prove.
#
# This list is deliberately small and deliberately annotated. It is NOT a place to park a
# request that merely fails today — every entry states a structural reason the public API
# cannot reach it. Each one is echoed on every run so it stays visible rather than rotting.
EXCLUDED = {
    'Fleetbase Storefront API': {
        'Customer/Authenticate a Customer with Apple':
            'needs a real Apple identity token; Apple signs it, so no fixture can produce '
            'a verifiable one',
        'Customer/Authenticate a Customer with Google':
            'needs a real Google id token, signed by Google, for the same reason',
    },
}

RUN_LATE = {
    'Fleetbase API': [
        'Orders/Update an Order',       # needs {{service_quote_id}} from Service Quotes/Query Service Quotes
        # {{qr_code}} is decoded from the PNG that Tracking Numbers/Create a Tracking
        # Number returns, which runs in a later folder.
        'Orders/Capture QR Code for Order',
    ],
    'Fleetbase Storefront API': [
        # The cart has to be populated before anything prices or checks out against it,
        # and emptied only once those are done. Deferring just the three Cart requests
        # left Checkout running against an empty cart — "The selected cart is invalid."
        'Cart/Add Item to Cart',        # needs {{product_id}} from Products/Create Product
        'Cart/Update item in Cart',     # needs the line item Add Item to Cart creates
        'Delivery Service Quote/Retrieve a Delivery Service Quote ❗',  # prices the cart
        'Checkout/Before ❗',                    # needs the cart AND {{service_quote_id}}
        'Checkout/Capture checkout as order',    # needs {{checkout_token}} from Before
        'Checkout/Get Checkout Status',          # ditto
        'Checkout/Update Stripe Payment Intent', # needs the cart and the service quote
        'Cart/Remove item from cart',   # LAST: it empties what the above depend on
    ],
}

DELETE_FIRST = {
    'Fleetbase API': [
        'Zones/Delete a Zone',            # cascades with Service Areas/Delete a Service Area
    ],
}

RUN_LAST = {
    'Fleetbase API': [
        'Customers/Request Customer Login SMS',     # needs User.phone restored by Update Me
        'Customers/Logout Customer',                # revokes the current token
        'Customers/Login Customer',                 # re-mints customer_token
        'Customers/Logout All Customer Sessions',   # revokes every token
        'Customers/Reset Customer Password',        # public route, no token needed
    ],
}

root = sys.argv[1]
def field(path, key, default=None):
    try:
        m = re.search(rf'^{key}:\s*(\S+)', open(path, encoding='utf-8').read(), re.M)
        return m.group(1) if m else default
    except OSError:
        return default

# Pinned order for this collection, as {path: index}. Unknown collection => {}.
run_last = {p: i for i, p in enumerate(RUN_LAST.get(os.path.basename(root.rstrip('/')), []))}
delete_first = {p: i for i, p in enumerate(DELETE_FIRST.get(os.path.basename(root.rstrip('/')), []))}
run_late = {p: i for i, p in enumerate(RUN_LATE.get(os.path.basename(root.rstrip('/')), []))}
excluded = EXCLUDED.get(os.path.basename(root.rstrip('/')), {})

def line_value(path, key):
    """Read a scalar whose value may contain spaces, e.g. `name: A long title`.

    field() stops at the first token, which silently truncated request names to
    their first word and made every -i miss.
    """
    try:
        m = re.search(rf'^{key}:[ \t]*(.+?)[ \t]*$', open(path, encoding='utf-8').read(), re.M)
    except OSError:
        return None
    if not m:
        return None
    return m.group(1).strip().strip('"').strip("'")


items = []
seen = set()
for folder in os.listdir(root):
    d = os.path.join(root, folder)
    if not os.path.isdir(d) or folder.startswith('.'):
        continue
    forder = int(field(os.path.join(d, '.resources', 'definition.yaml'), 'order', 10**9))
    for fn in os.listdir(d):
        if not fn.endswith('.request.yaml'):
            continue
        p = os.path.join(d, fn)
        # Prefer the request's declared name over the filename. They usually match,
        # but the on-disk name is truncated at 60 characters, so a longer request
        # (e.g. Storefront's "Setups a verification request to create a new storefront
        # customer. ?") ends up with a filename the collection does not know. `-i` then
        # fails to match it and the CLI aborts the ENTIRE run with 0 requests executed.
        name = (line_value(p, 'name') or fn[:-len('.request.yaml')])
        method = (field(p, 'method', '?') or '?').upper()
        rorder = int(field(p, 'order', 10**9))
        path = f'{folder}/{name}'
        seen.add(path)
        if path in excluded:
            # Reported every run so an exclusion cannot quietly become permanent.
            print(f'::notice::excluded from the contract run — {path}: {excluded[path]}', file=sys.stderr)
            continue
        if path in run_last:
            # Phase 3 sorts after the DELETEs: "pinned last" means last, and
            # explicit intent beats the heuristic. Nothing in Fleetbase API
            # currently deletes the customer's Contact or User, so the relative
            # order of phases 1 and 2 is inert today — but a future RUN_LAST
            # entry that depends on a record a DELETE removes would need this.
            phase, primary, secondary = 3, run_last[path], 0
            sort_folder = ''
        elif method == 'DELETE' and path in delete_first:
            # Negative primary sorts ahead of every folder-ordered delete, since
            # forder is always non-negative.
            phase, primary, secondary = 2, delete_first[path] - len(delete_first), 0
            sort_folder = ''
        elif path in run_late:
            phase, primary, secondary = 1, run_late[path], 0
            sort_folder = ''
        else:
            phase, primary, secondary = (2 if method == 'DELETE' else 0), forder, rorder
            sort_folder = folder
        items.append((phase, primary, sort_folder, secondary, name, path))

for *_key, path in sorted(items):
    print(path)

# A rename in the postman repo would silently un-pin a request and quietly
# reintroduce the token-revocation failures. Warn, but do NOT exit non-zero: the
# caller consumes stdout with `while read req; do args+=(-i "$req"); done`, and
# never checks the exit status — so failing here would yield a partial or empty
# -i list, a worse and much less obvious failure than a red annotation.
for path in run_last:
    if path not in seen:
        print(f'::warning::RUN_LAST entry not found in collection: {path}', file=sys.stderr)
for path in excluded:
    if path not in seen:
        print(f'::warning::EXCLUDED entry not found in collection: {path}', file=sys.stderr)
