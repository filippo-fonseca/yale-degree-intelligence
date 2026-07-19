# Certificate requirements schema

Mirrors `lib/data/all_reqs.json` / `lib/majors.ts` so certificates can plug into the same progress engine later.

## Per-certificate object

```json
{
  "id": "CERT_EXAMPLE",
  "name": "Example Certificate",
  "description": "Short blurb from catalog overview",
  "category": "advanced_language | interdisciplinary | skills_based",
  "sourceUrl": "https://catalog.yale.edu/...",
  "requiresApplication": false,
  "parentProgram": "Optional parent department name",
  "creditRequirements": { "total": 5 },
  "notes": [
    "No Credit/D/Fail",
    "Max 2 course overlap with major/other certificate"
  ],
  "requirements": [
    {
      "name": "Gateway / Core / Bucket name",
      "required": 1,
      "description": "Free-text rules when courses are attribute-tagged or DUS-approved",
      "options": [
        { "type": "course", "code": "CPSC 2010" },
        { "type": "course", "code": "CPSC 2000" }
      ]
    }
  ]
}
```

## Rules
- Course codes: canonical 4-digit Yale format with space, e.g. `S&DS 1000`, `CPSC 2010`, `EDST 1110`, `GLBL 3102`. Prefer codes as written in catalog with trailing 0 when present.
- When catalog lists alternatives ("one from A, B, C"), put each as `{type:"course", code}` under the same requirement with `required: 1`.
- When courses are attribute-tagged only (e.g. "YC Climate Solutions") with no fixed list, use `options: []` and put the rule in `description`.
- `creditRequirements.total` = number of course credits required for the certificate (exclude prerequisites unless the catalog counts them in the total).
- Put prerequisites as a requirement named `"Prerequisite"` with `required: 0` or `required: 1` if truly required before starting; prefer `required: 1` only when the catalog treats it as required. If "suggested", set `required: 0` and note in description.
- Include declaration / grade / overlap rules in top-level `notes[]`, not as fake course requirements.
- Advanced language certs: typically 4 courses beyond L4 (or L3 for Sanskrit); encode as buckets with empty options + clear descriptions when specific L5 lists aren't fixed.
