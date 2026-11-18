# Bug and edge-case audit

Scope: `src/scripts/*`, `src/pages/**`, `src/components/**`, `src/lib/data.ts`, `scripts/generate-sw.mjs`, data in `src/data`.

How I checked:
- `npm run build` passes. That covers validate, `astro check` and astro build, and the build precached 393 files.
- I crawled the internal links in `dist/`: no `href` under the base path is broken, and every `data-term` id exists in `search-index.json`.
- I wrote throwaway Playwright probes in the scratchpad, outside the repo, using the Pixel 7 profile and `tests/serve.mjs`. "Verified (probe)" means I reproduced the behaviour in the built site. "Verified (code)" means I traced it by reading the code but did not run it. "Unverified" is marked as such.

No project files were changed apart from this report.

---

## High

### H1. On touch devices, term previews stop working once the search index is loaded. The first tap goes straight to the page.
- **Where:** `src/scripts/shell.ts:274-278` (the `focusin` handler) together with `src/scripts/shell.ts:281-290` (the touch `click` handler, `anchor !== link` at :284)
- **What's wrong:**
  - On Android Chrome, tapping a link focuses it. That fires `focusin` before `click`, and `focusin` calls `show(link, false)`.
  - If the index promise has already resolved, `show` sets `anchor = link` (:237) in a microtask, which runs before `click` is dispatched.
  - The click handler then sees `anchor === link`, does not call `preventDefault()`, and the browser follows the link.
- **Failure scenario:** a player taps "Disadvantage" on a rule page after the index has loaded. That can happen by opening search, by any earlier tap preview, or by a hover. The browser navigates away and no preview card appears.
  - Probe: open and close the palette, then `tap()` the first `a.term`. The URL changed to `/glossary/speed/` with no preview.
  - The existing test `tests/glossary.spec.ts:55` passes only because the index is still cold on the first tap.
- **Fix:**
  - Track whether the last interaction was a pointer, for example with a flag set on `pointerdown` for non-mouse pointers.
  - Skip the `focusin` preview for pointer-initiated focus. Alternatively, only preview on `focusin` when `link.matches(':focus-visible')`.
  - In the click handler, decide using a separate `tipOpenedByTap` state instead of `anchor`.
  - Add a test that taps a second, different term after the index has loaded.
- **Severity:** high

### H2. A corrupted or non-array value in localStorage crashes the shell script on every page.
- **Where:** `src/scripts/store.ts:8-15` (`read` returns whatever `JSON.parse` yields), used by `shell.ts:183` (`new Set(getFavourites())`), `shell.ts:199` and `shell.ts:202` (`pushRecent` → `getRecent().filter`), all inside `initShell()` at `shell.ts:328-335`
- **What's wrong:** `read` only falls back when parsing throws. Valid JSON of the wrong shape (`{"a":1}`, `5`, `"x"`, `null`) is returned as-is. Because `raw` is the truthy string `"null"`, the fallback is skipped for `null` too.
- **Failure scenario:**
  - Probe with `dnd-ref:favourites = {"a":1}`: the page throws `object is not iterable`.
  - Probe with `dnd-ref:recent = null`: the page throws `Cannot read properties of null (reading 'filter')`.
  - `initShell` runs in order, so `initTooltips`, `initBackButtons` and `registerServiceWorker` never run. Favourites, previews, the smart Back button and offline support are dead on every page.
  - Clearing site data is the only way to recover.
  - This can be triggered by an old schema, a browser extension, manual edits, or a future change to the storage format.
- **Fix:**
  - Validate the shape in `read`, for example `Array.isArray(v) && v.every(s => typeof s === 'string')`, and fall back otherwise. Optionally rewrite the key with the cleaned value.
  - Wrap each `init*` call in `initShell` in its own try/catch so that one failure cannot take down the others.
- **Severity:** high

---

## Medium

### M1. On touch, term links do nothing when the index can't load or the id is missing.
- **Where:** `src/scripts/shell.ts:281-290` with `show` at `shell.ts:228-236`
- **What's wrong:**
  - The click handler calls `preventDefault()` before it knows whether a preview can be shown.
  - If `loadIndex()` rejects (flaky network before the service worker has cached the index), or `docs.find` misses (for example, an HTML page from the old cache next to a newer network-first index after a deploy, see M6), `show` returns early. `anchor` stays `null`.
  - Every later tap is cancelled again.
