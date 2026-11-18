# Design & UX audit: D&D 2024 Reference

Date: 2026-11-18. Method: the impeccable skill's `audit` playbook (`reference/audit.md`), applied to `src/styles`, `src/layouts`, `src/components`, `src/pages` and `src/scripts`. I checked every claim against the source, and checked most of them in the built site too: the current `dist/` was served with `tests/serve.mjs` and probed with Playwright/Chromium at 1440×900, 1024, 320, 360 and 390 px, in light and dark. The probes measured contrast ratios, element boxes, sticky positions, overflow, scroll widths and the palette's live region. "Verified (rendered)" means a probe measured it. Everything else comes from reading the code.

Impeccable context: the project has no PRODUCT.md or DESIGN.md, so the code you have now was treated as the design authority. The bundled detector (`impeccable detect src`) returned one result: a side-stripe accent border (L-7 below).

Severity: **High** = WCAG AA failure or a task blocked/badly degraded (impeccable P1). **Med** = real friction or inconsistency with a workaround (P2). **Low** = polish (P3). There are no P0 blockers.

---

## Health score

| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | 3 / 4 | The search palette never announces how many results it found, and on desktop the sticky toolbar hides the focused card and letter headings |
| 2 | Performance | 3 / 4 | Fine overall. Three stacked `backdrop-filter` blur layers (header, toolbar, bottom nav) are the only real cost |
| 3 | Theming | 3 / 4 | Solid `light-dark()` token system and every text pair passes AA. The type scale drifts: 15 raw rem font sizes alongside 6 step tokens |
| 4 | Responsive | 3 / 4 | No overflow at 320–390 px except one 5 px case. Filter rows hide options off-screen with no affordance |
| 5 | Implementation integrity | 3 / 4 | Coherent "bone/umber + crimson/gold" system. Detail pages and tables have drifted apart in small ways |
| **Total** | | **15 / 20** | **Good: fix the weak spots** |

**Integrity verdict: pass.** The tokens are a deliberate set, defined once in `global.css:7-75`. Brand colour is used sparingly (crimson for action and state, gold for metadata). The Cinzel/Inter pairing fits the subject, and the layout patterns (shell, cards, entry layout, palette) are shared rather than rebuilt per page. Most of the issues below are about how components behave and edge cases, not about the overall look.

**Counts:** High 4 · Med 9 · Low 9.

---

## High

### H-1. Sticky toolbar covers in-page jump targets and focused items on desktop (WCAG 2.4.11 Focus Not Obscured)
- **Location:** `src/styles/global.css:95` (`scroll-padding-block-start: calc(var(--header-h) + var(--space-l))`) together with `global.css:285-287` (the `.toolbar` becomes sticky at `width >= 48rem and height >= 40rem`). Affects `glossary/`, `weapons/` and `equipment/`.
- **What's wrong:** scroll padding only allows for the 60 px header. The glossary toolbar under it is 165 px tall (226 px on weapons on narrow tablets). Verified (rendered, 1440×900):
  - Clicking A–Z "G" puts `#h-G` at y=84. The toolbar's bottom edge is at y=225, so the letter heading lands underneath the toolbar.
  - Shift+Tabbing up through glossary cards leaves the focused card at top=172 with the toolbar ending at 225. The focused title link (about 16 px into the card) is completely hidden.
- **Why it matters:** the A–Z bar's whole purpose is to land you on a letter, and right now it hides that letter. Keyboard users lose sight of what has focus, which fails AA 2.4.11.
- **Fix:** expose the toolbar's height as a custom property, set from a `ResizeObserver` or a CSS estimate. Then use `scroll-padding-block-start: calc(var(--header-h) + var(--toolbar-h, 0px) + var(--space-s))` on `html` for these pages, for example with `:root:has(.toolbar)`. Do the same for `.letter-group { scroll-margin-block-start }`. The other option is to make only the search row sticky and let the chips and A–Z rows scroll away.

