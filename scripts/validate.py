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
        ct = l.get("call_time")
        if ct:
            if ct.get("status") not in ("confirmed", "reported"): bad.append(f"{i}: call_time.status must be confirmed|reported")
            if not ct.get("source_url", "").startswith("http"): bad.append(f"{i}: call_time needs source_url")
            if bool(ct.get("start")) != bool(ct.get("end")): bad.append(f"{i}: call_time needs both start and end")
        for sd in l.get("schedule_dates", []):
            if not re.match(r"\d{4}-\d{2}-\d{2}$", sd): bad.append(f"{i}: bad schedule_date {sd}")
    if "photos" in s: bad.append(f"{i}: use 'images', not 'photos'")
    for ph in s.get("images", []):
        if not (ph.get("credit") and ph.get("link","").startswith("http") and ph.get("thumb","").startswith("https://")): bad.append(f"{i}: image needs https thumb + credit + source link")
        if not ph.get("platform"): bad.append(f"{i}: image needs platform")
    for grp in ("cast", "crew"):
        if grp not in s: bad.append(f"{i}: missing {grp} (use [] + cast_note when unknown)")
        for person in s.get(grp, []):
            if person.get("status") not in ("confirmed", "reported"): bad.append(f"{i}: {person.get('name')} needs status confirmed|reported")
            if not person.get("source_url", "").startswith("http"): bad.append(f"{i}: {person.get('name')} needs source_url")
    if not s.get("cast") and not s.get("crew") and not s.get("cast_note"): bad.append(f"{i}: empty cast/crew needs cast_note")
    th = s.get("typical_hours")
    if not th or not re.match(r"\d\d:\d\d$", th.get("start","")) or not re.match(r"\d\d:\d\d$", th.get("end","")): bad.append(f"{i}: typical_hours start/end HH:MM required")
    elif th.get("basis") not in ("estimate", "source"): bad.append(f"{i}: typical_hours.basis must be estimate|source")
print("\n".join(bad) or f"OK: {len(d['shoots'])} shoots")
sys.exit(1 if bad else 0)
