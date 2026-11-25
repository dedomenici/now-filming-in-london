#!/usr/bin/env python3
"""Daily digest generator for Now Filming in London.

Usage:  python3 scripts/digest.py [previous_json] [current_json]
Defaults: previous = data/shoots.prev.json (snapshot taken before the refresh),
          current  = data/shoots.json
Writes data/digest-latest.md and data/digest-latest.html, and appends to data/digests/YYYY-MM-DD.md.
"""
import json, sys, os, html, datetime

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
prev_p = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, "data/shoots.prev.json")
cur_p = sys.argv[2] if len(sys.argv) > 2 else os.path.join(root, "data/shoots.json")
cur = json.load(open(cur_p))
prev = json.load(open(prev_p)) if os.path.exists(prev_p) else {"shoots": []}
P = {s["id"]: s for s in prev.get("shoots", [])}
C = {s["id"]: s for s in cur["shoots"]}

def locs(s): return {(l["name"], l.get("date")) for l in s.get("locations", [])}
def signs(s): return {x["text"] for x in s.get("signage", [])}
def where(s):
    ls = sorted(s.get("locations", []), key=lambda l: l.get("date") or "", reverse=True)
    return ls[0]["name"] if ls else "location TBC"

new, changed, gone = [], [], []
for k, s in C.items():
    if k not in P:
        new.append(s); continue
    p = P[k]; notes = []
    nl = locs(s) - locs(p)
    if nl: notes.append("new location: " + "; ".join(f"{n} ({d})" for n, d in sorted(nl)))
    ns = signs(s) - signs(p)
    if ns: notes.append("new signage: " + ", ".join(sorted(ns)))
    for f in ("status", "confidence", "title", "working_title"):
        if s.get(f) != p.get(f): notes.append(f"{f}: {p.get(f)} → {s.get(f)}")
    if len(s.get("references", [])) > len(p.get("references", [])): notes.append(f"+{len(s['references'])-len(p.get('references', []))} source(s)")
    if notes: changed.append((s, notes))
for k, p in P.items():
    if k not in C: gone.append(p)

day = cur["last_updated"][:10]
dt = datetime.date.fromisoformat(day).strftime("%a %d %b %Y").upper()
live = [s for s in C.values() if s.get("status") in ("filming", "wrapping")]
L = []
L.append(f"# 🎬 NOW FILMING IN LONDON — DAILY CALL SHEET")
L.append(f"**DAY:** {dt} · **UNITS ON THE BOARD:** {len(C)} · **SHOOTING NOW:** {len(live)}")
L.append("")
L.append("Morning, Richard. Coffee's on the catering truck. Here's what moved overnight.")
L.append("")
def line(s):
    code = f" · code **{', '.join(s['codenames'])}**" if s.get("codenames") else ""
    return f"- **{s['title']}** ({s['type'].upper()}) — {where(s)}{code} · confidence {s['confidence'].upper()}"
if new:
    L.append(f"## 🆕 NEW ON THE CALL SHEET ({len(new)})")
    L += [line(s) for s in sorted(new, key=lambda s: {"high":0,"medium":1,"low":2}.get(s["confidence"],3))]
    L.append("")
if changed:
    L.append(f"## 🔁 SCHEDULE CHANGES ({len(changed)})")
    for s, n in changed: L.append(f"- **{s['title']}** — " + "; ".join(n))
    L.append("")
if gone:
    L.append(f"## 🏁 THAT'S A WRAP / DROPPED ({len(gone)})")
    L += [f"- ~~{p['title']}~~" for p in gone]
    L.append("")
if not (new or changed or gone):
    L.append("## 😴 QUIET DAY ON SET")
    L.append("Nothing new since the last call sheet. The runners are still looking.")
    L.append("")
# signage of the day
sg = [(x, s) for s in C.values() for x in s.get("signage", [])]
sg.sort(key=lambda t: t[0].get("date") or "", reverse=True)
if sg:
    x, s = sg[0]
    L.append(f"## 🟨 LAMPPOST ARROW OF THE DAY\n`{x['text']}` ({x.get('colour','')}) at {x['where']}, {x.get('date','')}, for {s['title']}.")
    L.append("")
L.append("**Map:** https://dedomenici.github.io/now-filming-in-london/")
L.append("")
L.append("_All entries link their sources. Low-confidence entries are spotter reports, not confirmed productions._")
md = "\n".join(L) + "\n"
os.makedirs(os.path.join(root, "data/digests"), exist_ok=True)
open(os.path.join(root, "data/digest-latest.md"), "w").write(md)
open(os.path.join(root, f"data/digests/{day}.md"), "w").write(md)
# tiny HTML version
h = ["<!doctype html><meta charset=utf-8><title>Now Filming in London – digest</title>",
     "<body style=\"font-family:'Courier Prime',Courier,monospace;max-width:680px;margin:2em auto;line-height:1.45\">"]
for l in md.splitlines():
    e = html.escape(l)
    import re
    e = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", e); e = re.sub(r"~~(.+?)~~", r"<s>\1</s>", e)
    e = re.sub(r"`(.+?)`", r"<code style='background:#ffd400;padding:0 4px'>\1</code>", e)
    e = re.sub(r"(https://\S+)", r"<a href='\1'>\1</a>", e)
    if l.startswith("# "): h.append(f"<h1>{e[2:]}</h1>")
    elif l.startswith("## "): h.append(f"<h2>{e[3:]}</h2>")
    elif l.startswith("- "): h.append(f"<div>• {e[2:]}</div>")
    elif l: h.append(f"<p>{e}</p>")
open(os.path.join(root, "data/digest-latest.html"), "w").write("\n".join(h))
print(md)
