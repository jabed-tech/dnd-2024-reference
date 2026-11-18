# Code health audit: dnd-2024-reference

Date: 2026-11-18. Commit `e55d83a` (main, clean tree).

## Evidence gathered

| Command | Result |
| --- | --- |
| `npm test` (runs `pretest` → `npm run build` → validate + `astro check` + `astro build` + `generate-sw`) | All 3 validators OK (157 rules, 38 weapons / 10 properties / 8 masteries, 145 equipment). `astro check`: 45 files, 0 errors / 0 warnings / 0 hints. Build: 366 HTML pages. `sw.js: precached 393 files`. Playwright: **188 passed, 60 skipped, 0 failed** (41.9 s). |
| `npm outdated` | astro 7.3.2 → 7.4.13, @playwright/test 1.63.0 → 1.65.1, @astrojs/check 0.9.10 → 0.9.12, @axe-core/playwright 4.13 → 4.14, @types/node 24.13.5 → 24.19.2 (26.x latest), typescript 6.0.3 (7.0.2 latest). |
| `npm audit` | **9 vulnerabilities (3 moderate, 6 high)**: astro ≤7.4.6, devalue, fast-uri, sharp, smol-toml, source-map-js, undici, vite 8.3.0–8.3.2, zod. All marked "fix available via `npm audit fix`". |
| dist size | 9.48 MiB precached by the service worker (8.93 MiB of it is the 366 HTML files). |
| Local env | Node v24.19.0, npm 11.17.0, `.venv` Python 3.13.14 with pymupdf 1.28.2. |

Largest source files (lines): `src/styles/global.css` 1073, `scripts/build_glossary.py` 659, `scripts/build_equipment.py` 624, `src/scripts/shell.ts` 335, `src/pages/equipment/index.astro` 330, `src/pages/weapons/index.astro` 287, `src/lib/data.ts` 228.

---

## High

### H1. Weapons/equipment table filter and sort script is copy-pasted, and the copies have already diverged into a bug
- **Where:** `src/pages/weapons/index.astro:188-287` and `src/pages/equipment/index.astro:229-330` (also the matching `<style>` blocks at `weapons/index.astro:177-186` / `equipment/index.astro:200-227`, and the toolbar/sort-select/empty-state markup at `weapons/index.astro:40-78,152-156` / `equipment/index.astro:42-90,159-163`).
- **What's wrong:** About 90 lines of client script (`applyFilters`, `applySort`, URL sync via `history.replaceState`, header-click sort cycling, card-sort `<select>` sync, reset) are duplicated with small edits. The header-click cycle has already drifted. Weapons (`weapons/index.astro:262-269`) handles columns whose first click sorts descending. Equipment (`equipment/index.astro:305-312`) does not: Cost starts at `desc` (line 307), and the next click hits `else if (sortDir === 'asc')`, which is false, so it falls through to `sortKey = ''`. **Cost ascending can't be reached from the table header on the equipment page.** The only way to get it is the mobile "Sort by" select. The null-handling comparator (`equipment/index.astro:276-281`) is also equipment-only. When both values are empty, `num('') - num('')` is `NaN`, which skips the name tie-break.
- **Why it matters:** Every fix has to be made twice, and this bug shows the copies already disagree. The glossary index (`glossary/index.astro:96-131`) repeats the filter and URL-sync half a third time.
- **Fix:** Extract `src/scripts/table-controls.ts` exporting `initFilterTable({ root, rows, setKeys, descFirst: Set<string>, numericKeys, nullsLast })`. Use the weapons cycle logic, generalised over `descFirst`. Move the shared `.w-fav`/`a.card` CSS into `global.css`. Optionally add a `<FilterTable>` component for the toolbar, count and empty state. Add a Playwright test that clicks the Cost header twice on `/equipment/` and asserts `aria-sort="ascending"`.
- **Severity:** high

