#!/usr/bin/env python3
"""Merge lib/data/certificates/structured/*.json → lib/data/all_certificates.json."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STRUCTURED = ROOT / "lib/data/certificates/structured"
OUT = ROOT / "lib/data/all_certificates.json"


def main() -> None:
    merged: dict = {}
    for path in sorted(STRUCTURED.glob("CERT_*.json")):
        obj = json.loads(path.read_text())
        cid = obj["id"]
        if cid in merged:
            raise SystemExit(f"Duplicate certificate id: {cid}")
        merged[cid] = obj
    OUT.write_text(json.dumps(merged, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {OUT} ({len(merged)} certificates)")


if __name__ == "__main__":
    main()
