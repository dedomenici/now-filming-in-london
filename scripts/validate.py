#!/usr/bin/env python3
"""Sanity-check data/shoots.json before pushing. Exit 1 on problems."""
import json, sys, os, re
p = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data/shoots.json")
d = json.load(open(p)); bad = []
assert re.match(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}", d["last_updated"]), "last_updated missing"
ids = set()
for s in d["shoots"]:
    i = s.get("id"); 
    if i in ids: bad.append(f"duplicate id {i}")
    ids.add(i)
    for k in ("title", "type", "status", "confidence", "references", "locations", "dates"):
        if k not in s: bad.append(f"{i}: missing {k}")
    if s.get("confidence") not in ("high", "medium", "low"): bad.append(f"{i}: bad confidence")
    if s.get("type") not in ("film", "tv", "unknown"): bad.append(f"{i}: bad type")
    if not s.get("references"): bad.append(f"{i}: no references (every entry needs a source)")
    for r in s.get("references", []):
        if not r.get("url", "").startswith("http"): bad.append(f"{i}: bad ref url")
    for l in s.get("locations", []):
        if not (51.2 < l["lat"] < 51.8 and -0.6 < l["lng"] < 0.35): bad.append(f"{i}: {l['name']} outside London box")
        if l.get("kind") not in ("set", "unit_base", "signage"): bad.append(f"{i}: bad kind {l.get('kind')}")
    for ph in s.get("photos", []):
        if not (ph.get("credit") and ph.get("link")): bad.append(f"{i}: photo needs credit + link")
print("\n".join(bad) or f"OK: {len(d['shoots'])} shoots")
sys.exit(1 if bad else 0)
