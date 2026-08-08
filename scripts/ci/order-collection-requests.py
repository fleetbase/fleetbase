#!/usr/bin/env python3
"""Emit `-i <Folder/Request>` args for a Postman git-native collection directory,
in the collection's own order, with every DELETE deferred to the end.

The collection doubles as published API reference, so its on-disk structure and
ordering must not change. Deferring deletes at run time keeps DELETE coverage
without letting a delete destroy a record the rest of the run still needs.
"""
import os, re, sys

root = sys.argv[1]
def field(path, key, default=None):
    try:
        m = re.search(rf'^{key}:\s*(\S+)', open(path, encoding='utf-8').read(), re.M)
        return m.group(1) if m else default
    except OSError:
        return default

items = []
for folder in os.listdir(root):
    d = os.path.join(root, folder)
    if not os.path.isdir(d) or folder.startswith('.'):
        continue
    forder = int(field(os.path.join(d, '.resources', 'definition.yaml'), 'order', 10**9))
    for fn in os.listdir(d):
        if not fn.endswith('.request.yaml'):
            continue
        p = os.path.join(d, fn)
        name = fn[:-len('.request.yaml')]
        method = (field(p, 'method', '?') or '?').upper()
        rorder = int(field(p, 'order', 10**9))
        items.append((method == 'DELETE', forder, folder, rorder, name))

for _is_delete, _fo, folder, _ro, name in sorted(items):
    print(f'{folder}/{name}')
