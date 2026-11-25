# One-off: add cast/crew/typical_hours/call_time fields from sources already cited in shoots.json (25 Nov 2026).
import json
p="data/shoots.json"; d=json.load(open(p)); S={s["id"]:s for s in d["shoots"]}
SCREEN="https://www.screendaily.com/news/2026-film-and-high-end-tv-productions-shooting-in-the-uk-and-ireland-latest-updates/5212395.article"
def P(names, status, url, role=None):
    return [{"name":n if isinstance(n,str) else n[0], "role": (n[1] if not isinstance(n,str) else role), "status":status, "source_url":url} for n in names]
DEFAULT_HOURS={"start":"08:00","end":"18:00","basis":"estimate","note":"Typical London location day: crew call ~07:00, shooting ~08:00–18:00. Unit bases are busiest early morning."}

b=S["beatles-clover"]
b["cast"]=P([("Harris Dickinson","John Lennon"),("Paul Mescal","Paul McCartney"),("Barry Keoghan","Ringo Starr"),("Joseph Quinn","George Harrison")],"confirmed",SCREEN)
b["crew"]=P([("Sam Mendes","Director")],"confirmed",SCREEN)+P([("Neal Street Productions","Production company")],"confirmed",SCREEN)
for l in b["locations"]:
    if l["name"].startswith("Fitzroy"):
        l["call_time"]={"date":"2026-11-27","start":"10:00","end":"16:00","status":"reported","source_url":"https://www.camdennewjournal.co.uk/article/fab-four-in-fitzrovia-vintage-cars-on-way-for-film-set-in-1960s","note":"'Roughly 10am to 4pm' per the production's letter to residents (Camden New Journal)."}
        l["schedule_dates"]=["2026-11-27"]
    if l["name"].startswith("St John's Wood"):
        l["schedule_dates"]=["2026-11-26","2026-11-27","2026-11-30"]
        l["call_time"]={"note":"Shoot dates from a casting-portal call; hours not published.","status":"reported","source_url":"https://projectcasting.com/blog/casting-calls-acting-auditions/london/now-filming-in-london"}
    if l["name"].startswith("Dacre Arms"):
        l["call_time"]={"date":"2026-11-03","start":"11:00","end":"23:59","status":"reported","source_url":"https://leemanorsociety.org/the-beatles-are-coming-to-lee/","note":"11am until midnight (resident flyer)."}
        l["schedule_dates"]=["2026-11-03"]
b["typical_hours"]=DEFAULT_HOURS

c=S["clay"]
c["cast"]=P(["Nicolas Cage","Michael Sheen","Jordi Mollà"],"confirmed",SCREEN)+P(["Brenton Thwaites","Erin Moriarty"],"confirmed","https://deadline.com/2026/11/brenton-thwaites-erin-moriarty-join-clay-filming-london-1237212225/")+P(["Emilio Sakraya","Adrian Topol"],"reported","https://creepycatalog.com/nicolas-cage-was-photographed-filming-a-car-crash-scene-in-london-for-c-l-a-y-a-cyber-thriller-with-michael-sheen/")
c["crew"]=P([("Simon Afram","Writer-director")],"confirmed",SCREEN)+P([("Georgette Turner","Producer")],"reported","https://creepycatalog.com/nicolas-cage-was-photographed-filming-a-car-crash-scene-in-london-for-c-l-a-y-a-cyber-thriller-with-michael-sheen/")
c["typical_hours"]=DEFAULT_HOURS

n=S["naughty"]
n["cast"]=P(["Jennifer Aniston","Peter Dinklage","Regina Hall"],"confirmed",SCREEN)
n["crew"]=P([("Olivia Wilde","Director")],"confirmed",SCREEN)+P([("LuckyChap","Production company")],"confirmed",SCREEN)
n["typical_hours"]=DEFAULT_HOURS

m=S["mummy"]
m["cast"]=P(["Rachel Weisz","Brendan Fraser","John Hannah"],"confirmed",SCREEN)+P(["Michael Johnston"],"reported","https://comicbookmovie.com/monsters/mummy/the-mummy-book-of-the-dead-set-videos-reveal-chaotic-action-scene-and-a-first-look-at-michael-johnston-a230678")
m["crew"]=P([("Matt Bettinelli-Olpin","Co-director"),("Tyler Gillett","Co-director")],"confirmed",SCREEN)
m["typical_hours"]=DEFAULT_HOURS

g=S["gentlemen-s3"]
WON="https://www.whats-on-netflix.com/news/the-gentlemen-season-3-set-photos-saffron-burrows/"
g["cast"]=P(["Theo James","Kaya Scodelario","Harry Goodwins","Saffron Burrows"],"confirmed",WON)+P(["Joely Richardson","Maya Jama","Jasmine Blackborow"],"reported",WON)+P(["Robert Carlyle","Elijah Wood","Orlando Bloom","Dexter Fletcher","Bruna Marquezine","Ed Speleers"],"confirmed",WON)
g["crew"]=P([("Guy Ritchie","Creator; seen on location")],"reported",WON)
g["typical_hours"]=DEFAULT_HOURS

