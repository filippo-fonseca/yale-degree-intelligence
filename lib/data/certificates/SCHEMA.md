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
  "policy": {
    "overlapCap": 2,
    "minGrade": "C",
    "sourceNote": "No more than two course credits may overlap with a major, a simultaneous degree, or another certificate."
  },
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

## The `policy` block

`notes[]` is prose for humans. `policy` is the machine-readable version of the
same catalog rules, and it is what the certificate policy engine reads. Both
stay in the file: `notes[]` keeps the full catalog wording, `policy` keeps only
what the engine can act on.

```jsonc
"policy": {
  "overlapCap": 2,             // max cert courses shareable with other programs
  "zeroOverlap": false,        // true → no cert course may count for another program
  "overlapMinLevel": null,     // e.g. 3000 → only courses at 3000+ may overlap
  "sameDeptCap": null,         // e.g. 3 → max 3 cert courses from one subject prefix
  "minGrade": null,            // e.g. "B-" → advisory warning, never a blocker
  "ineligibleMajors": [],      // major IDs Yale bars from this cert (warn but allow)
  "extraForms": [],            // e.g. "Enrollment form on the certificate website"
  "nonCourseRequirements": [], // e.g. "Two public talks with written reflections"
  "sourceNote": ""             // one line citing the catalog rule this encodes
}
```

### Resolved defaults

Every field is optional, and the whole block is optional. A missing field falls
back to the resolved default below (`DEFAULT_CERTIFICATE_POLICY` /
`ResolvedPolicy` in `lib/certificates.ts`), so a certificate whose catalog page
states no special rule carries **no `policy` block at all**.

| Field | Default | Meaning when defaulted |
|---|---|---|
| `overlapCap` | `2` | Up to 2 cert courses may also count toward the student's other programs |
| `zeroOverlap` | `false` | Normal overlap applies |
| `overlapMinLevel` | `null` | Any level may overlap |
| `sameDeptCap` | `null` | No within-certificate department cap |
| `minGrade` | `null` | No advisory grade floor |
| `ineligibleMajors` | `[]` | Open to every major |
| `extraForms` | `[]` | No form beyond declaring on Yale Hub |
| `nonCourseRequirements` | `[]` | Coursework only |
| `sourceNote` | `""` | No citation recorded |

Two university-wide rules always apply on top and are deliberately **not**
expressible in `policy`, because they hold for every program:

1. A single course credit may never count toward more than two curricular
   programs (major, second major, certificate, simultaneous degree).
2. Within one certificate, a course fills exactly one requirement slot.

### Authoring rules
- A certificate policy may only be **stricter** than the default, never looser.
- Write only the fields that differ from the defaults, plus `sourceNote`. Do not
  restate defaults; an absent field is unambiguous.
- Write `overlapCap: 2` explicitly when the catalog page states the two-credit
  overlap rule in its own words. It matches the default, but recording it marks
  the rule as sourced rather than assumed.
- When `zeroOverlap` is `true`, also write `overlapCap: 0`. The two agree, and
  the cap is what surfaces in the overlap budget UI.
- `minGrade` and `ineligibleMajors` are advisory. They produce warnings, never
  blocks, so encoding them is always safe.
- `sourceNote` quotes the catalog sentence closely enough to audit against
  `lib/data/certificates/raw/{ID}.json`. Every policy field must trace to text
  in that raw file. If the catalog does not say it, do not encode it.
- Rules about the *shape* of the requirements (for example "at least four of
  the six courses must be at the 3000 level or above") are not policy. They
  belong in `requirements[]` if modeled, and in `notes[]` either way.

## Rules
- Course codes: canonical 4-digit Yale format with space, e.g. `S&DS 1000`, `CPSC 2010`, `EDST 1110`, `GLBL 3102`. Prefer codes as written in catalog with trailing 0 when present.
- When catalog lists alternatives ("one from A, B, C"), put each as `{type:"course", code}` under the same requirement with `required: 1`.
- When courses are attribute-tagged only (e.g. "YC Climate Solutions") with no fixed list, use `options: []` and put the rule in `description`.
- `creditRequirements.total` = number of course credits required for the certificate (exclude prerequisites unless the catalog counts them in the total).
- Put prerequisites as a requirement named `"Prerequisite"` with `required: 0` or `required: 1` if truly required before starting; prefer `required: 1` only when the catalog treats it as required. If "suggested", set `required: 0` and note in description.
- Include declaration / grade / overlap rules in top-level `notes[]`, not as fake course requirements.
- Advanced language certs: typically 4 courses beyond L4 (or L3 for Sanskrit); encode as buckets with empty options + clear descriptions when specific L5 lists aren't fixed.
