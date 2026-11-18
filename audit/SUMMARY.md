# Audit summary — dnd-2024-reference

Four read-only audits ran in parallel. Detail for every item is in the per-area reports:

| Report | High | Med | Low |
| --- | --- | --- | --- |
| [design.md](design.md) (impeccable rubric: 15/20) | 4 | 9 | 9 |
| [bugs.md](bugs.md) | 2 | 8 | 15 |
| [content.md](content.md) | 1 | 7 | 10 |
| [code.md](code.md) | 2 | 8 | 12 |

Baseline: `npm test` passes (validators OK, `astro check` reports 0 errors, Playwright 188 passed / 60 skipped). No broken internal links in `dist/`. The core data matches the SRD: 155/155 glossary entries, all 38 weapons, all 82 gear rows. Most findings are about behaviour, accessibility and how the data is generated, not missing data.

## Top 10, ranked

| # | Issue | Where | Sev | Areas | Size |
| --- | --- | --- | --- | --- | --- |
| 1 | **Saved favourites/recent data in an unexpected form crashes the site script on every page.** `read()` returns any parsed JSON without checking its shape, and `{}`/`null` then breaks favourites, previews, the Back button and SW registration until the user clears site data. Related: when localStorage throws, the in-memory fallback is never read, so stars never light up and the theme toggle gets stuck. | `src/scripts/store.ts:8-15`; crashes at `shell.ts:183,199,202`; theme `shell.ts:22-33` | High | Bugs | Quick win |
| 2 | **Tapping a term on a phone skips the preview** once the search index has loaded, because Android's focus event fires the preview code before the click. If the index fails to load, the tap does nothing at all. The existing test only passes because it taps before the index loads. | `src/scripts/shell.ts:274-290`; `tests/glossary.spec.ts:55` | High | Bugs | Quick win |
| 3 | **The search palette is broken for screen readers.** The result count is never announced (the live region is removed and hidden when there are results), and the "recent"/"no results" states put a `<p>` inside the listbox, which is invalid ARIA. Also, the offline message gets replaced by "No results". | `src/scripts/shell.ts:95-104` | High | Design, Bugs | Quick win |
| 4 | **Wrong rules links and wrong "See also" entries.** Auto-linking matches titles naively: "Hide" armor → Hide action, "Heavy armor" → Heavy property, "Light Hammer" → Light property, and 7 conditions link to Attack action because they contain "Attack rolls…". About 27 spurious `seeAlso` entries. | `src/lib/data.ts:198` (`linkTerms`); `scripts/build_glossary.py` `scan_body_mentions()` | Med | Bugs, Content | Bigger job |
| 5 | **Equipment intros are garbled.** Each one is a single flattened paragraph with headings and bold lead-ins run together, a stray "Armor" caption, and the Vehicles intro swallows a Lifestyle Expenses table that stops partway through. Also: saddles, feed and stabling are tagged `vehicle`. | `src/data/equipment-intro.json:2-6`; `scripts/extract_srd.py`, `build_equipment.py` (`parse_mounts`, `to_html`) | High | Content (Code: this file is generated but never displayed) | Bigger job |
| 6 | **The sticky filter toolbar on desktop hides jump and focus targets**: an A–Z heading lands under the toolbar, and Shift+Tab focus is hidden (WCAG 2.4.11). | `src/styles/global.css:95, 285-287` | High | Design | Quick win |
| 7 | **The table filter/sort script is copied into two pages and the copies have drifted.** A live symptom: the equipment **Cost** header goes descending → off and can never sort ascending. | `src/pages/weapons/index.astro:188-287`, `src/pages/equipment/index.astro:229-330` (bug at `:305-312`) | High | **Code, Bugs, Design (all three)** | Quick win for the sort fix; bigger job to pull the script into a shared module |
| 8 | **Filter chips scroll sideways with the scrollbar hidden.** About 38% of glossary categories are off-screen at 1440 px (about 60% at 1024 px), and a mouse user can't reach them. | `src/styles/global.css:484-494` | High | Design | Quick win (let the chips wrap on desktop) |
| 9 | **Data generation has gaps and errors.** Nothing generates `weapons/properties/masteries/weapons-intro.json` (contrary to the README), and `build_glossary.py` relies on the legacy site's HTML. Summaries are cut mid-word (18 entries, e.g. `chain` "(At…"), the de-hyphenation step breaks "10-foot square" into "10-footsquare", and the Oil summary runs two paragraphs together. The validator catches none of this, and `validate_weapons.mjs` is weaker than the other two. | `scripts/extract_srd.py:56,71-73`; `build_*.py` `first_sentence()`/`summarise()`; `scripts/validate_weapons.mjs:33-49` | High | Code, Content | Bigger job (summary, hyphen and validator fixes are quick wins on their own) |
| 10 | **Dependency and CI hygiene.** `npm audit` reports 6 high and 3 moderate vulnerabilities (astro, vite), all fixable within the current version ranges. CI runs only on push to `main` (no PR checks, no saved report when a run fails), and Python dependencies are undeclared (no `requirements.txt`). | `package.json`; `.github/workflows/deploy.yml:3-6` | Med | Code | Quick win |