### H-2. The search palette's result count is never announced; its status node is detached or hidden
- **Location:** `src/scripts/shell.ts:95-104`, `src/components/SearchPalette.astro:38`.
- **What's wrong:** `#palette-status` is the `aria-live` region. Line 97 moves it into the `<ul>`. On the next render `list.innerHTML = …` removes it from the DOM, and when there are results it is never re-attached (line 100 only appends it when there are no results). On top of that, line 102 sets `hidden` whenever there are results. Verified (rendered): after typing "grap", the status node has `isConnected: false`, `hidden: true` and text "11 results". The comment at line 103 ("the badge repeats what status announces") therefore describes something that never happens. The visible count badge is `aria-hidden`.
- **Why it matters:** screen reader users get no feedback that results changed or how many there are, only the first option once arrow keys are used. This is the site's main navigation tool.
- **Fix:** keep `#palette-status` permanently outside the listbox, as a sibling after the `<ul>`. Never move it or set `hidden` on it; hide it visually with `.visually-hidden` when results show. Update its text on each render, debounced about 300 ms so it doesn't chatter on every keystroke.

### H-3. In "recently viewed" and "no results" states, a `<p>` is placed inside `role="listbox"`
- **Location:** `src/scripts/shell.ts:97` (`list.prepend(status)`) and `:100` (`list.append(status)`).
- **What's wrong:** verified (rendered): with an empty query and with zero results, the status `<p>` has `parentElement.role === "listbox"`. A listbox may only own `option` and `group` elements. The "Recently viewed" heading also sits among the options as an unlabelled item.
- **Why it matters:** this is invalid ARIA (axe `aria-required-children` / `list` rules). Screen readers may count it as an item or skip it, and the combobox reports a wrong item count.
- **Fix:** fixed by the same change as H-2: keep status text outside the `<ul>`. For the recent-items heading, wrap the options in `<li role="group" aria-label="Recently viewed">`, or give the listbox `aria-label="Recently viewed"` while in that mode.

### H-4. On desktop, glossary category and equipment group filters are mostly off-screen with no scrollbar
- **Location:** `src/styles/global.css:484-494` (`.chips-scroll { overflow-x:auto; scrollbar-width:none }`, `::-webkit-scrollbar { display:none }`). Used by `glossary/index.astro:34`, `equipment/index.astro:66`, `weapons/index.astro:58` and `RuleIndex.astro:21`.
- **What's wrong:** verified (rendered): at 1440 px the glossary category row is 1836 px wide in a 1145 px box (about 38% hidden). At 1024 px it is 1832 px in 729 px (about 60% hidden). Equipment groups: 1715 px in 1145 px. Mouse users can only reach the hidden chips with Shift+wheel or a trackpad, and the faint edge mask (line 492) is the only hint.
- **Why it matters:** "Core Rules", "Creatures & Social" and similar filters can't be found or clicked by most desktop mouse users. The sidebar works around it for the glossary, but not for equipment groups.
- **Fix:** from `48rem` up, switch `.chips-scroll` to `flex-wrap: wrap; overflow: visible; mask-image: none;`, which matches the palette's own reasoning at `global.css:949-951`. Keep horizontal scrolling only on touch widths.

---

## Med

### M-1. The weapons/equipment table header is meant to be sticky but never sticks
- **Location:** `src/styles/global.css:826` (`overflow: hidden` on `.weapons-table`) and `:830-832` (`thead th { position: sticky; inset-block-start: 0 }`).
- **What's wrong:** verified (rendered): after scrolling the weapons page to y=1400, the first `th` is at top = −1007 px. `overflow:hidden` on the table makes the table the sticky containing box. Even without that, `top:0` would put the header under the 60 px app header and the 122 px sticky toolbar.
- **Why it matters:** with 38 weapons and 145 equipment rows, the Weight and Cost columns are unlabelled once you scroll past the first screen.
- **Fix:** remove `overflow:hidden` from the table. Get the rounded corners by giving the first and last header cells and the last row's corner cells a radius, or by wrapping the table in a clipping div outside the sticky context. Set `inset-block-start: calc(var(--header-h) + var(--toolbar-h))`, which reuses the variable from H-1.