- **Failure scenario:** probe with `search-index.json` aborted: tapping a term twice leaves the URL unchanged. The link is effectively dead on mobile.
- **Fix:** don't cancel the click unconditionally. Either check that the doc is available synchronously (cache the resolved docs in a variable) before calling `preventDefault()`, or, when `show` fails, fall back to `location.href = link.href`.
- **Severity:** med

### M2. The in-memory fallback in `read` is never used when localStorage throws, so favourites never toggle.
- **Where:** `src/scripts/store.ts:10`
- **What's wrong:** `localStorage.getItem(key) ?? memory.get(key)` evaluates `localStorage` first. When accessing it throws (Safari with blocked cookies, some sandboxed iframes, enterprise policies), the `catch` returns `fallback` and `memory` is never consulted. `write` does fill `memory`, but `read` can't get to it.
- **Failure scenario:** probe with a `localStorage` getter that throws: clicking the star leaves `aria-pressed="false"`. The star never lights up and the favourites page stays empty in that session, even though the comment at `store.ts:1-2` promises an in-memory fallback.
- **Fix:** check `memory` first, or isolate the storage call:
  `let raw = memory.get(key); if (raw == null) { try { raw = localStorage.getItem(key) ?? undefined; } catch {} }`
- **Severity:** med

### M3. When storage is blocked, the theme toggle gets stuck after one click and its icon and label are wrong.
- **Where:** `src/scripts/shell.ts:22-33`
- **What's wrong:**
  - `sync()` works out `resolved` from `getTheme()`, which returns `null` when storage is blocked, and otherwise from the system preference. It ignores `root.dataset.theme`, which the click handler has just set.
  - The next click reads `resolvedTheme` (still the system value) and sets the same theme again.
- **Failure scenario:** probe with blocked storage and a light system theme. Three clicks give `[theme, resolved]` = `["dark","light"]` each time. The page turns dark and can't be switched back, and the button still shows the sun icon and says "Switch to dark mode".
- **Fix:** in `sync`, use `getTheme() ?? (root.dataset.theme as 'light'|'dark' | undefined) ?? system`. Alternatively, keep the chosen theme in a module variable.
- **Severity:** med

### M4. The palette's "unavailable offline" message is overwritten immediately, so users see "No results".
- **Where:** `src/scripts/shell.ts:113-118`
- **What's wrong:** the `catch` sets the status text, then `render()` runs right away with `docs = []`. It replaces the text with "Start typing to search…", and once the user types it shows `No results for "…"`.
- **Failure scenario:** probe with the index request aborted. Status reads "Start typing…", and typing "grapple" gives "No results for "grapple"". The user concludes the rule doesn't exist.
- **Fix:** keep a `loadError` flag. Have `render()` show the offline or error message (and skip the empty-results text) while `docs` is empty because loading failed. Retry `loadIndex()` on the next input.
- **Severity:** med

### M5. The favourites page says "No favourites yet" when the index can't load.
- **Where:** `src/pages/favourites/index.astro:46-49` (the `catch` swallows the error) and `:72`
- **What's wrong:** if `loadIndex()` fails, `docs = []`, every favourite is filtered out and the empty state appears.
- **Failure scenario:** probe with one stored favourite and the index aborted: the "No favourites yet" empty state is visible. A user offline before the service worker cached the index, or on a flaky connection, thinks their saved items are gone.
- **Fix:** on failure, render a distinct "Couldn't load your favourites, check your connection" state with a retry button, or render bare cards from the ids. Show "No favourites yet" only when `favs.length === 0`.
- **Severity:** med

