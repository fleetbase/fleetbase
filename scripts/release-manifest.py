#!/usr/bin/env python3
"""Checks upgrade.yml, and builds the signed release manifest from it.

  release-manifest.py check upgrade.yml
  release-manifest.py build upgrade.yml VERSION API CONSOLE SOCKET STACK_URL STACK_SHA256 > manifest.yml

API, CONSOLE and SOCKET are image references pinned by digest. Signing happens separately, over the
exact bytes this prints. The engine's own check is gantry's internal/manifest: keep the two in step.
"""
import re
import sys

import yaml

VERSION = re.compile(r"^v\d+\.\d+\.\d+$")
ENGINE = re.compile(r"^v?\d+\.\d+\.\d+$")
PINNED = re.compile(r"^[a-z0-9./_-]+@sha256:[0-9a-f]{64}$")
SHA256 = re.compile(r"^[0-9a-f]{64}$")
HAND_WRITTEN = {"schema", "version", "min_from", "engine_min", "risk", "stop", "migrations", "downtime_minutes", "notes", "steps"}


def problems(doc):
    out = []
    if not isinstance(doc, dict):
        return ["upgrade.yml must be a mapping"]
    for key in sorted(set(doc) - HAND_WRITTEN):
        out.append(f"{key} isn't allowed here (CI adds images and stack)")
    for key in sorted(HAND_WRITTEN - {"steps"} - set(doc)):
        out.append(f"{key} is missing")
    if doc.get("schema") != 1:
        out.append("schema must be 1")
    for key in ("version", "min_from"):
        if not VERSION.match(str(doc.get(key, ""))):
            out.append(f"{key} must look like v1.2.3")
    if not ENGINE.match(str(doc.get("engine_min", ""))):
        out.append("engine_min must look like 1.2.3")
    if doc.get("risk") not in ("safe", "review", "action"):
        out.append("risk must be safe, review or action")
    for key in ("stop", "migrations"):
        if not isinstance(doc.get(key), bool):
            out.append(f"{key} must be true or false")
    if not isinstance(doc.get("downtime_minutes"), int) or doc.get("downtime_minutes", 0) < 0:
        out.append("downtime_minutes must be a whole number")
    if not isinstance(doc.get("notes"), str) or not doc.get("notes"):
        out.append("notes must say what changed, in plain language")
    seen = set()
    steps = doc.get("steps") or []
    if not isinstance(steps, list):
        return out + ["steps must be a list"]
    needs_action = False
    for step in steps:
        sid = step.get("id") if isinstance(step, dict) else None
        if not sid or not step.get("text") or sid in seen:
            out.append("every step needs a unique id and text")
            continue
        seen.add(sid)
        if set(step) - {"id", "kind", "ack", "text", "setting"}:
            out.append(f"step {sid} has an unknown field")
        if step.get("kind") not in ("before-upgrade", "after-upgrade"):
            out.append(f"step {sid}: kind must be before-upgrade or after-upgrade")
        if step.get("ack") not in ("read", "setting"):
            out.append(f"step {sid}: ack must be read or setting")
        if step.get("ack") == "setting" and not step.get("setting"):
            out.append(f"step {sid}: ack setting needs a setting")
        needs_action = needs_action or step.get("kind") == "before-upgrade"
    if needs_action and doc.get("risk") == "safe":
        out.append("a release with before-upgrade steps can't be risk: safe, or it could upgrade automatically past them")
    return out


def unreviewed(version):
    """What a release gets when nobody updated upgrade.yml. It blocks automation."""
    return {
        "schema": 1,
        "version": version,
        "min_from": version,
        "engine_min": "1.0.0",
        "risk": "review",
        "stop": False,
        "migrations": True,
        "downtime_minutes": 5,
        "notes": "This release hasn't been reviewed for upgrades yet.",
        "steps": [],
    }


def build(path, version, api, console, socket, stack_url, stack_sha):
    for name, ref in (("api", api), ("console", console), ("socket", socket)):
        if not PINNED.match(ref):
            sys.exit(f"{name} image must be pinned by digest: {ref}")
    if not stack_url.startswith("https://"):
        sys.exit("the stack URL must be https")
    if not SHA256.match(stack_sha):
        sys.exit("the stack hash must be sha256 hex")
    try:
        with open(path) as f:
            doc = yaml.safe_load(f)
    except FileNotFoundError:
        doc = None
    if doc is None or doc.get("version") != version:
        print(f"::warning::upgrade.yml isn't for {version}, so this release is published as risk: review", file=sys.stderr)
        doc = unreviewed(version)
    found = problems(doc)
    if found:
        sys.exit("upgrade.yml:\n  " + "\n  ".join(found))
    # The engine requires this field, so an empty list stays explicit rather than absent.
    doc.setdefault("steps", [])
    doc["images"] = {"api": api, "console": console, "socket": socket}
    doc["stack"] = {"url": stack_url, "sha256": stack_sha}
    yaml.safe_dump(doc, sys.stdout, sort_keys=False)


def main():
    if len(sys.argv) == 3 and sys.argv[1] == "check":
        with open(sys.argv[2]) as f:
            found = problems(yaml.safe_load(f))
        if found:
            sys.exit("upgrade.yml:\n  " + "\n  ".join(found))
        print("upgrade.yml is good")
    elif len(sys.argv) == 9 and sys.argv[1] == "build":
        build(*sys.argv[2:])
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