### M-2. On the equipment page, the Cost column header can never sort ascending
- **Location:** `src/pages/equipment/index.astro:302-315`.
- **What's wrong:** the first click on Cost sets `desc` (line 307). The second click hits `else if (sortDir === 'asc')`, which is false, and falls into `sortKey = ''` (reset). Cost cycles desc → off and never reaches ascending. The weapons page (`weapons/index.astro:259-272`) handles columns that start descending correctly, so the two tables behave differently.
- **Why it matters:** "cheapest first" is the most common way to sort a shopping table. The card-mode `<select>` offers it, but that control is hidden on desktop.
- **Fix:** copy the weapons logic, or better, pull the shared filter/sort script out of `weapons/index.astro` and `equipment/index.astro` into `src/scripts/table.ts`. The two inline scripts are about 90% the same.

### M-3. The equipment type switch is clipped mid-word on phones with no sign it scrolls
- **Location:** `src/pages/equipment/index.astro:211-213` (`.segmented { overflow-x:auto; scrollbar-width:none }`).
- **What's wrong:** verified (rendered, 320 px): the segmented control is 379 px wide inside 286 px. At 390 px the screenshot shows "Vehicle" cut off at the right edge. There is no edge fade, unlike `.chips-scroll`.
- **Why it matters:** the "Vehicles" (and at 320 px also "Mounts") filter is easy to miss. A segmented control also implies every option is visible at once.
- **Fix:** below about `30rem`, turn the type switch into a `<select>`, or let `.segmented` wrap (`flex-wrap: wrap`), or replace it with the same chip row as groups. At minimum add the same mask fade as `.chips-scroll`.

### M-4. Weapon and equipment cards on mobile: the tap target is an 18 px text link, not the card
- **Location:** `src/styles/global.css:844` (`.weapons-table .w-name a`) and `:871-896` (card mode). Compare `global.css:564-566` (`.card-link::after` stretches over the whole glossary card).
- **What's wrong:** verified (rendered, 320–390 px): each weapon/equipment card's link to its detail page is 30–150 × 18 px. The rest of the card is not tappable. Glossary, favourites and home cards are fully tappable through `.card-link::after`.
- **Why it matters:** the same card shape behaves differently across sections, and the main action has a small target at the table, on a phone. (It technically passes the WCAG 2.5.8 spacing exception, but it is well under the 44 px the rest of the app aims for.)
- **Fix:** in the `@container weapons (width < 46rem)` block, set `tr { position: relative }` (already set in the page styles) and `.w-name a::after { content:''; position:absolute; inset:0 }`. Raise `.prop-links`, `.w-mastery a` and `.w-fav` with `position:relative; z-index:1`, as `.card .fav-btn` already does at `global.css:570`.

### M-5. Removing a favourite on the Favourites page drops keyboard focus and re-announces the whole grid
- **Location:** `src/pages/favourites/index.astro:14` (`aria-live="polite"` on the grid) and `:52` (`grid.replaceChildren(...)` on every `favourites-change`).
- **What's wrong:** un-starring rebuilds every card, so the focused button is destroyed and focus falls back to `<body>`. The live region then reads the text of every remaining card.
- **Why it matters:** a keyboard or screen reader user who removes one item is thrown back to the top of the document and hears the entire list.
- **Fix:** remove just the affected `<article>`, move focus to the next card's star button (or the previous one, or the empty-state CTA), and drop `aria-live` from the grid. Announce a short "Removed X from favourites" through a small dedicated `role="status"` element.

### M-6. Bottom nav says "Weapons" on equipment pages and claims `aria-current="page"` on detail pages
- **Location:** `src/layouts/AppShell.astro:150-154`.
- **What's wrong:** the bottom nav sets `aria-current="page"` for any page in a section, for example every glossary entry marks "Rules" as the current page. The sidebar deliberately avoids this (`AppShell.astro:36-37` uses `data-active` on detail pages). Equipment pages light up "Weapons" (verified in the 390 px screenshot). Mobile also has no direct way into Gear & Armor.
- **Why it matters:** screen readers announce the wrong current page, the two navs disagree, and phone users are told they are in "Weapons" while looking at armor and vehicles.
- **Fix:** reuse the sidebar's `current()` / `within()` helpers. Use `aria-current="page"` only on exact index matches, and `aria-current="true"` (or `data-active` for styling) for "inside this section". Rename the tab "Equipment" or "Gear", or swap it to point at a hub that lists Weapons and Gear.

