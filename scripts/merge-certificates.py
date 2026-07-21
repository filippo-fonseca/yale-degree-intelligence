#!/usr/bin/env python3
"""Merge lib/data/certificates/structured/*.json → lib/data/all_certificates.json.

The merge copies each structured certificate through verbatim, including its
optional `policy` block. `policy` is validated on the way through so a typo in a
key or a wrong value type fails here rather than silently reaching the engine.
See lib/data/certificates/SCHEMA.md for the field meanings and defaults.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STRUCTURED = ROOT / "lib/data/certificates/structured"
OUT = ROOT / "lib/data/all_certificates.json"

# field name -> (accepted python types, human description)
POLICY_FIELDS: dict[str, tuple[tuple[type, ...], str]] = {
    "overlapCap": ((int,), "int"),
    "zeroOverlap": ((bool,), "bool"),
    "overlapMinLevel": ((int, type(None)), "int or null"),
    "sameDeptCap": ((int, type(None)), "int or null"),
    "minGrade": ((str, type(None)), "string or null"),
    "ineligibleMajors": ((list,), "list of major ids"),
    "extraForms": ((list,), "list of strings"),
    "nonCourseRequirements": ((list,), "list of strings"),
    "sourceNote": ((str,), "string"),
}

LIST_FIELDS = ("ineligibleMajors", "extraForms", "nonCourseRequirements")


def validate_policy(cid: str, policy: object) -> None:
    """Fail loudly on an unknown key, a wrong type, or an impossible value."""
    if not isinstance(policy, dict):
        raise SystemExit(f"{cid}: `policy` must be an object, got {type(policy).__name__}")

    for key, value in policy.items():
        if key not in POLICY_FIELDS:
            known = ", ".join(sorted(POLICY_FIELDS))
            raise SystemExit(f"{cid}: unknown policy field {key!r}. Known fields: {known}")
        accepted, described = POLICY_FIELDS[key]
        # bool is a subclass of int in Python, so reject it where an int is meant.
        if key != "zeroOverlap" and isinstance(value, bool):
            raise SystemExit(f"{cid}: policy.{key} must be {described}, got bool")
        if not isinstance(value, accepted):
            raise SystemExit(
                f"{cid}: policy.{key} must be {described}, got {type(value).__name__}"
            )

    for key in LIST_FIELDS:
        for item in policy.get(key, []):
            if not isinstance(item, str) or not item.strip():
                raise SystemExit(f"{cid}: policy.{key} entries must be non-empty strings")

    cap = policy.get("overlapCap")
    if cap is not None and cap < 0:
        raise SystemExit(f"{cid}: policy.overlapCap must be >= 0, got {cap}")
    if policy.get("zeroOverlap") and cap not in (None, 0):
        raise SystemExit(
            f"{cid}: policy.zeroOverlap is true, so policy.overlapCap must be 0 (got {cap})"
        )
    same_dept_cap = policy.get("sameDeptCap")
    if same_dept_cap is not None and same_dept_cap < 1:
        raise SystemExit(f"{cid}: policy.sameDeptCap must be >= 1, got {same_dept_cap}")


def main() -> None:
    merged: dict = {}
    with_policy = 0
    for path in sorted(STRUCTURED.glob("CERT_*.json")):
        obj = json.loads(path.read_text())
        cid = obj["id"]
        if cid in merged:
            raise SystemExit(f"Duplicate certificate id: {cid}")
        if "policy" in obj:
            validate_policy(cid, obj["policy"])
            with_policy += 1
        merged[cid] = obj
    OUT.write_text(json.dumps(merged, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {OUT} ({len(merged)} certificates, {with_policy} with a policy block)")


if __name__ == "__main__":
    main()