### M6. The search index is fetched network-first with no timeout, so search and previews hang on a weak connection.
- **Where:** `scripts/generate-sw.mjs:50-62`
- **What's wrong:** the cached copy is used only when `fetch` rejects. On a connection that is up but barely working ("lie-fi"), the fetch can stall for tens of seconds before it fails.
- **Failure scenario:** at a game table with one bar of signal, the user opens search. The palette shows nothing (no results, no status) until the request times out, and term previews and the favourites page wait as well. This defeats the offline-first goal.
  - Related: HTML is cache-first while the index is network-first, so after a deploy a user can briefly have old pages and a new index. Ids referenced by old `data-term` or favourites may then be missing, which triggers M1.
  - Verified (code); I did not simulate a slow network.
- **Fix:** race the network against a short timeout of about 2–3 s and fall back to `caches.match`. Better still, use stale-while-revalidate for the index, since the precache already contains it.
- **Severity:** med

### M7. Auto-linking links the wrong rule in equipment text.
- **Where:** `src/lib/data.ts:198` (`weaponMatcher` used for the equipment domain), called from `src/pages/equipment/[slug].astro:68` and `:79`. Matching is case-sensitive on titles with no context.
- **What's wrong:** equipment text is linked with the weapons matcher, so property, mastery and action names match ordinary nouns. I verified these in the built output:
  - `equipment/smiths-tools`: "(except **Hide**)" (Hide Armor) links to the *Hide action*, and "**Heavy** armor" links to the *Heavy weapon property*.
  - `equipment/leatherworkers-tools`: "**Hide** Armor" links to the *Hide action*.
  - `equipment/spikes-iron`: "a **Light** Hammer" links to the *Light property* instead of the Light Hammer weapon.
- **Failure scenario:** a user taps "Hide" in Smith's Tools and gets a preview of the Hide action rules. That is wrong rules information.
- **Fix:**
  - Use the glossary-only matcher for equipment text.
  - Add a stop-list, for example don't match a term followed by " Armor" or " Hammer", or keep a per-term denylist of following words.
  - Better still, add weapon and armor names as higher-priority (longer) terms so "Light Hammer" and "Hide Armor" win the longest-match ordering.
- **Severity:** med

### M8. On the equipment table, the Cost column header can never sort ascending.
- **Where:** `src/pages/equipment/index.astro:305-312`
- **What's wrong:** the first click on Cost sets `desc`. The next click falls into `else` (because `sortDir !== 'asc'`) and resets to SRD order. Unlike the weapons page (`weapons/index.astro:265`), the cycle doesn't account for the descending-first default.
- **Failure scenario:** probe clicks give `aria-sort` = `descending → none → descending`. Desktop users can't get cheapest-first from the header, and only the hidden mobile `<select>` offers it.
- **Fix:** copy the weapons logic: `else if ((sortDir === 'asc') === (key !== 'cost')) sortDir = flip; else sortKey = ''`.
- **Severity:** med

---

## Low

### L1. The palette's live region is removed from the DOM and hidden, so result counts are never announced.
- **Where:** `src/scripts/shell.ts:84`, `:97`, `:100`, `:102`
- **What's wrong:**
  - `#palette-status` is moved *into* the `<ul role="listbox">` (an invalid `<p>` child of a listbox).
  - The next `list.innerHTML = …` removes it from the DOM, and when results exist it isn't re-inserted.
  - It is also set `hidden` whenever there are results. The comment at :103 ("repeats what `status` announces") is therefore wrong.
- **Failure scenario:** probe: after typing "grapple", `document.getElementById('palette-status')` returns `null`. Screen-reader users get no "N results" announcement.
- **Fix:** keep `#palette-status` permanently outside the list, make it visually hidden rather than `hidden`, and always set its text.
- **Severity:** low

### L2. A hover preview can stick after the mouse has left (race with the first index load).
- **Where:** `src/scripts/shell.ts:228-246` and the `pointerout` handler (`:267-273`)
- **What's wrong:** `pointerout` clears only `showTimer`. If the 220 ms timer has already fired and `show` is waiting on a slow first `loadIndex()`, `hide()` runs first. `show` then resumes and opens the tip for a link the pointer has already left, and no further `pointerout` arrives to close it.
- **Failure scenario:** on the first page load with a slow index fetch, the user brushes over a term and moves on. The tip appears and stays until they scroll, click or press Escape.
- **Fix:** after the `await`, check that the link is still the intended target, for example with a `pendingLink` token set when scheduling and cleared in `hide`.
- **Severity:** low (Unverified; I traced it in code but did not reproduce it)