### M-7. The pressed state of segmented controls is barely visible (WCAG 1.4.11)
- **Location:** `src/styles/global.css:521-539`.
- **What's wrong:** pressed = `--surface` (L 99.6%) on a `--surface-2` (L 95%) track plus `--shadow-sm`. Unpressed differs from pressed only by text going from `--text-muted` to `--text`. In dark mode it is 20.5% vs 24.5% lightness. Chips, by contrast, use a solid crimson fill when pressed (`:467`).
- **Why it matters:** "Simple vs Martial" and "Melee vs Ranged" are primary filters, and in bright light at the table it is hard to tell which one is active. The cue between states falls well short of 3:1.
- **Fix:** give the pressed segment a stronger cue. Use `--crimson-soft` background with `--crimson` text and `font-weight:650`, or a `--border-strong` 1 px ring. Do not rely on a lighter surface alone.

### M-8. The term previews and their `data-term` hooks work on prose links but not on chips and badges
- **Location:** `src/scripts/shell.ts:254` (only `a.term` triggers a preview). `data-term` is also set on `pages/index.astro:76`, `glossary/[slug].astro:90` and `weapons/index.astro:129`. Native `title` tooltips are used instead at `weapons/index.astro:129,139`.
- **What's wrong:** chips and badges carry `data-term` but never preview. The weapons table falls back to browser `title` tooltips, which touch and keyboard users can't reach and which look nothing like the custom preview.
- **Why it matters:** "hover to preview" works in some places and not others. Property and mastery badges in the weapons table are exactly where a quick preview would help most.
- **Fix:** broaden the selector to `a[data-term]` (and keep `place()` as it is). Remove the `title` attributes once previews cover them.

### M-9. The three detail page types have drifted apart visually
- **Location:**
  - `src/pages/equipment/[slug].astro:91-95,128-137` (local `.stat-list/.stat-row` for "At a glance") vs. `weapons/[slug].astro:101` (global `.glance`).
  - `equipment/[slug].astro:117` `.panel-more` vs. `glossary/[slug].astro:119` `.aside-more`.
  - `RuleDetail.astro:80` and `equipment/[slug].astro:129` duplicate `.chip[aria-current='page']`.
  - `weapons/[slug].astro:65-95` has no `panel entry-body` card while the glossary and rule pages do.
  - `equipment/[slug].astro:53-57` repeats cost and weight as header badges and in the aside.
- **What's wrong:** the same "At a glance" panel has two layouts (label-left grid vs. space-between rows with uppercase `dt`). The "see all" links differ in size and weight, and the main column's container differs by section.
- **Why it matters:** this is a reference app where people jump between sections all the time. Familiar positions and styles are what make scanning fast.
- **Fix:** use the global `.glance` component everywhere and delete `.stat-list` (keep the stacked form for the long equipment stat values via `.glance > div { flex-direction: column }` where needed). Merge `.panel-more` into `.aside-more`. Move `.chip[aria-current='page']` into `global.css`. Drop the duplicate cost/weight header badges, or the glance rows on narrow screens, following the weapons page's `wide-only/narrow-only` pattern.

---

## Low

### L-1. At 320 px, glossary entries with tables scroll the page sideways by 5 px
- **Location:** `src/styles/global.css:636-640` (`.entry { display:grid }` with an implicit `auto` column). Seen on `glossary/breaking-objects/`.
- **What's wrong:** verified (rendered): `article.entry` right edge is at 325 px in a 320 px viewport. The grid item `.entry-body` takes the min-content width of the table inside `.table-scroll`, so the inner scroller can't absorb it.
- **Why it matters:** the whole page wobbles sideways on the smallest phones.
- **Fix:** `.entry { grid-template-columns: minmax(0, 1fr); }`, or `min-inline-size: 0` on `.entry > *`.

