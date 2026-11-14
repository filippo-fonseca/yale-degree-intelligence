<!-- Generated from tools/list by lib/mcp/toolDocs.test.ts. Do not edit by hand. -->

# DegreeIntelligence MCP tool reference

28 tools: 12 read (scope `degree:read`) and 16 write (scope `degree:write`). A read-only connection does not see the write tools at all.

Every tool returns one text content block holding JSON. Failures come back as a tool result with `isError: true` and a message meant to be shown to the student.

## Server instructions

Sent in the `initialize` result to every client with write access:

```text
DegreeIntelligence (degreeint.com) is a Yale College degree planner. These tools act on the signed-in student's own account only.

Start with get_profile: majors, certificates, graduation year and saved plans frame everything else. Program ids come from list_programs; course codes from search_courses (codes are normalized, so "cpsc 323" works).

Look things up when you need them rather than loading everything: get_program_requirements takes one program (any major or certificate, not only the student's) and optionally one requirement, and search_courses returns a compact page with next_offset. To fill a plan semester, call search_courses with fills (the requirement you're targeting), offered_season (the semester's season) and untaken_only, add a pick with add_planned_course, and check the result with get_plan_progress.

Two places hold courses. The transcript (My Courses: list_courses, add_courses) is what the student has taken or is taking. Plans (Simulator: get_plan, add_planned_course) hold future terms. Progress is reported both ways: get_degree_progress for the transcript, get_plan_progress for a plan's projection. Terms are written "Fall 2027"; plans have Fall and Spring only.

The numbers come from the app's own rules engine, including Yale's certificate overlap policies. Report them as the app's reading of the requirements, not as an official audit: the student's DUS and Yale's degree audit have the final word.

Every write tool takes dry_run. Use it to show the student what will change before you commit anything consequential, and always confirm before delete_courses, delete_plan or changing declared programs. Writes are idempotent: repeating one reports no change. Every change you make is listed for the student under Settings > Connected apps.
```

## Read tools

### `get_profile`

*Get the student's profile* · read · idempotent

The student's declared majors and certificates, graduation year, bio, distributional preferences, prerequisite overrides and saved plans. Call this first: most other tools are relative to these programs.

No arguments.

### `list_courses`

*List transcript courses* · read · idempotent

Every course on the student's record (My Courses): completed, in progress and placed out, oldest first, with ids for the write tools. Planned Simulator courses are not here; use get_plan for those.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `status` | `"completed"` \| `"in_progress"` \| `"placed_out"` \| `"all"` | no | Filter by status. Default all. |
| `term` | string | no | Only this term, e.g. "Fall 2025". |

### `get_academic_summary`

*Get GPA and credit summary* · read · idempotent

GPA (Yale letter grades, credit-weighted), completed and in-progress credits, and a per-term breakdown of the transcript.

No arguments.

### `get_degree_progress`

*Get progress toward majors and certificates* · read · idempotent

Requirement-by-requirement progress for each declared major and certificate, from the transcript only (what the dashboard shows). Uses the same engine as the app, including the certificate overlap policy and manual assignments. For a plan's projected progress, use get_plan_progress.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `program_id` | string | no | Only this major or certificate id. Default: all declared. |
| `summary_only` | boolean | no | Drop the per-requirement detail. |

### `get_distributional_progress`

*Get Yale distributional progress* · read · idempotent

Credits toward Yale College's distributional requirements (Hu, So, Sc, QR, WR, language) from the transcript, each course counted once using the student's allocation preferences.

No arguments.

### `search_courses`

*Search the Yale course catalog* · read · idempotent