### H2. `weapons.json`, `properties.json`, `masteries.json` and `weapons-intro.json` have no generator, though the README says the PDF is the source of truth
- **Where:** `README.md` ("The data in `src/data/*.json` is generated from the SRD PDF, which is the source of truth" and the "Regenerating the data" block); `scripts/extract_srd.py:71` writes `weapons.txt`, with the comment at `:72-73` saying weapon pages "are parsed separately from weapons.txt"; no `scripts/build_weapons.py` exists (`git ls-files scripts` lists only build_glossary, build_combat_rules, build_equipment, extract_srd).
- **What's wrong:** `source/extracted/weapons.txt` (13 KB) is produced and then never read by any script. The four weapon-domain JSON files are effectively hand-maintained, or were produced by a script that was never committed.
- **Why it matters:** If the SRD is re-issued, or someone fixes an extraction bug, the weapon data can't be regenerated. It can also silently drift from the PDF while the other datasets are rebuilt. The README misleads contributors.
- **Fix:** Commit a `scripts/build_weapons.py` that reads `weapons.txt` and emits the four files, and make it reproduce the current JSON byte-for-byte. Failing that, change the README to say these files are hand-curated and note what `weapons.txt` is for. Otherwise stop extracting it.
- **Severity:** high

---

## Medium

### M1. Data types are asserted with `as` casts; the TS interfaces and three validators each restate the schema
- **Where:** `src/lib/data.ts:74-87` (`as (...)[]`, `as Weapon[]`, `as Rule[]`, `as EquipmentItem[]`, `as Record<...>`); `src/pages/equipment/[slug].astro:20`, `src/pages/weapons/[slug].astro:24`, `src/pages/masteries/[slug].astro:10`, `src/pages/properties/[slug].astro:10` (`Astro.props as { ... }`); `scripts/validate_glossary.mjs:16-27,34`, `scripts/validate_equipment.mjs:13,21,23`, `scripts/validate_weapons.mjs:29-31`.
- **What's wrong:** The JSON is cast to the interfaces, so TypeScript never checks that the data matches. Allowed categories are listed in both `validate_glossary.mjs:16-27` and `data.ts:114-125`. Equipment kinds and intro keys are listed in `validate_equipment.mjs:13,21` and again in `data.ts:51,84-86,95-100`. The four `Astro.props as {...}` casts drop the inference that `glossary/[slug].astro:15-21` gets from a `Props` interface.
- **Why it matters:** If a field is added or renamed in a generator, nothing fails until a page renders `undefined`. The lists in the validators and the TS consts can drift apart without anything noticing.
- **Fix:** Define the schemas once, for example as zod schemas in `src/lib/schema.ts` (zod is already in the tree via astro) or as Astro content collections with `file()` loaders. Parse with them in `data.ts`, and let the validators import the same module, or replace the hand-written checks entirely. Replace the prop casts with `type Props = InferGetStaticPropsType<typeof getStaticPaths>`.
- **Severity:** med

### M2. `validate_weapons.mjs` is weaker than its siblings and skips the HTML check for SRD-mentioning bodies
- **Where:** `scripts/validate_weapons.mjs:33-49` (`checkBody`), `:11-18` (no parse guard), `:51-82` (properties/masteries).
- **What's wrong:**
  - Line 38-40: if a body contains "System Reference Document", it `return`s as an "allowed exemption" and skips the tag check. The other two validators treat that string as an *error* (`validate_glossary.mjs:93`, `validate_equipment.mjs:32`).
  - It does not reject attributes on tags. The others do (`validate_glossary.mjs:104-107`).
  - It does not check `name`, `summary` or `body` presence on properties and masteries, even though `Rule` requires them (`data.ts:44-49`).
  - It does not validate `weapons-intro.json` at all, which is rendered with `set:html` (`RuleIndex.astro:19`).
  - A malformed JSON file throws a stack trace instead of a FAIL line.