### L-2. The palette input has no visible focus indicator and no explicit label
- **Location:** `src/styles/global.css:934,947` (`outline: none` twice); `src/components/SearchPalette.astro:17-28`.
- **What's wrong:** after tabbing from the filter chips or the close button back to the input, only the caret shows focus. The combobox's name comes from its placeholder (verified in the aria snapshot: `combobox "Search rules, weapons, masteries…"`). `aria-expanded="true"` is fixed even when the listbox is empty.
- **Why it matters:** focus is easy to lose inside the dialog, and placeholder-as-name is fragile.
- **Fix:** add `.palette-input-row:focus-within { box-shadow: inset 0 -2px 0 var(--focus); }` and `aria-label="Search the reference"`. Set `aria-expanded` from `results.length > 0` in `render()`.

### L-3. Disabled A–Z letters are still focusable and can be activated
- **Location:** `src/pages/glossary/index.astro:46,110-113`; `src/styles/global.css:621`.
- **What's wrong:** `aria-disabled="true"` plus `pointer-events:none` blocks mouse clicks only. Tab still lands on them, and Enter jumps to a hidden or missing `#letter-X`.
- **Fix:** drop `href` from disabled letters (render a `<span>`), or add `tabindex="-1"` and prevent default on click.

### L-4. Font sizes have drifted away from the type scale
- **Location:** throughout `src/styles/global.css` and the page `<style>` blocks. There are 15 distinct raw sizes (0.68, 0.7, 0.72 ×6, 0.75 ×8, 0.78, 0.8, 0.82, 0.85, 0.875, 0.9, 0.92, 0.95, 1, 1.02, 1.05 rem) against six `--step-*` tokens (`global.css:43-48`).
- **Why it matters:** sizes 0.02–0.03 rem apart (0.72/0.75, 0.9/0.92) can't be told apart by eye but still have to be maintained. Labels in different components end up a hair different.
- **Fix:** add `--step--2: 0.72rem` (micro labels: badges, `th`, `dt`, eyebrow) and map 0.85–0.92 to `--step--1`. Then replace the raw values.

### L-5. Bottom nav labels are 11.2 px
- **Location:** `src/styles/global.css:243`.
- **What's wrong:** verified (rendered): computed `font-size: 11.2px` with `--text-muted` colour. This is the smallest text in the app, on the most-used mobile control.
- **Fix:** `0.75rem` (12 px) minimum, with `font-weight: 600` for the current item as well as the colour change.

### L-6. Browser chrome colour ignores the in-app theme override, and the theme can't go back to "system"
- **Location:** `src/layouts/AppShell.astro:49-50` (media-only `theme-color` metas); `src/scripts/shell.ts:22-33`.
- **What's wrong:** forcing dark on a light-OS phone leaves a light status/URL bar over a dark page. After the first toggle, `localStorage` pins the theme permanently. There is no way back to following the OS.
- **Fix:** in `sync()`, update a single `meta[name=theme-color]` to `#1b1613` or `#f8f5f0` based on `resolved`. Optionally, a long-press or a third state ("Auto") that clears the stored preference.

### L-7. Accent stripes on cards (detector: `side-tab`)
- **Location:** `src/styles/global.css:700` (`.panel-accent`) and `src/pages/weapons/[slug].astro:149` (`.mastery-def`).
- **What's wrong:** 3 px gold side borders on rounded cards are a familiar generic-UI tell. On the weapon page the stripe on the Mastery card also competes with the stripe on the "At a glance" aside panel, so two stripes sit next to each other.
- **Fix:** use a gold top hairline or a `--gold-soft` header band on `.panel-accent`, and drop the stripe on `.mastery-def`. The gold `badge` next to the mastery name already marks it.

