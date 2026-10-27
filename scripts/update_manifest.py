"""Refresh checksums after intentional app edits; never changes virtual URLs."""

import hashlib
import json
import pathlib

root = pathlib.Path(__file__).resolve().parents[1] / "app"
p = root / "release-manifest.json"
m = json.loads(p.read_text(encoding="utf-8"))
for rel in set(m["files"]) | set(m["routes"].values()):
    b = (root / rel).read_bytes()
    m["files"][rel] = {"bytes": len(b), "sha256": hashlib.sha256(b).hexdigest()}
p.write_text(json.dumps(m, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("Updated", len(m["files"]), "file checksums.")