Finds courses in the catalog the app uses (Fall 2023 to Spring 2027), a page at a time, so you never need the whole catalog. Combine filters: words or a code, subject, distributional, level, term or season offered, and `fills` to get only courses that count toward a requirement of ANY major or certificate (not just the student's). For building or editing a Simulator plan, set untaken_only to skip what the student has taken or already planned, and offered_season to match the semester you're filling. Results are compact by default; page with offset.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `query` | string | no | Code or words from the title, e.g. "CPSC 323" or "machine learning". |
| `subject` | string | no | Subject code, e.g. "CPSC". |
| `distributional` | `"Hu"` \| `"So"` \| `"Sc"` \| `"QR"` \| `"WR"` \| `"L1"` \| `"L2"` \| `"L3"` \| `"L4"` \| `"L5"` | no |  |
| `min_level` | integer | no | Lowest course number, e.g. 3000. |
| `max_level` | integer | no | Highest course number, e.g. 4999. |
| `offered_in` | string | no | A catalog term, e.g. "Spring 2027". |
| `offered_season` | `"fall"` \| `"spring"` | no | Usually offered in this season. Use it for plan terms past the catalog. |
| `fills` | { program_type, program_id, requirement } | no | Only courses that count toward this program's requirements, as the app encodes them. |
| `untaken_only` | boolean | no | Skip courses on the transcript (taken, in progress or placed out) and courses already in the plan. |
| `plan_name` | string | no | The plan untaken_only checks. Default: the default plan. |
| `detail` | `"compact"` \| `"full"` | no | full adds cross-listings and every catalog term. Default compact. |
| `offset` | integer | no | Skip this many matches. Use next_offset from the last page. (min 0) |
| `limit` | integer | no | Default 15. (min 1, max 50) |

### `get_course_details`

*Get one course's details* · read · idempotent

Catalog details for one course (cross-listings, credits, distributionals, terms offered, meeting times), plus where it sits for this student: on the transcript, on the default plan, and which of their requirements it could fill.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `code` | string | yes | e.g. "CPSC 323". |
| `meetings_term` | string | no | Meeting times for this term, e.g. "Spring 2027". Default: the next term it is offered. |

### `list_programs`

*List Yale majors and certificates* · read · idempotent

Ids and names of the majors and certificates the app models (names only, no requirements). Pass `query` to narrow it, e.g. "computer". Then use get_program_requirements for one program.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | `"major"` \| `"certificate"` | no | Default both. |
| `query` | string | no | Filter by words in the name. |

### `get_program_requirements`

*Get a program's requirements* · read · idempotent

The requirements of any major or certificate (declared or not) as the app encodes it: each requirement's name, how many it needs and the courses or groups that satisfy it. Fetch one program at a time, or one requirement with `requirement`. To find courses that fill a requirement, prefer search_courses with `fills`. Requirement names are what set_requirement_assignment takes.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `program_type` | `"major"` \| `"certificate"` | yes |  |
| `program_id` | string | yes | Any id from list_programs, declared or not. |
| `requirement` | string | no | Only this requirement. Default: all of them. |

### `list_plans`

*List saved Simulator plans* · read · idempotent

The student's saved four-year plans from the Simulator, with which one is the default.

No arguments.

### `get_plan`

*Get a plan's semesters* · read · idempotent

One plan laid out by semester, as the Simulator canvas shows it: taken courses come from the live transcript and planned ones from the plan. Past terms are locked. Default: the default plan.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `plan_name` | string | no |  |

### `get_plan_progress`

*Get a plan's projected progress* · read · idempotent

Projected progress if the student follows this plan: every major and certificate requirement plus distributionals, counting planned courses. Same numbers as the Simulator's progress pane. Default: the default plan.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `plan_name` | string | no |  |
| `summary_only` | boolean | no | Drop the per-requirement detail. |

## Write tools

All write tools take `dry_run` (returns `{ dry_run: true, would_change, summary }` and changes nothing) and are idempotent: repeating a call reports `changed: false`. Real changes return `changed: true` with a `summary` and are recorded in the student's audit log.

### `update_profile`

*Update majors, certificates, graduation year or bio* · write · idempotent

Changes the student's declared programs (up to 2 majors, 3 certificates; ids from list_programs), graduation year or bio. Lists replace the current ones, so pass the full list. Changing programs changes every progress number; confirm with the student.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `majors` | string[] | no |  (at least 1, at most 2) |
| `certificates` | string[] | no |  (at most 3) |
| `graduation_year` | integer | no |  |
| `bio` | string | no |  (≤ 200 chars) |
| `dry_run` | boolean | no | Preview only: validate and report exactly what would change, without saving. Use it to show the student before you commit. |

### `set_distributional_preferences`

*Set how distributional credits are allocated* · write · idempotent

A course tagged with two distributionals (say Hu and WR) counts toward only one. auto_allocate lets the app choose; manual_allocations pins course codes to a requirement (Hu, So, Sc, QR, WR), with null removing a pin. english_satisfies_language makes ENGL 120 count toward the language requirement for students schooled mainly in another language.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `auto_allocate` | boolean | no |  |
| `manual_allocations` | object | no | e.g. {"ENGL 1200": "WR", "HIST 1010": null}. Merged into the existing pins. |
| `english_satisfies_language` | boolean | no |  |
| `dry_run` | boolean | no | Preview only: validate and report exactly what would change, without saving. Use it to show the student before you commit. |

### `set_prereq_override`

*Mark a prerequisite as handled* · write · idempotent

Silences the app's missing-prerequisite warning for a course (the student has permission or equivalent background). overridden=false brings the warning back.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `code` | string | yes |  |
| `overridden` | boolean | no |  (default `true`) |
| `dry_run` | boolean | no | Preview only: validate and report exactly what would change, without saving. Use it to show the student before you commit. |

### `add_courses`

*Add courses to the transcript* · write · idempotent

Adds taken or in-progress courses to My Courses, as the app's manual entry does. A course already on record for the same term with the same grade is left alone; with a different grade it is replaced. Future terms belong on a plan instead (add_planned_course).

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `courses` | { code, term, grade, credits, name }[] | yes |  (at least 1, at most 20) |
| `dry_run` | boolean | no | Preview only: validate and report exactly what would change, without saving. Use it to show the student before you commit. |

### `update_course`

*Edit a transcript course* · write · idempotent

Changes a course's grade, term, credits or (for non-catalog codes) name. Setting the grade to null marks it in progress; a letter grade marks it completed.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `course_id` | string | no | The id from list_courses. Preferred. |
| `code` | string | no | Course code, when it appears on the transcript only once. |
| `grade` | `"A"` \| `"A-"` \| `"B+"` \| `"B"` \| `"B-"` \| `"C+"` \| `"C"` \| `"C-"` \| `"D+"` \| `"D"` \| `"D-"` \| `"F"` \| `"CR"` \| `"ABX"` \| null | no | Letter grade, "CR" for Credit, or null for a course in progress. |
| `term` | string | no |  |
| `credits` | number | no | Defaults to the catalog's credits, else 1. (min 0, max 4) |
| `name` | string | no | A display name; "" restores the catalog name. (≤ 120 chars) |
| `dry_run` | boolean | no | Preview only: validate and report exactly what would change, without saving. Use it to show the student before you commit. |

### `delete_courses`

*Remove courses from the transcript* · write, destructive · idempotent

Deletes courses from My Courses, including any manual requirement assignments on them. This cannot be undone from here; confirm with the student first and consider dry_run.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `course_ids` | string[] | yes | Ids from list_courses. (at least 1, at most 50) |
| `dry_run` | boolean | no | Preview only: validate and report exactly what would change, without saving. Use it to show the student before you commit. |

### `mark_course_placed_out`

*Mark a course placed out (or undo)* · write · idempotent

Records that the student placed out of a course (AP, placement exam, acceleration credit), as the requirement cards' Skip does, so it fills requirements without a term or grade. placed_out=false removes that record.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `code` | string | yes |  |
| `placed_out` | boolean | no |  (default `true`) |
| `dry_run` | boolean | no | Preview only: validate and report exactly what would change, without saving. Use it to show the student before you commit. |

### `set_course_distributionals`

*Set a course's distributional tags* · write · idempotent

Overrides which Yale distributionals (Hu, So, Sc, QR, WR, L1-L5) a transcript course carries, e.g. when a section was designated differently from the catalog. null restores the catalog's tags.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `course_id` | string | no | The id from list_courses. Preferred. |
| `code` | string | no | Course code, when it appears on the transcript only once. |
| `distributionals` | `"Hu"` \| `"So"` \| `"Sc"` \| `"QR"` \| `"WR"` \| `"L1"` \| `"L2"` \| `"L3"` \| `"L4"` \| `"L5"`[] \| null | yes |  |
| `dry_run` | boolean | no | Preview only: validate and report exactly what would change, without saving. Use it to show the student before you commit. |

### `set_requirement_assignment`

*Count or stop counting a course toward a requirement* · write · idempotent

Manual requirement overrides on a transcript course, the same as the app's requirement cards. assign: count it toward a requirement it doesn't auto-match (only when the DUS or program has approved it). unassign: undo an assign. exclude: stop it counting toward a requirement it auto-matches. include: undo an exclude. Requirement names come from get_program_requirements.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `course_id` | string | no | The id from list_courses. Preferred. |
| `code` | string | no | Course code, when it appears on the transcript only once. |
| `action` | `"assign"` \| `"unassign"` \| `"exclude"` \| `"include"` | yes |  |
| `program_type` | `"major"` \| `"certificate"` | yes |  |
| `program_id` | string | yes |  |
| `requirement` | string | yes | Requirement name, as get_program_requirements lists it. |
| `dry_run` | boolean | no | Preview only: validate and report exactly what would change, without saving. Use it to show the student before you commit. |

### `create_plan`

*Create a Simulator plan* · write

Saves a new four-year plan. With copy_from it duplicates an existing plan (its planned courses and manual assignments); otherwise it starts with just the transcript and empty future terms. The first plan becomes the default.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | yes |  (≤ 60 chars) |
| `copy_from` | string | no | Name of a plan to duplicate. |
| `make_default` | boolean | no |  |
| `dry_run` | boolean | no | Preview only: validate and report exactly what would change, without saving. Use it to show the student before you commit. |

### `update_plan`

*Rename a plan or make it the default* · write · idempotent

Renames a plan, makes it the default (the plan the rest of the app treats as the student's), or toggles its distributional and grade display in the Simulator.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `plan_name` | string | yes |  |
| `new_name` | string | no |  (≤ 60 chars) |
| `make_default` | boolean | no |  |
| `show_distributionals` | boolean | no |  |
| `show_grades` | boolean | no |  |
| `dry_run` | boolean | no | Preview only: validate and report exactly what would change, without saving. Use it to show the student before you commit. |

### `delete_plan`

*Delete a plan* · write, destructive · idempotent

Deletes a saved plan and everything on it. Cannot be undone; confirm with the student first. If it was the default, the newest remaining plan becomes the default.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `plan_name` | string | yes |  |
| `dry_run` | boolean | no | Preview only: validate and report exactly what would change, without saving. Use it to show the student before you commit. |

### `add_planned_course`

*Plan a course in a future term* · write · idempotent

Puts a course on a plan in a Fall or Spring term, running the same certificate-policy check the Simulator runs when a course is dropped on the canvas: if every program it would count toward refuses it, it is not added and the reasons come back. The current term is allowed and reads as in progress.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `plan_name` | string | no | Plan name from list_plans. Default: the default plan. |
| `code` | string | yes |  |
| `term` | string | yes | e.g. "Spring 2027". |
| `dry_run` | boolean | no | Preview only: validate and report exactly what would change, without saving. Use it to show the student before you commit. |

### `remove_planned_course`

*Take a planned course off a plan* · write · idempotent

Removes a planned course from a plan, with any manual requirement assignment the plan had for it.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `plan_name` | string | no | Plan name from list_plans. Default: the default plan. |
| `code` | string | yes |  |
| `dry_run` | boolean | no | Preview only: validate and report exactly what would change, without saving. Use it to show the student before you commit. |

### `move_planned_course`

*Move a planned course to another term* · write · idempotent

Moves a planned course to a different Fall or Spring term on the same plan.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `plan_name` | string | no | Plan name from list_plans. Default: the default plan. |
| `code` | string | yes |  |
| `to_term` | string | yes |  |
| `dry_run` | boolean | no | Preview only: validate and report exactly what would change, without saving. Use it to show the student before you commit. |

### `set_plan_requirement_assignment`

*Count a planned course toward a requirement* · write · idempotent

Plan-only manual assignment, like the Simulator's assign dialog: counts a course on this plan toward a requirement it doesn't auto-match. It affects only this plan's projection, not the transcript. action unassign removes it.

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `plan_name` | string | no | Plan name from list_plans. Default: the default plan. |
| `code` | string | yes |  |
| `action` | `"assign"` \| `"unassign"` | yes |  |
| `program_type` | `"major"` \| `"certificate"` | yes |  |
| `program_id` | string | yes |  |
| `requirement` | string | yes |  |
| `dry_run` | boolean | no | Preview only: validate and report exactly what would change, without saving. Use it to show the student before you commit. |