sh=S["slow-horses-s8"]
VAR="https://variety.com/2026/tv/global/slow-horses-more-seasons-jack-lowden-1236948628/"
sh["cast"]=P(["Gary Oldman","Olivia Cooke"],"confirmed",VAR)+P(["Jack Lowden"],"reported","https://www.dailymail.com/news/article-16255227/Slow-Horses-Jack-Lowden-left-dead-spy-drama.html")+P(["Michael McElhatton"],"confirmed","https://www.iftn.ie/news/locationsnews/?act1=record&aid=73&force=1&only=1&rid=4297479&tpl=archnews")
FDT="https://www.fdtimes.com/2026/10/26/slow-horses/"
sh["crew"]=P([("Adam Randall","Director")],"confirmed","https://www.iftn.ie/news/locationsnews/?act1=record&aid=73&force=1&only=1&rid=4297479&tpl=archnews")+P([("Eben Bolter","Director of photography")],"confirmed",FDT)+P([("Ben Vanstone","Writer / EP")],"confirmed","https://www.iftn.ie/news/locationsnews/?act1=record&aid=73&force=1&only=1&rid=4297479&tpl=archnews")
sh["typical_hours"]={**DEFAULT_HOURS,"note":"DoP Eben Bolter (Oct): in London they take Fridays and Saturdays off and shoot Sundays. Hours are an estimate.","source_url":FDT,"days_off":["Fri","Sat"]}

mo=S["mosquito"]
mo["cast"]=P(["Nicholas Hoult","Daisy Edgar-Jones"],"confirmed",SCREEN)
mo["crew"]=P([("Tony McNamara","Creator / writer")],"confirmed",SCREEN)
mo["typical_hours"]=DEFAULT_HOURS

mt=S["ministry-of-time"]; BBC="https://www.bbc.co.uk/mediacentre/2026/the-ministry-of-time-further-casting"
mt["cast"]=P(["Aoife Hinds","Billy Howle","Hong Chau","Adeel Akhtar","Tamara Lawrance","Emily Fairn","Josh Finan","Aisling Loftus","Ciarán Hinds"],"confirmed",BBC)
mt["crew"]=P([("Aneil Karia","Lead director"),("Alice Birch","Writer"),("Frances du Pille","Producer")],"confirmed",BBC)
mt["typical_hours"]=DEFAULT_HOURS

ml=S["mobland-s3"]; DL="https://deadline.com/2026/11/mobland-season-3-starts-shooting-finale-paramount-1237230065/"
ml["cast"]=P(["Tom Hardy","Helen Mirren","Pierce Brosnan"],"confirmed",DL)
ml["crew"]=P([("Ronan Bennett","Series creator")],"confirmed",SCREEN)+P([("Jez Butterworth","Showrunner")],"confirmed",DL)
ml["typical_hours"]=DEFAULT_HOURS

bt=S["batman-2"]; DB="https://deadline.com/2026/10/robert-pattinson-says-the-batman-part-ii-is-filming-again-1237173078/"
bt["cast"]=P(["Robert Pattinson","Colin Farrell","Andy Serkis","Scarlett Johansson","Sebastian Stan","Brian Tyree Henry","Jayme Lawson","Charles Dance","Gil Perez-Abraham","Sebastian Koch"],"confirmed",DB)
bt["crew"]=P([("Matt Reeves","Writer-director"),("Steven Soderbergh","Completing principal photography")],"confirmed",DB)
bt["typical_hours"]=DEFAULT_HOURS

ld=S["lords-day"]
ld["cast"]=P(["Damson Idris","Timothy Spall","Gemma Whelan","Harry Lawtey"],"confirmed",SCREEN)
ld["crew"]=P([("Ben Chanan","Series creator"),("Bad Wolf","Production company")],"confirmed",SCREEN)
ld["typical_hours"]=DEFAULT_HOURS

hp=S["harry-potter-s2"]
hp["cast"]=P(["Dominic McLaughlin","Arabella Stanton","Alastair Stout"],"confirmed",SCREEN)
hp["crew"]=P([("Francesca Gardiner","Series creator")],"confirmed",SCREEN)
hp["visitable"]=False
hp["typical_hours"]={**DEFAULT_HOURS,"note":"Closed studio stages, so not visitable."}

ua=S["unknown-apple-clerkenwell"]
ua["cast"]=[]; ua["crew"]=[]; ua["cast_note"]="Unknown. Reddit rumours of Ashley Walters are unverified."
for l in ua["locations"]:
    if "St John's Gate" in l["name"]: l["night"]=True
ua["typical_hours"]=DEFAULT_HOURS
for k in ("unknown-canada-water","unknown-stockwell-bly","unknown-mint-street-jj","short-lea-bridge"):
    S[k]["cast"]=[]; S[k]["crew"]=[]; S[k]["cast_note"]="Unknown production, so cast and crew are unknown."; S[k]["typical_hours"]=DEFAULT_HOURS
for l in S["unknown-stockwell-bly"]["locations"]: l["night"]=True; l["call_time"]={"note":"Seen filming in the evening (24 Nov).","status":"reported","source_url":"https://www.reddit.com/r/whatsfilminginlondon/comments/1y4rxfc/albert_square_stockwell/"}
json.dump(d,open(p,"w"),indent=1,ensure_ascii=False); print("ok")
