#!/usr/bin/env python3
"""Turns a contract stack file and extra overlays into the list the contract workflow installs.

Usage: resolve-contract-stack.py STACK_JSON CALLER_REPOSITORY [EXTRA_OVERLAYS]

STACK_JSON may be empty, for a run with only extra overlays. EXTRA_OVERLAYS is one overlay a
line, `owner/repo@ref composer/package [path]`. The calling repository's own entry is dropped:
the workflow installs the caller from the commit under test instead.

Prints `key=value` lines for $GITHUB_OUTPUT: fleetbase_ref, build_from_source, and overlays,
a heredoc of `repository ref package path` lines.
"""
import json
import re
import sys

NAME = re.compile(r'^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$')
PACKAGE = re.compile(r'^[a-z0-9]([a-z0-9_.-]*[a-z0-9])?/[a-z0-9]([a-z0-9_.-]*[a-z0-9])?$')
REF = re.compile(r'^[A-Za-z0-9_./-]+$')


def overlay(repository, ref, package, path='.'):
    if not NAME.match(repository) or not REF.match(ref) or not PACKAGE.match(package):
        sys.exit(f'Invalid overlay: {repository}@{ref} {package}')
    if path.startswith('/') or '..' in path.split('/'):
        sys.exit(f'Invalid overlay path: {path}')
    return {'repository': repository, 'ref': ref, 'package': package, 'path': path or '.'}


def main():
    stack_file, caller = sys.argv[1], sys.argv[2]
    extra = sys.argv[3] if len(sys.argv) > 3 else ''

    stack = json.load(open(stack_file)) if stack_file else {}
    overlays = [overlay(o['repository'], o['ref'], o['package'], o.get('path', '.')) for o in stack.get('overlays', [])]

    for line in extra.splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) not in (2, 3) or '@' not in parts[0]:
            sys.exit(f'Invalid extra overlay line: {line}')
        repository, ref = parts[0].split('@', 1)
        overlays.append(overlay(repository, ref, parts[1], parts[2] if len(parts) == 3 else '.'))

    overlays = [o for o in overlays if o['repository'].lower() != caller.lower()]
    packages = [o['package'] for o in overlays]
    if len(packages) != len(set(packages)):
        sys.exit('The same package is overlaid twice.')

    print(f"fleetbase_ref={stack.get('fleetbase-ref', '')}")
    print(f"build_from_source={'true' if stack.get('build-from-source') else 'false'}")
    print('overlays<<EOF')
    for o in overlays:
        print(o['repository'], o['ref'], o['package'], o['path'])
    print('EOF')


if __name__ == '__main__':
    main()
