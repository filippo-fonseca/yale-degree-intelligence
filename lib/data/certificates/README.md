# Yale College Certificates — requirement data

Compiled from [YCPS Certificates](https://catalog.yale.edu/ycps/programs_certificates/) (2026–2027) for Degree Intelligence v3.

## Layout

| Path | Purpose |
|------|---------|
| `manifest.json` | Inventory of all 42 certificates + catalog URLs |
| `raw/{ID}.json` | Raw scraped Overview / Certificate / Intensive tab text |
| `structured/{ID}.json` | Per-certificate requirements in majors-compatible schema |
| `SCHEMA.md` | Schema documentation |
| `../all_certificates.json` | Merged structured data (canonical import) |

## Scraper

```bash
python3 scripts/scrape-certificates.py
```

Yale catalog tabs (**Overview**, **Summary of Requirements**, **Certificate**, etc.) are client-side DOM toggles — content is embedded in HTML containers, so Playwright is not required.

## Next (not in this PR)

- Certificates page UI (parallel to My Major)
- Simulator integration
- Firestore `users.certificates`