## Overlaps (found by more than one auditor)

- **Equipment Cost sort can't go ascending.** Found separately by Code, Bugs and Design, and confirmed in code: the click cycle is `desc → off`.
- **Wrong auto-links.** Bugs (equipment terms) and Content (`seeAlso` and inline links on conditions) traced them to the same naive title matching.
- **Search palette states.** Design (ARIA/live region) and Bugs (the offline message is overwritten) point at the same block, `shell.ts:95-104`.
- **The weapons data files have no generator.** Found by both Code and Content.
- **Equipment intros.** Content found them garbled, and Code found the file is never displayed. Decide which first: fix the generator and show the intros, or drop the file.

## Just outside the top 10

- The table header doesn't stick because the table has `overflow:hidden` (`global.css:826-832`).
- On phones, the equipment type switch is cut off mid-word ("Vehicle"), and weapon/equipment cards only respond to an 18 px name link.
- The mobile bottom nav marks "Weapons" as current on equipment pages.
- Removing a favourite loses keyboard focus.
- The SW fetches the search index with no timeout, and precaches 9.5 MiB on first visit.
- No tests for the validators, Python generators, the term-linking code or the SW.
- Missing SRD sections (Coins, Selling Equipment, Hirelings, Crafting) are mentioned in the intros.

## Suggested batches

- **Batch A, quick wins (about one session):** #1, #2, #3, #6, #7 (sort fix), #8, #10
- **Batch B, data pipeline:** #5, #9, plus the `seeAlso` half of #4
- **Batch C, refactor:** shared table module (#7), `linkTerms` rework (#4), tests for the scripts

## Status (2026-11-18, after the "Stat Block" redesign)

| # | Status | What changed |
| --- | --- | --- |
| 1 | Fixed | `store.ts` shape-checks saved ids, reads the in-memory fallback when storage throws (theme toggle included); each shell feature initialises in isolation. |
| 2 | Fixed | Focus caused by a touch no longer opens a preview; a second tap on the same term navigates; when no preview is possible the tap follows the link. |
| 3 | Fixed | One persistent `role=status` region outside the listbox; offline message kept. |
| 4 | Fixed (inline links) | Case-aware matching, weapon/equipment names as longest-match terms, armor-category blockers, equipment domain. The `seeAlso` half stays with #9. |
| 5 | Fixed | `build_equipment.py` keeps intro headings and lead-ins, stops Vehicles at Lifestyle Expenses, files tack under mounts; intros shown on the equipment page per type. |
| 6 | Fixed | Filter toolbar no longer sticky; table headers and letter headings stick instead, with matching scroll padding. |
| 7 | Fixed | `src/scripts/table.ts` shared by weapons and equipment; every sort order reachable from the header. |
| 8 | Fixed | Chips wrap on desktop; scroll with a visible scrollbar and edge fade on phones. |
| 9 | Deferred | Data pipeline (weapons generators, summaries, de-hyphenation, validator). |
| 10 | Fixed | `npm audit` 0 vulnerabilities; CI runs on PRs and uploads the report on failure; `requirements.txt`, `.nvmrc`, `engines`. |

Regression tests: `tests/audit-fixes.spec.ts`.
