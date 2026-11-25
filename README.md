# 🎬 Now Filming in London

A daily **call sheet** for film and TV shoots spotted on London's streets. It maps clapperboards for sets, film lights for upcoming set-ups, yellow lamppost arrows with production codes, and Winnebagos for unit bases.

**Live:** https://dedomenici.github.io/now-filming-in-london/

- `data/shoots.json` holds every production, sighting, codename, signage note, photo credit and source link, with confidence levels.
- `data/digest-latest.md` is the latest daily digest, written in call-sheet voice.
- `scripts/digest.py` builds the digest by diffing `data/shoots.prev.json` against `data/shoots.json`.
- `scripts/validate.py` checks the data before you push.
- `scripts/update.md` explains how the daily refresh is done.

Rules of the set: real sightings only, every entry sourced and dated, photos credited and linked, and no invented codenames.

Map © OpenStreetMap contributors. Weather from Open-Meteo. Icons are hand-made SVG.

Vibecoded by [DeDomenici](https://dedomenici.com).