- **Why it matters:** Unvalidated HTML goes into `set:html` on the masteries and properties pages, and a missing field on a mastery would only show up at render time.
- **Fix:** Share one `checkHtml`/`requireKeys`/`loadJson` helper module across the three validators (`scripts/lib/validate.mjs`), remove the exemption, and add checks for the intro file and the required keys of `Rule`.
- **Severity:** med

### M3. Validators, Python generators, `linkTerms`, `search()` and the service worker have no direct tests
- **Where:** `tests/` holds only Playwright E2E specs (`git ls-files tests`). The untested code:
  - `scripts/validate_*.mjs`: no negative fixtures.
  - `scripts/build_*.py` and `extract_srd.py`: no tests, and every script runs at module import with no `main()`/`if __name__` guard (`grep "^def main\|__name__" scripts/*.py` finds nothing), so they can't be imported for tests.
  - `src/lib/data.ts:187-228` (`linkTerms`, skip-tag stack, plural handling).
  - `src/scripts/search.ts:52-112` (stemming and scoring), which is covered only through E2E ranking cases.
  - `scripts/generate-sw.mjs`: `grep serviceWorker|sw.js|offline tests` finds no matches, so offline behaviour and cache busting are never exercised.
  - URL pre-application of `?kind=` / `?group=` / `?mastery=` on the weapons and equipment pages.
  - The back-button logic in `shell.ts:301-316`.
- **Why it matters:** The data pipeline is where silent regressions are most likely, because PDF parsing is heuristic. The validators that guard the build have never been shown to fail on bad input. The SW is the PWA's core promise ("works offline after the first visit").
- **Fix:**
  - Add `node --test` unit tests: `tests/unit/validators.test.mjs` with a bad-fixture-per-rule, plus `linkTerms` and `search` cases. `search.ts` imports only a type, so it can be tested directly.
  - Wrap each Python script in `main()` and add a pytest golden test that rebuilds into a temp dir and diffs it against `src/data/*.json`.
  - Add a Playwright test that loads a page, waits for `navigator.serviceWorker.ready`, sets `context.setOffline(true)` and navigates to an uncached-by-visit page.
- **Severity:** med

### M4. CI runs only on push to `main`; PRs get no build/test gate
- **Where:** `.github/workflows/deploy.yml:3-6`
- **What's wrong:** The only trigger is `push: branches: [main]` plus `workflow_dispatch`. No `pull_request` job exists. A failing test is caught only after merge, when it blocks the deploy. When Playwright fails, nothing uploads `playwright-report/` or `test-results/` as an artifact, so CI failures can't be inspected.
- **Why it matters:** Regressions land on `main` before anyone sees them, and CI failures (which `retries: 1` makes rarer but harder to diagnose) leave no trace.
- **Fix:** Split into `ci.yml` (`on: [push, pull_request]`, runs `npm ci && npx playwright install --with-deps chromium && npm test`, and `actions/upload-artifact` of `playwright-report` with `if: failure()`) and keep `deploy.yml` for main only, either `needs`-gated or via `workflow_run`.
- **Severity:** med

### M5. Known-vulnerable and outdated dependencies
- **Where:** `package.json:17-27`, `package-lock.json`.
- **What's wrong:** `npm audit` reports 6 high and 3 moderate issues (astro ≤7.4.6, vite 8.3.0–8.3.2, devalue, undici, sharp, source-map-js, zod, fast-uri, smol-toml). All are fixable within the declared semver ranges: `npm outdated` shows "Wanted" equals "Latest" for astro 7.4.13.
- **Why it matters:** The deployed site is static, so most of these are build- or dev-time exposure (the Vite dev server, launch-editor on Windows). Still, the lockfile pins vulnerable versions, and the dev server is used locally on Windows, which several of the vite/launch-editor advisories target.
- **Fix:** Run `npm update && npm audit fix`, re-run `npm test`, and commit the lockfile. Add Dependabot (`.github/dependabot.yml`, npm + github-actions, weekly).
- **Severity:** med

