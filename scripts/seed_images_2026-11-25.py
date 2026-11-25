# One-off: move photos -> images, add crowdsourced Reddit post + comment images (25 Nov 2026), fix the Crouch End ID.
import json
p="data/shoots.json"; d=json.load(open(p)); S={s["id"]:s for s in d["shoots"]}
X=json.load(open("research/images.json"))
R="https://www.reddit.com"
for s in d["shoots"]:
    old=s.pop("photos",[])
    s["images"]=[{"thumb":o["thumb"],"link":o["link"],"credit":o["credit"].split(" on ")[0],"platform":"reddit","date":None,"caption":o["caption"]} for o in old]
def add(sid,img):
    if any(i["thumb"].split("?")[0]==img["thumb"].split("?")[0] for i in S[sid]["images"]): return
    S[sid]["images"].append(img)
for sid,imgs in X.items():
    for i in imgs:
        if i["credit"]=="u/rollo_read": continue  # lamppost photo from an older shoot, not this one
        big = "width=640" not in i["thumb"]
        add(sid,{**i,"large":big})
for s in d["shoots"]:
    for i in s["images"]:
        if not i.get("date"):
            m=[x for x in X.get(s["id"],[]) if x["thumb"].split("?")[0]==i["thumb"].split("?")[0]]
            i["date"]=m[0]["date"] if m else None
        i.setdefault("large",False)
add("unknown-mint-street-jj",{"thumb":"https://preview.redd.it/aw8t6xz1js0i1.jpeg?width=640&crop=smart&auto=webp&s=2684a069171f371b778f754bed37492528330071","link":R+"/r/whatsfilminginlondon/comments/1xsnhy4/mint_street_park/","credit":"u/rtts-","platform":"reddit","date":"2026-11-09","caption":"Mint Street park?","large":False})
for sid,dt in (("unknown-mint-street-jj","2026-11-09"),("unknown-apple-clerkenwell",None)):
    for i in S[sid]["images"]:
        if not i.get("date"): i["date"]= dt or ("2026-11-16" if "Coldharbour" in i["caption"] else "2026-11-14")
for s in d["shoots"]:
    for i in s["images"]:
        if not i["credit"].startswith("u/") and i["platform"].startswith("reddit"): i["credit"]="u/"+i["credit"]
# Crouch End: letters say Disney+/FX; title disputed (Mosquito rumour vs Far Cry paperwork claim)
m=S["mosquito"]
m["title"]="Disney+/FX drama at The Queens (Mosquito or Far Cry?)"
m["company"]="Disney+ / FX (per residents' letters); title unconfirmed"
m["confidence"]="medium"
m["summary"]=("Residents' letters said a new Disney+/FX drama, and The Queens in Crouch End was tented for night interiors, 13–19 Nov. Two IDs are doing the rounds. "
 "One is Mosquito (Hoult/Edgar-Jones), Disney's newest UK start, which press reports suggest. The other is FX's Far Cry: a Redditor says a friend saw it on shoot paperwork. Neither is confirmed. "
 "Mosquito's crew used 'GC' (Gilded Curve) signs in Bristol, per a spotter.")
m["cast"]=[]; m["crew"]=[]
m["cast_note"]="Unknown until the title is confirmed. If it's Mosquito: Nicholas Hoult and Daisy Edgar-Jones (Screen Daily). If it's Far Cry: no London sighting of cast has been reported."
m["codenames"]=["GC? (Mosquito's sign code in Bristol, not seen here)"]
m["references"].append({"title":"Crouch End (Elder Ave): Disney+/FX letter; 'Far Cry' paperwork claim; Mosquito 'GC' signs","publisher":"r/whatsfilminginlondon","date":"2026-11-10","url":R+"/r/whatsfilminginlondon/comments/1xt0s35/crouch_end/"})
sh=S["slow-horses-s8"]
sh["references"].append({"title":"Spotter links the S8 director's Instagram post saying they wrapped on Sunday 22 Nov","publisher":"r/whatsfilminginlondon","date":"2026-11-23","url":R+"/r/whatsfilminginlondon/comments/1y15g7k/filming_in_canada_water/"})
sh["status"]="wrapped"
sh["summary"]+=" Update: a spotter linked the director's Instagram post saying S8 wrapped on Sun 22 Nov, so it's now marked wrapped."
json.dump(d,open(p,"w"),indent=1,ensure_ascii=False)
for s in d["shoots"]: print(len(s["images"]),s["id"])