### L3. The weapons "Sort by" select goes blank after some header sorts.
- **Where:** `src/pages/weapons/index.astro:68-76` (options) and `:248`
- **What's wrong:** header clicks can produce `name:desc`, `weight:desc` or `mastery:desc`, which have no `<option>`. Setting `cardSort.value` to a missing value leaves the select showing nothing.
- **Failure scenario:** probe: clicking Weight twice leaves the select value as `""`, so it shows a blank label while the table is sorted. If you resize to mobile, the select doesn't reflect the sort.
- **Fix:** add the missing options, or fall back to the closest available option.
- **Severity:** low

### L4. The palette caps results at 60 but reports "60 results".
- **Where:** `src/scripts/search.ts:77` (`limit = 60`) and `src/scripts/shell.ts:99`
- **What's wrong:** short queries like "a" match hundreds of entries, but the count shows the capped number.
- **Fix:** return the total along with the slice and show "60 of 214 results", or "60+".
- **Severity:** low

### L5. The filter pages remove the URL hash on load and on every keystroke.
- **Where:** `src/pages/glossary/index.astro:130`, `src/pages/weapons/index.astro:230`, `src/pages/equipment/index.astro:270`
- **What's wrong:** `replaceState(…, qs ? '?'+qs : location.pathname)` drops `location.hash`.
- **Failure scenario:** probe: loading `glossary/#letter-G` leaves the URL as `glossary/`. Shared or bookmarked A–Z jump links lose their anchor on reload and in history.
- **Fix:** append `location.hash` to the new URL.
- **Severity:** low

### L6. Unknown filter values in the URL give an empty list with no chip selected.
- **Where:** `src/pages/glossary/index.astro:93`, `src/pages/weapons/index.astro:204`, `src/pages/equipment/index.astro:245`
- **What's wrong:** query parameters are not checked against the known values.
- **Failure scenario:** probe: `glossary/?category=bogus` shows "0 rules" with no chip pressed. A stale link (for example after a category slug is renamed) looks like an empty glossary.
- **Fix:** if the value isn't one of the chip values, reset it to `''`.
- **Severity:** low

### L7. The service worker's offline fallback returns `404.html` for every failed request, including scripts and fonts. URLs without a trailing slash also 404 offline.
- **Where:** `scripts/generate-sw.mjs:65-76`
- **What's wrong:**
  - The `.catch(() => caches.match('…/404.html'))` applies to every request type, so a failed script, font or image gets an HTML response.
  - Navigating offline to `/glossary/prone` (no slash) misses the cache, because the precache keys all end in `/`, and shows the 404 page even though the page is cached.
- **Fix:**
  - Only fall back to `404.html` when `request.mode === 'navigate'`.
  - For navigations, also try `caches.match(url + '/')` before falling back.
- **Severity:** low (Verified, code)

### L8. The service worker precaches every font subset and `.woff` fallbacks.
- **Where:** `scripts/generate-sw.mjs:20`
- **What's wrong:** all 15 font files in `dist/_astro` are precached, including the cyrillic, greek and vietnamese Inter subsets and the `.woff` duplicates. For an English site those bytes are almost never used. It enlarges install, and the larger the precache, the more likely `addAll` hits a request failure, which aborts the whole install.
- **Fix:** exclude `*.woff` and non-latin subsets from `PRECACHE` and let them be cached at runtime. Alternatively, import only the latin subsets from fontsource.
- **Severity:** low

### L9. `generate-sw.mjs` breaks on paths with spaces or non-ASCII characters, and duplicates the base path.
- **Where:** `scripts/generate-sw.mjs:7-8`
- **What's wrong:**
  - `new URL(...).pathname` is percent-encoded. A checkout under `C:\Users\Some User\…` gives `Some%20User` and `readdir` fails.
  - `BASE` is hard-coded separately from `astro.config.mjs`, so changing one without the other silently breaks every precache URL.
- **Fix:** use `fileURLToPath(new URL('../dist/', import.meta.url))` (as `tests/serve.mjs` already does), and import or share the base path.
- **Severity:** low