### M6. Python toolchain is undeclared and the regeneration instructions only work on Windows
- **Where:** No `requirements.txt` or `pyproject.toml` (verified with `ls`). The `README.md` "Regenerating the data" block uses `.venv/Scripts/python`. Every script calls `pymupdf` (`scripts/extract_srd.py:9`) and uses `X | None` syntax, which needs Python ≥3.10. `scripts/extract_srd.py:69-75` hard-codes PDF page ranges (176, 89-92, 89-101, 15-16).
- **What's wrong:** The working env (Python 3.13.14, pymupdf 1.28.2, found by inspecting `.venv`) isn't recorded anywhere. Text extraction depends on PyMuPDF's reading order, which `extract_srd.py:24-26` explicitly relies on, so a different pymupdf version may produce different text.
- **Why it matters:** The data can't be regenerated reproducibly on another machine, on macOS/Linux, or in CI.
- **Fix:** Add `requirements.txt` with `pymupdf==1.28.2`, plus a `python_requires`/README note for Python 3.13. Document both `.venv/bin/python` and `.venv/Scripts/python`, or add an `npm run data` script that calls `python -m`. Optionally assert the PDF's SHA-256 in `extract_srd.py` so the hard-coded page numbers fail loudly on a different SRD revision.
- **Severity:** med

### M7. Generated data that is never rendered: `equipment-intro.json` and `weaponsIntro.weapons`
- **Where:** `src/lib/data.ts:8,84-87` (`equipmentIntro` is exported but imported nowhere; `grep -w equipmentIntro src` finds only data.ts). `src/data/equipment-intro.json` (7.4 KB) is produced by `scripts/build_equipment.py:30` and validated by `scripts/validate_equipment.mjs:11,125-131`. `data.ts:82` `weaponsIntro.weapons` is never read (only `.properties` and `.masteries` are, in `properties/index.astro:13` and `masteries/index.astro:13`). The `intro` field of `EQUIPMENT_KINDS` (`data.ts:96-100,105`) exists only to point at this unused data.
- **What's wrong:** A whole generated, validated file plus a typed export feed nothing on the site.
- **Why it matters:** The generator, validator and types have to keep these files in sync for no user-visible benefit. It also suggests the equipment and weapons index pages were meant to show SRD intro text and lost it.
- **Fix:** Either render the intros, for example a `<div class="prose intro">` per kind on `/equipment/` (as `RuleIndex.astro:19` does) and `weaponsIntro.weapons` on `/weapons/`, or delete the export, the `intro` keys, the JSON and the generator/validator code for them.
- **Severity:** med

### M8. Service worker precaches the entire 9.5 MiB site on first visit, including unused font formats
- **Where:** `scripts/generate-sw.mjs:20-27` (every file in `dist/` except `sw.js`/`.map`), `:36` (`cache.addAll(PRECACHE)`). The build log shows `sw.js: precached 393 files`.
- **What's wrong:** All 366 HTML pages (8.93 MiB) and every font file are downloaded on install. That includes 4 legacy `.woff` files (53 KiB) that never load in a browser with SW support, and the Cyrillic, Greek and Vietnamese Inter subsets. `addAll` is atomic, so a single failed request discards the whole install. Separately, line 76 serves `404.html` as the offline fallback for *every* failed request type, including JS, CSS and fonts, not only navigations.
- **Why it matters:** A first visit on mobile data downloads about 10 MiB in the background. Any 404 in the precache list, such as a file renamed between deploy and install, makes offline support silently fail.
- **Fix:** Precache the shell (`_astro/*.css|js`, latin `.woff2`, icons, index pages, `search-index.json`). Cache detail pages at runtime, stale-while-revalidate, or precache them in a second, non-blocking batch. Exclude `*.woff` and the non-latin subsets, or import only `@fontsource-variable/inter/latin.css`. Limit the 404 fallback to `request.mode === 'navigate'`.
- **Severity:** med

---

## Low

