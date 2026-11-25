# Daily refresh: how "Now Filming in London" gets updated

Run this once a day, ideally around 08:00 London time. It's agent-driven: Reddit blocks plain `curl` from the box, so use a web-fetch tool for Reddit.

## 0. Prep
```bash
cd /workspace/now-filming && git pull --ff-only
cp data/shoots.json data/shoots.prev.json      # snapshot for the digest diff
```

## 1. Gather (last ~48 h, newest first)
1. **r/whatsfilminginlondon** (best source). Fetch `https://www.reddit.com/r/whatsfilminginlondon/new.json?limit=25`.
   For each post newer than `last_updated`, fetch `<permalink>.json` and read the comments. Spotters often name the production, the codes on lamppost arrows (e.g. `PIC` = Piccadilly = Slow Horses, `BOC` = Ministry of Time) and the unit base location.
   Photos: use the 640px `preview.redd.it` thumbnail. Credit `u/<author> on r/whatsfilminginlondon` and link to the post.
2. **Other subreddits**: `r/london`, `r/LondonSocialClub`, `r/CasualUK`, via `/search.json?q=filming&restrict_sr=1&sort=new&t=week`.
3. **X**: x-namespace `search_posts_all`, e.g. `("filming" OR "film crew" OR "unit base" OR "film set") london -is:retweet`, since yesterday, plus title-specific searches for live productions. X is noisy: it's mostly old-shoot trivia and casting spam, so only keep posts that are dated, located sightings.
4. **Local news / notices**: Camden New Journal, MyLondon, Evening Standard, Time Out, londonstreets.uk, borough news, and resident-association blogs (e.g. Lee Manor Society). Search for "filming" + "parking suspended" or "letter to residents".
5. **Trade press**: the Screen Daily "productions shooting in the UK" list (updated roughly weekly), Deadline and Variety "starts shooting in London", and Film London's monthly "What's On Screen and Filming".
6. **Facebook** groups and pages are behind a login wall, so skip them. Only use them when a news story quotes them.

## 2. Edit `data/shoots.json`
- Add new productions or sightings, and add new `locations` (lat/lng from Nominatim; mark `approx: true` when the exact street isn't known), `signage`, `photos` and `references`, each with a URL and date.
- Never invent a title, codename, location or photo. If the production is unknown, use `UNIDENTIFIED – …` with `confidence: low`.
- Confidence:
  - `high`: an official, trade or multiple dated sources.
  - `medium`: a single press source, or a strong signage or code match.
  - `low`: an unidentified spotter report.
- Status: `filming`, `wrapping`, `wrapped` or `recent`. Delete entries with no sighting in about 21 days unless a trade source still lists them as shooting in London.
- Set `last_updated` to the current UTC time and `previous_update` to the old value.

## 3. Check, digest, publish
```bash
python3 scripts/validate.py
python3 scripts/digest.py            # writes data/digest-latest.md / .html + data/digests/YYYY-MM-DD.md
git add -A && git commit -m "Daily call sheet $(date -u +%F)" && git push
```
GitHub Pages redeploys in about a minute: https://dedomenici.github.io/now-filming-in-london/

## 4. Send Richard the digest
Send the contents of `data/digest-latest.md`, keeping it short. If nothing changed, send a single "quiet day on set" line, or nothing at all, whichever the routine is set to do.