### L-8. Weapon detail headings: the h2 looks smaller than the h3 below it
- **Location:** `src/pages/weapons/[slug].astro:66,74` (h2 styled as `.panel-title`, 0.78rem uppercase muted) vs. `:68,82` (h3 at 1rem/650 crimson).
- **Why it matters:** the visual order runs opposite to the outline, and the glossary and rule detail pages don't use this pattern. Readers scanning by size see "Sap" and "Versatile" as the section heads.
- **Fix:** keep the `.panel-title` eyebrow look but put it on a smaller element, or make the h2 a real section head (`--step-1`, display font) to match the rest of the site.

### L-9. Scrollable regions can't be reached by keyboard in Safari
- **Location:** `src/lib/data.ts:163-164` (`.table-scroll` wrapper); `src/styles/global.css:787-796` (sticky `.entry-aside` with `overflow-y:auto`).
- **What's wrong:** neither has `tabindex="0"` or a role/label. Chrome 130+ and Firefox make scrollers focusable on their own, but Safari does not. The weapon page's aside is visibly cut off at 900 px tall (the "Other Martial Melee weapons" chips continue below the fold of the panel).
- **Fix:** `<div class="table-scroll" tabindex="0" role="region" aria-label="Table">` in `wrapTables`. For the aside, drop `max-block-size`/`overflow` and let it scroll with the page, or give it the same treatment.

---

## Patterns and systemic issues
- **Things added for one viewport and never checked on the other.** Horizontal scrollers with hidden scrollbars (H-4, M-3) and sticky layers that don't share a height variable (H-1, M-1) both come from layout decisions that were each sensible alone.
- **Copied page logic.** The weapons and equipment index scripts and styles are near copies that have already diverged (M-2, plus three copies of `a.card:hover`: `index.astro:139`, `weapons/index.astro:184`, `equipment/index.astro:225`).
- **Live regions treated as plain DOM.** In both the palette (H-2/H-3) and favourites (M-5), live regions get moved or rebuilt, and that defeats the announcements.

## What's working well
- Token system: `light-dark()` surfaces, text and brand tokens with explicit `data-theme` overrides. Every text/background pair measured passes AA in both themes. Lowest: `--text-faint` on `--surface-2` at 4.79 (light) and 4.85 (dark). Crimson on soft is 6.68 / 5.29. The focus ring is 5.2:1 (light) and 10.9:1 (dark).
- The palette is a native `<dialog>` that returns focus to its opener. The combobox/listbox use `aria-activedescendant`, Escape is handled before the search input can swallow it, and the comment explains why options aren't links (nested-interactive). On phones it goes full screen with safe-area padding.
- Hover previews follow WCAG 1.4.13: they can be hovered, dismissed with Escape, show on keyboard focus, and use tap-to-preview then tap-to-open on touch.
- Icon buttons, chips, inputs and nav links are 40–44 px. Inputs are 16 px to avoid iOS zoom. There's a skip link, a labelled `nav`, `aside` and breadcrumb landmarks, `aria-pressed` on toggles, `aria-sort` on sorted columns, and an `aria-label` on the favourite button that updates with its state.
- Reduced motion turns off view transitions and every animation or transition, and no state change depends on motion.
- Container queries (`entry`, `weapons`) rather than viewport breakpoints for the entry layout and the table-to-card switch. No page overflows at 360 or 390 px.

## Recommended actions
1. **[High] `/impeccable harden`**: rebuild the palette status/live region (H-2, H-3) and fix favourites focus and announcements (M-5).
2. **[High] `/impeccable layout`**: a shared `--toolbar-h` for scroll padding and the sticky header (H-1, M-1), and wrap filter chips on desktop (H-4).
3. **[Med] `/impeccable adapt`**: the equipment type switch on phones (M-3), whole-card tap targets for table cards (M-4), the 320 px overflow (L-1), and bottom nav state and labels (M-6, L-5).
4. **[Med] `/impeccable polish`**: unify the detail-page components (M-9), extract the shared table script and fix the Cost sort (M-2), segmented pressed state (M-7), previews on badges (M-8), and the remaining Low items. Finish with a type-scale pass (L-4) using `/impeccable typeset`.