### L1. `global.css` is a 1073-line monolith
- **Where:** `src/styles/global.css` (1–1073).
- **What's wrong:** Tokens, reset, app shell, cards, prose, tables, the weapons-table card layout (`:871+`), palette (`~:960-975`) and utilities all live in one file. Page-specific table CSS is split between it and the page `<style>` blocks (see H1).
- **Why it matters:** Hard to find the rule that applies, and dead rules accumulate. Two classes already have no users: `.palette-empty` (`:972`, `palette-hint` on the same line is used) and `.stack` (`:1072`), found by grepping every class selector against `src/`.
- **Fix:** Split into `tokens.css`, `base.css`, `shell.css`, `components.css`, `tables.css` and `palette.css`, imported from `AppShell`. Delete `.palette-empty` and `.stack`.
- **Severity:** low

### L2. Python build scripts are large, run at import time and duplicate helpers
- **Where:**
  - `scripts/build_glossary.py` (659 lines). Top-level code runs from `:26` onward. `:339-460` holds hand-authored `TABLE_BODIES` HTML inline.
  - `scripts/build_equipment.py` (624 lines). `LINES = load_lines()` and the `heading_at` calls run at import (`:62,86-89`).
  - Duplicated helpers: `load_lines` (`build_combat_rules.py:64-76` vs `build_equipment.py:40-60`, near-identical), `esc` (`build_combat_rules.py:89-90` = `build_equipment.py:155-156`), `slugify` (`build_glossary.py:526-533` vs `build_equipment.py:101-105`, different rules: one strips apostrophes, the other NFKD-folds and maps `&` to "and"), `FOOTER` (in all three), and `first_sentence` (`build_glossary.py:536`, `build_combat_rules.py:128`).
  - `build_glossary.py:202-203`: `esc()` is a no-op that returns `s`, so `&`/`<` in SRD text would go into the HTML unescaped. No current entry has a bare `&` (checked), so this is latent.
  - `build_glossary.py:332`: `Q = "‘"  # not used`.
- **Why it matters:** The scripts can't be unit tested (see M3). Slug rules that differ across datasets risk inconsistent URLs. The no-op escape is a latent HTML-injection or broken-markup bug.
- **Fix:** Create `scripts/srd_common.py` with `load_lines(path)`, `esc`, `slugify`, `first_sentence` and `FOOTER`, and give each script a `main()`. Move `TABLE_BODIES` to `source/overrides/glossary-tables.html` or a JSON file. Make `esc` real and delete `Q`.
- **Severity:** low

### L3. `src/scripts/shell.ts` bundles five unrelated concerns (335 lines)
- **Where:** `src/scripts/shell.ts:17-36` (theme), `:42-176` (palette), `:182-203` (favourites), `:209-295` (tooltips), `:301-326` (back button, SW).
- **What's wrong:** Each section is independent but they share one module, which every page loads.
- **Why it matters:** The file is navigable as it stands, but the palette and tooltip halves are the parts most likely to grow. Splitting would also let `favourites/index.astro` reuse a shared `KIND_LABEL` (see L4).
- **Fix:** Split into `scripts/shell/{theme,palette,favourites,tooltips,nav}.ts`, with `shell.ts` as a 10-line `initShell` aggregator.
- **Severity:** low

### L4. Small duplicated constants and logic in `src/`
- **Where:**
  - Kind labels: `src/scripts/shell.ts:5-11` (`KIND_LABEL`) vs `src/pages/favourites/index.astro:207` (`KIND`).
  - The theme storage key `'dnd-ref:theme'`: `src/layouts/AppShell.astro:60` (inline script) vs `src/scripts/store.ts:176,185`.
  - Category counting: `src/layouts/AppShell.astro:31-32` vs `src/pages/glossary/index.astro:13-14`.
  - Doc-id strings `` `glossary/${slug}` `` etc.: `data.ts:176,181-182`, `search-index.json.ts:233,242,251,260,269` and each detail page (`glossary/[slug].astro:22`, `equipment/[slug].astro:21`, `RuleDetail.astro:20`, `RuleIndex.astro:116`).
  - `search-index.json.ts:246` uses `masteries.find(...)` where `masteryBySlug` exists (`data.ts:91`).
  - The detail-page header (breadcrumbs + `entry-title-row` + FavButton) repeats in `glossary/[slug].astro:42-53`, `equipment/[slug].astro:41-52`, `weapons/[slug].astro:40-49` and `RuleDetail.astro:26-36`.