### L10. Home page "Saved" chips cut the list to 12 before dropping stale ids.
- **Where:** `src/pages/index.astro:163`
- **What's wrong:** `favs.slice(0, 12)` runs before `byId.get` filtering.
- **Failure scenario:** if the 12 most recent favourites point to removed or renamed entries, the "Saved" section is hidden even though valid favourites exist. Stale ids are also never pruned from storage anywhere.
- **Fix:** filter to existing docs first, then slice. Optionally write the pruned list back.
- **Severity:** low

### L11. The Back button trusts any same-origin referrer.
- **Where:** `src/scripts/shell.ts:304`
- **What's wrong:** on GitHub Pages the origin `jabeda321.github.io` is shared by every project site, so a visitor arriving from another project counts as "came from site".
- **Failure scenario:** the label says "Back", but `history.back()` takes the user to a different site instead of the index page.
- **Fix:** also require `new URL(document.referrer).pathname.startsWith(document.body.dataset.base)`.
- **Severity:** low

### L12. "—" weights sort inconsistently between weapons and equipment.
- **Where:** `src/pages/equipment/index.astro:25` and `:276`; weapons data has `weight: "—", weightLb: 0`
- **What's wrong:** on the weapons page "—" sorts as 0 lb, lightest first. On the equipment page "—" (null) sorts *last* in both directions, but for items like Candle, Bell, Ink and Signal Whistle the SRD "—" means negligible weight. Ascending "light–heavy" therefore puts a Candle after Plate Armor.
  - Separately, ties between two null values return `NaN` (`Infinity - Infinity`, :281), which skips the name tie-break.
- **Fix:** separate "negligible" (sort as 0) from "not applicable" (mounts and vehicles, sort last) in the build script. Return `0` before the name tie-break when both values are null.
- **Severity:** low

### L13. Search result highlighting misses curly apostrophes and accents.
- **Where:** `src/scripts/search.ts:118-125`
- **What's wrong:** query tokens are normalised (’ → ', accents stripped) but the raw title is not. "entertainer's" matches "Entertainer’s Pack" but isn't highlighted.
- **Fix:** match against the normalised title (which is the same length for apostrophes) and map offsets back.
- **Severity:** low

### L14. Palette results can't be opened in a new tab.
- **Where:** `src/scripts/shell.ts:144-147` and Enter at `:162-164`
- **What's wrong:** clicks and Enter always set `location.href`. Ctrl, Cmd and middle-click are ignored, and the mouse doesn't update `aria-selected`.
- **Fix:** honour `e.ctrlKey || e.metaKey || e.button === 1` with `window.open(url, '_blank')`, and sync `setActive` on `pointermove`.
- **Severity:** low

### L15. Favourites page: removing a card loses keyboard focus, and the whole grid is a live region.
- **Where:** `src/pages/favourites/index.astro` (`aria-live="polite"` on `[data-fav-grid]`, and the full `replaceChildren` in `render`)
- **What's wrong:** unstarring removes the focused button, so focus falls back to `<body>`. The live region also re-announces every remaining card.
- **Fix:** move focus to the next card's star (or the heading), and announce a short "Removed X" message in a separate live region.
- **Severity:** low

---

## Checked and found OK
- Internal links: no broken base-path hrefs in `dist/`, and all `data-term` ids exist in the index.
- `seeAlso` slugs all resolve. No duplicate slugs across glossary, combat rules or equipment, and no slug clashes between weapons and equipment.
- Data escaping: no stray `<` or raw `&` in body, summary or stat fields; body HTML uses only `p ul li strong table thead tbody tr th td h3 caption`. Palette and tooltip output goes through `escapeHtml`. Card and favourites rendering uses `textContent`.
- Weapons damage sort: `diceAverage` handles the only non-`NdM` value, `"1"` (Blowgun). All weapons have numeric `weightLb` and `costCp`.
- The service worker scope, the `manifest` `start_url`/`scope` and the registration URL all respect `/dnd-2024-reference/`. Cache version hashing covers both the content and the worker source, and old `dnd-ref-*` caches are deleted on activate.