- **Why it matters:** These drift easily. For example, adding a doc kind means editing two label maps and several id builders.
- **Fix:** Export `KIND_LABEL` and a `docId(kind, slug)` helper from one module, plus `categoryCounts` from `data.ts`, and an `EntryHeader.astro` component. Keep the theme key as a shared constant (the inline script can't import it, so add a comment pointing at `store.ts`).
- **Severity:** low

### L5. Unused exports, icon and file
- **Where:**
  - `src/lib/data.ts:92` `equipmentBySlug` and `:111` `equipmentOfKind`: no importers.
  - `src/components/Icon.astro:35` `external` icon: never referenced.
  - `source/legacy/dnd_2024_weapons.html` (50 KB): not read by any script (`build_glossary.py:72` reads only `dnd_2024.html`). It is used only as the provenance for `source/reports/weapons-diff.md`.
  - `tests/screens/`: an empty, untracked directory left from an older screenshot path. `responsive.spec.ts:37` now writes to `test-results/screens/`.
- **Why it matters:** Clutter that misleads readers about what's live.
- **Fix:** Delete the two exports and the icon. Either delete the legacy weapons HTML or add a line to the README explaining it's archival. Remove `tests/screens/`.
- **Severity:** low

### L6. `Icon` accepts any string, so icon names are not type-checked
- **Where:** `src/components/Icon.astro:3` (`name: keyof typeof paths | string`) and `:41` (falls back to `paths.book`).
- **What's wrong:** `keyof typeof paths | string` widens to `string`, so a typo like `name="swrods"` passes `astro check` (0 errors) and silently renders a book icon. `categoryMeta` (`data.ts:127-128`) and `equipmentKindMeta` (`data.ts:108-109`) also fall back silently to "core"/"gear".
- **Why it matters:** Wrong icons and wrong categories can't be caught at build time.
- **Fix:** Type it as `name: keyof typeof paths` (declare `paths` with `as const`). Have `CATEGORIES` use `satisfies readonly { icon: keyof typeof paths }[]` by exporting the icon-name type. Make the meta lookups throw at build time on an unknown key.
- **Severity:** low

### L7. Build/test scripts: `pretest` always rebuilds, `test:update` is dead, no Node version pin
- **Where:** `package.json:11-14` and the `package.json` root (no `engines`); no `.nvmrc`.
- **What's wrong:**
  - `pretest` runs the whole build (3 validators + `astro check` + `astro build` + SW), even when only a spec file changed.
  - `test:update` runs `--update-snapshots`, but there are no snapshot assertions (`grep toHaveScreenshot|toMatchSnapshot tests` finds none), so it is the same as `npm test`.
  - `check` duplicates the `astro check` that `build` already runs.
  - README says "Requires Node 24+" and CI uses `node-version: 24` (`deploy.yml:23`), but neither `engines` nor `.nvmrc` enforces it.
  - README says `npm test` should be run "after build", which is misleading since `pretest` builds.
- **Why it matters:** The test loop is slower than it needs to be, one script name is misleading, and the Node requirement isn't enforced locally.
- **Fix:**
  - Add `"engines": { "node": ">=24" }` and `.nvmrc` (`24`), and use `node-version-file: .nvmrc` in CI.
  - Rename `pretest` to an explicit `test:ci` (`npm run build && playwright test`) and keep `test` as just `playwright test`, or keep `pretest` and add `test:quick`.
  - Remove `test:update`, or add real `toHaveScreenshot` assertions.
- **Severity:** low

### L8. Stale "known failing" comment in the responsive test
- **Where:** `tests/responsive.spec.ts:46-53`.
- **What's wrong:** The comment says the weapons page at 360 px overflows by 2 px and is "Left failing intentionally". It also cites `padding-inline-end: 3rem` and `inset-inline-end: 0.4rem` in `global.css`. Those values now live in `weapons/index.astro:180-181` as `3.25rem` and `0.25rem`, and the test passes (0 failures in this run).
- **Why it matters:** It points the next reader at a bug that no longer exists.
- **Fix:** Delete the comment block.
- **Severity:** low

### L9. Base path and site URL hard-coded in five places
- **Where:** `astro.config.mjs:5-6`, `scripts/generate-sw.mjs:8`, `tests/serve.mjs:12`, `playwright.config.ts:4`, `public/manifest.webmanifest:5-6`.
- **What's wrong:** Each place spells out `/dnd-2024-reference/` separately.
- **Why it matters:** A repo rename or a custom domain needs five coordinated edits, and missing one breaks the SW or the tests.
- **Fix:** Export `BASE` from a tiny `site.config.mjs` and import it in the config, SW generator, test server and Playwright config. Generate the manifest from a `src/pages/manifest.webmanifest.ts` endpoint using `import.meta.env.BASE_URL`.
- **Severity:** low

### L10. Favourites page shows "No favourites yet" when the search index can't load
- **Where:** `src/pages/favourites/index.astro:211-216,238`.
- **What's wrong:** If `loadIndex()` fails (offline before the SW cached it), `docs` stays `[]`, every favourite is filtered out, and the empty state claims the user has none.
- **Why it matters:** It wrongly tells offline users their saved items are gone.
- **Fix:** On failure, show an "unavailable offline" message when `getFavourites().length > 0`. Also use a type-guard filter `(d): d is SearchDoc => !!d` to drop the six `d!` assertions (`:225-234`).
- **Severity:** low

### L11. Stale descriptions omit equipment
- **Where:** `package.json:6`, `src/layouts/AppShell.astro:26` (default meta description), `public/manifest.webmanifest:4`, `src/pages/favourites/index.astro:173,177`.
- **What's wrong:** These still describe the site as "glossary, weapons and weapon masteries" (or "rule, weapon, mastery or property"), but equipment has since been added.
- **Why it matters:** SEO, PWA install text and on-page copy are slightly wrong.
- **Fix:** Update the four strings.
- **Severity:** low

### L12. TypeScript strictness could go one notch further
- **Where:** `tsconfig.json:2` (`astro/tsconfigs/strict`).
- **What's wrong:** `noUncheckedIndexedAccess` is off. Index access such as `glossary[i - 1]` (`glossary/[slug].astro:12`), `entry.title[0]` (`glossary/index.astro:10`) and `items[active]` (`shell.ts:67`) is typed as always defined. `scripts/*.mjs` and `tests/serve.mjs` aren't type-checked at all, because `allowJs`/`checkJs` are off.
- **Why it matters:** Off-by-one and empty-array bugs aren't caught at compile time, and the validators and SW generator have no type checking.
- **Fix:** Extend `astro/tsconfigs/strictest`, or add `"noUncheckedIndexedAccess": true`. Add `// @ts-check` to the `.mjs` scripts (as `astro.config.mjs:1` already does).
- **Severity:** low

### Checked and found fine
- `.gitignore` covers `node_modules/`, `dist/`, `.astro/`, `.venv/`, `__pycache__/`, `test-results/` and `playwright-report/`, and `git status --ignored` confirms all are ignored. Nothing generated is tracked.
- CI Node (24) matches the README and the local Node (24.19.0). The Playwright browser install (chromium only) matches both projects (Desktop Chrome, Pixel 7 are both Chromium).
- `astro check` is clean, with 0 errors, warnings or hints.
