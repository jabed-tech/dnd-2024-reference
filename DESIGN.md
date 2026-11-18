---
name: D&D 2024 Reference
description: A fast, linked SRD 5.2.1 rules reference where every entry reads like a stat block.
colors:
  red-fill: "#c8102e"
  red-fill-hover: "#a60d26"
  on-red: "#ffffff"
  red-text: "#b0102a"
  red-text-dark: "#ff6b76"
  red-text-strong: "#8c0b20"
  red-text-strong-dark: "#ff8f97"
  red-line: "#c8102e"
  red-line-dark: "#d8283f"
  red-soft: "#fbe7ea"
  red-soft-dark: "#3a1a20"
  selection: "#f6c9d0"
  selection-dark: "#5a1f2a"
  ground: "#f7f4f2"
  ground-dark: "#121012"
  block: "#ffffff"
  block-dark: "#1c181b"
  surface-2: "#f1ecea"
  surface-2-dark: "#241f22"
  surface-3: "#e8e1de"
  surface-3-dark: "#2c2629"
  chrome: "#ffffff"
  chrome-dark: "#0b0a0b"
  border: "#e4dcd9"
  border-dark: "#2e272a"
  border-strong: "#cbbfbc"
  border-strong-dark: "#4a3f43"
  ink: "#1a1517"
  ink-dark: "#ece6e7"
  ink-muted: "#5b5154"
  ink-muted-dark: "#b9adb0"
  ink-faint: "#6f6468"
  ink-faint-dark: "#9d9094"
typography:
  display:
    fontFamily: "'Spectral SC', 'Palatino Linotype', Georgia, serif"
    fontSize: "2.07rem"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "0.01em"
  headline:
    fontFamily: "'Spectral SC', 'Palatino Linotype', Georgia, serif"
    fontSize: "1.44rem"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "0.01em"
  title:
    fontFamily: "'Spectral SC', 'Palatino Linotype', Georgia, serif"
    fontSize: "1.2rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "'Atkinson Hyperlegible Next Variable', 'Atkinson Hyperlegible', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  prose:
    fontFamily: "'Atkinson Hyperlegible Next Variable', 'Atkinson Hyperlegible', system-ui, sans-serif"
    fontSize: "1.04rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "'Atkinson Hyperlegible Next Variable', 'Atkinson Hyperlegible', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.45
  caption:
    fontFamily: "'Atkinson Hyperlegible Next Variable', 'Atkinson Hyperlegible', system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.6
rounded:
  s: "4px"
  m: "8px"
  l: "10px"
  pill: "999px"
spacing:
  2xs: "0.25rem"
  xs: "0.5rem"
  s: "0.75rem"
  m: "1rem"
  l: "1.5rem"
  xl: "2.25rem"
  2xl: "3.5rem"
components:
  button:
    backgroundColor: "{colors.block}"
    textColor: "{colors.ink}"
    rounded: "{rounded.m}"
    padding: "0 1rem"
    height: "2.75rem"
  button-hover:
    backgroundColor: "{colors.surface-2}"
  button-primary:
    backgroundColor: "{colors.red-fill}"
    textColor: "{colors.on-red}"
    rounded: "{rounded.m}"
    padding: "0 1rem"
    height: "2.75rem"
  button-primary-hover:
    backgroundColor: "{colors.red-fill-hover}"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.m}"
    size: "2.75rem"
  chip:
    backgroundColor: "{colors.block}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 0.75rem"
    height: "2.5rem"
  chip-pressed:
    backgroundColor: "{colors.red-fill}"
    textColor: "{colors.on-red}"
  segmented-pressed:
    backgroundColor: "{colors.red-fill}"
    textColor: "{colors.on-red}"
    rounded: "5px"
    height: "2.3rem"
  badge:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.s}"
    padding: "0.05rem 0.5rem"
  badge-red:
    backgroundColor: "{colors.red-soft}"
    textColor: "{colors.red-text}"
  input:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.m}"
    height: "2.75rem"
  block:
    backgroundColor: "{colors.block}"
    textColor: "{colors.ink}"
    rounded: "{rounded.l}"
    padding: "1.5rem"
  nav-link-active:
    backgroundColor: "{colors.red-soft}"
    textColor: "{colors.red-text}"
    rounded: "{rounded.m}"
    height: "2.4rem"
  search-trigger:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.m}"
    height: "2.6rem"
---

# Design System: D&D 2024 Reference

## Overview

**Creative North Star: "The Stat Block"**

Every entry in this reference is set the way a rulebook sets a monster or item: a small-caps serif title, an italic subtitle naming what kind of thing it is, a tapered red rule, a line of red-labelled stats, and then the rule text. That grammar is not reserved for one page type. Weapons, conditions, glossary terms, equipment and even the hover preview of a linked term all open the same way, so a reader at the table learns the shape once and finds the answer in the same place every time.

The palette is two colours doing all the work: a warm near-black and soft white for ground and ink, and one red that carries every signal. The world refuses both the parchment-and-gold fantasy default (no textures, no Cinzel, no ornament) and the grey docs-site default (the red rule and the serif titles make it unmistakably a rulebook). Density is high and calm: rows, tables and leader-dotted lists rather than tiles, with one sans for everything a hand touches and the serif kept for titles and section heads.

Dark and light are equal citizens. Every surface and text token is a `light-dark()` pair; the theme follows the system setting with a manual toggle that pins `data-theme`.

**Key Characteristics:**
- Stat-block grammar on every entry: title, italic subtitle, tapered red rule, stat line, rule text.
- One red, split into a fill role (white text on it) and a text role (tuned per theme for contrast).
- Spectral SC small-caps for titles and section heads only; Atkinson Hyperlegible Next for everything else.
- Blocks carry a 3px red top edge; dividers are tapered red rules; leaders are dotted.
- Flat, bordered surfaces; shadows only on things that float (palette, term preview).
- SVG stroke icons only.

## Colors

A warm near-neutral ground with a single red that is either a fill or a voice, never decoration.

### Primary
- **Rulebook Red, fill** (`red-fill`): the one solid red. Primary buttons, pressed chips and segmented options, the brand d20 tile, the search tab on the phone nav, the selected palette result's kind icon, the skip link. Identical in both themes and always carries white (`on-red`) text. Hover deepens to `red-fill-hover`.
- **Rulebook Red, text** (`red-text` / `red-text-dark`): red used as type on the page ground. Links, stat labels (`dt`), table headers, panel titles, letter headings, list markers, active nav text, icons that mark a primary action. Lifted to a coral in dark mode so it reads on near-black. `red-text-strong` is its hover.
- **Rule Line** (`red-line` / `red-line-dark`): the red of strokes, not text: the tapered rule, the 3px top edge of blocks, link underlines on linked terms, chip and pager hover borders.
- **Red Wash** (`red-soft` / `red-soft-dark`): a faint red tint for active nav fill, red badges, sort-button state, the selected palette result, the `:target` highlight on a jumped-to paragraph.

### Neutral
- **Ground** (`ground` / `ground-dark`): the page itself, soft white or near-black. Also the inset background of text inputs.
- **Block** (`block` / `block-dark`): the surface of every stat block, panel, row list, table cell and card.
- **Recess** (`surface-2`, `surface-3`): hover rows, table header band, zebra rows, segmented track, palette footer; `surface-3` for pressed icon buttons.
- **Chrome** (`chrome` / `chrome-dark`): the sticky header and bottom nav, a step lighter or darker than the ground so the frame separates from content.
- **Hairline** (`border`) and **Edge** (`border-strong`): 1px dividers between rows and around blocks; the stronger edge for inputs, buttons, floating surfaces and dotted leaders.
- **Ink** (`ink`), **Muted Ink** (`ink-muted`), **Faint Ink** (`ink-faint`): body text, secondary text (subtitles, summaries, counts), tertiary (placeholders, field icons, counts in nav).

### Named Rules
**The Two Reds Rule.** Red is either a fill with white text on it (`red-fill`, same in both themes) or text/stroke on the ground (`red-text`, `red-line`, tuned per theme). Never put `red-text` on `red-fill`, and never use `red-fill` as text colour.

**The Signal-Only Rule.** Red marks structure and state: rules, top edges, labels, links, the active and pressed state. Body copy, summaries and surfaces stay neutral.

## Typography

**Display Font:** Spectral SC 600/700 (self-hosted via @fontsource; fallback Palatino Linotype, Georgia, serif)
**Body Font:** Atkinson Hyperlegible Next Variable (self-hosted; fallback Atkinson Hyperlegible, system-ui)

**Character:** A small-caps book serif for the names of things, a legibility-first sans for reading and tapping. The serif sets the rulebook register; the sans keeps a phone at the table readable.

Sizes are a fixed rem scale at a 1.2 ratio (`0.75 / 0.875 / 1 / 1.2 / 1.44 / 1.73 / 2.07rem`). At 48rem viewport width and up the two top steps grow (step 3 to 1.9rem, step 4 to 2.5rem); nothing is fluid.

### Hierarchy
- **Display** (Spectral SC 600, 2.07rem stepping to 2.5rem, 1.12): page and entry `h1`. The home title runs one step smaller on phones and 1.15x larger on desktop.
- **Headline** (Spectral SC 600, 1.44rem, 1.12): section `h2`, sticky A to Z letter headings (in red), rule-index entry titles.
- **Title** (Spectral SC 700, 1.2rem, 1.3): prose `h3` (red), definition-item heads, mastery names, the "About armor" disclosure title. Panel titles and table headers use the serif at 0.95 to 1.05rem, 700, in red.
- **Body** (Atkinson 400, 1rem, 1.6): UI and summaries. **Prose** (1.04rem, 1.7) for rule text, capped at 70ch.
- **Label** (Atkinson 700, 0.875rem): stat labels, glance labels, footer and counts. Row titles are 700 at 1.02rem in the sans, not the serif.
- **Caption** (Atkinson 700, 0.75rem): badges, bottom-nav labels, kbd, palette footer.
- Entry subtitles are the body sans in italic, muted.
- All numerals in stats, tables, counts and badges use tabular figures.

### Named Rules
**The Serif Names Things Rule.** Spectral SC sets titles, section heads, table headers, panel titles and the brand. It never sets body text, buttons, chips, inputs or row names.

## Layout

A sticky 3.75rem header (brand left, search centre on desktop, actions right) sits over a two-column shell from 60rem: an 18.5rem sticky sidebar with grouped nav and counts, and a main column capped at 82rem (72rem below). A panel toggle left of the brand (or the `[` key) collapses the sidebar to a 4.25rem icon rail: labels, counts and group headings become visually hidden (still named for assistive tech, shown as hover titles), groups are divided by hairlines, and the main column widens to 96rem. The state is stored per device and applied before first paint; the sidebar's scroll position persists across page loads. Navigation runs through Astro's ClientRouter: links swap the page in place (hover-prefetched), the header, search dialog and term preview persist, and only the main column animates (old content out in 90ms, new content fades and lifts 6px in 200ms on an exponential ease-out; none under reduced motion). On the glossary index the sidebar's category links filter the list in place with a 170ms settle instead of navigating. Under 60rem the rail and header search go away and a fixed 4rem five-tab bottom nav appears, with the search tab filled red as the phone's primary action. Gutter is 1rem, 2rem from 48rem.

Entry pages sit in an inline-size container. The stat block fills up to 64rem and grows when the sidebar collapses; when the container reaches 56rem a 17 to 21rem side column (See also, Recently viewed, related lists) joins on the right and scrolls with the page rather than in its own pane. Rule text holds a 70ch measure.

Reference tables sit in their own inline-size container and collapse to a grid of cards (min 17rem) below 46rem container width. Chip rows wrap where there is room and scroll sideways with a faded trailing edge under 48rem. Spacing follows a fixed scale (`2xs` 0.25rem to `2xl` 3.5rem); `l` (1.5rem) separates blocks and `2xl` separates sections.

Touch targets are at least 2.5rem, and 2.75rem for buttons, inputs, leader-list links and section links.

## Elevation & Depth

Flat by default. Depth comes from tonal steps (ground, block, recess, chrome) and 1px borders. Shadows are reserved for surfaces that float over the page.

### Shadow Vocabulary
- **Float** (`--shadow-lg`: `0 24px 56px -14px`, ink at 0.32 light / black at 0.75 dark): the search palette and term preview popover.
- **Bottom-nav lift** (`0 -6px 18px -12px rgb(0 0 0 / 0.35)`): the phone tab bar only.
- `--shadow-sm` and `--shadow-md` are defined but unused in the build.

### Named Rules
**The Only-Floaters-Cast Rule.** A surface gets a shadow only if it sits above the page (dialog, popover, fixed nav). Blocks, cards and rows are bordered, never shadowed.

## Shapes

Soft but not rounded: 4px for badges, kbd, A to Z keys and focus rings; 8px for buttons, inputs, nav links and palette rows; 10px for blocks, row lists, tables, cards and floating surfaces; pills only for chips, the back button and count bubbles. The two signature forms are the **tapered rule**, a red bar clipped to a triangle (`polygon(0 0, 100% 50%, 0 100%)`) that thins to a point, and the **red top edge**, a 3px `red-line` border-block-start on an otherwise 1px-bordered block. Leader rows draw a dotted rule between a name and its right-aligned label.

## Components

### Buttons
- **Shape:** gently rounded (8px), 2.75rem tall, 1rem side padding, sans 700.
- **Default:** block surface, `border-strong` edge, ink text; hover moves to `surface-2` with a `ink-faint` edge.
- **Primary:** `red-fill` with white text; hover `red-fill-hover`.
- **Icon button:** 2.75rem square, transparent, muted ink; hover `surface-2` and ink; active `surface-3`.
- **Back button:** a pill default button, centred, with a red chevron that nudges 3px left on hover.
- **Focus (everything):** 2.5px `focus` outline (the red text colour) at 2px offset.

### Chips & Segmented
- **Chip:** pill, 2.5rem tall, block surface with hairline border, sans 600 at 0.9rem, optional muted count. Hover turns border and text red. Pressed or current: solid `red-fill`, white text.
- **Segmented:** a `surface-2` track with 3px inset; options are transparent muted text; the pressed option is `red-fill` with white text.

### Badges
Small 4px-radius tags in the 0.75rem bold sans. Neutral (recess with hairline), red (red wash, red text) and outline (transparent, `red-line` border, red text).

### Stat Block (signature)
The entry head: breadcrumbs, a Display `h1`, an italic muted subtitle, the tapered rule, then the **stat line**: a wrapping row of label/value pairs, labels in bold red, values tabular in ink, linked values underlined in `red-line`. Rule text follows as prose: red `h3`s, red list markers, a leading bold run-in head in red, linked terms underlined in `red-line` (1.5px, 2px on hover). A jumped-to paragraph takes a red-wash highlight.

### Blocks / Panels
- **Corner Style:** 10px. **Background:** block. **Border:** 1px hairline with a 3px `red-line` top edge.
- **Internal Padding:** 1.5rem (1rem in the side column, where only the accented panel keeps the red top edge).
- **Panel title:** serif 700 in red, optional icon.

### Leader Lists
Home contents and side-column lists: each link is a 2.5 to 2.75rem row with a hairline under it, the name in ink, a dotted `border-strong` leader filling the gap, and a muted right-aligned label in tabular figures. Hover turns the row red; the current item is red, extra bold, with a small red dot.

### Row Lists
Dense index rows inside one bordered 10px list: bold sans title with badges, a muted summary below, the favourite star at the end. The whole row is the link target; hover recesses the row; keyboard focus outlines the whole row.

### Reference Tables
Weapons and equipment tables with a sticky header pinned under the app header: `surface-2` band, 3px red top edge, serif red headers, sort buttons that take a red wash when active. Body rows are block surface with hairline separators and recess on hover; numbers right-aligned and tabular. Under 46rem container width each row becomes a card with a red top edge, the whole card linking to the entry, stat labels rendered in red before values, and the star pinned top-right. A per-kind "About ..." disclosure block above the equipment table opens to the SRD rule text, its chevron rotating 90 degrees.

### Inputs / Fields
- **Style:** 2.75rem, 8px radius, `border-strong` edge, ground background (inset against the block), 1rem text, leading muted icon.
- **Hover:** edge darkens to `ink-faint`. **Focus:** border and 0-offset outline in the focus red.

### Search
- **Trigger:** a 2.6rem recessed field with a red search icon and a kbd hint (hidden on coarse pointers). On the phone home page it grows to 3.4rem with a 2px red edge.
- **Palette:** a modal dialog up to 44rem wide under the header, 10px radius, red top edge, Float shadow, dimmed backdrop, 200ms drop-in. Input row with red icon and a red-wash count bubble, filter chips, results with a kind-icon tile, title with highlighted match, one-line summary and badge. The selected result takes a red wash and its kind tile turns `red-fill`. Under 40rem it becomes full screen.

### Term Preview
A popover rendered as a mini stat block: up to 22rem, red top edge, Float shadow, serif title, italic muted kind line, a hairline, the summary, then a full-width `red-fill` "open" button. Enters with a 4px rise over 160ms.

### Navigation
- **Sidebar:** serif red group headings; links are 2.4rem, muted sans 500 with icon and count; hover recesses; current is red wash with red bold text. Collapsed, it is an icon rail of 2.75rem centred targets with the same current-state wash.
- **Bottom nav (under 60rem):** five equal tabs, icon over a 0.75rem bold label. Active tab is red with a 2rem red bar on its top edge and a heavier icon stroke. The search tab's icon sits in a filled red circle.
- **Header:** chrome surface, hairline bottom border, and a tapered red rule (3px, up to 48rem long) running along its lower edge.

## Do's and Don'ts

### Do:
- **Do** open every entry type, including previews, with the stat-block grammar: serif title, italic subtitle, tapered rule, stat line, then prose.
- **Do** keep red to its two roles: `red-fill` with white text, or `red-text` / `red-line` on the ground.
- **Do** give blocks a 1px border with a 3px red top edge and a 10px radius; keep them shadowless.
- **Do** use dotted leaders for name/value lists and tabular figures for every number.
- **Do** define every new colour as a `light-dark()` pair and check both themes.
- **Do** use inline SVG stroke icons (24px grid, `currentColor`).
- **Do** keep touch targets at 2.75rem for buttons, inputs and list links.

### Don't:
- **Don't** put a kicker or eyebrow label above a heading; the italic subtitle goes under the title.
- **Don't** add coloured side stripes to cards, rows or callouts; the red accent edge is always the top edge.
- **Don't** use emoji or text glyphs as icons.
- **Don't** reintroduce parchment textures, gold, Cinzel or ornamental fantasy dressing.
- **Don't** set body text, buttons, chips or row names in Spectral SC.
- **Don't** shadow a surface that does not float.
- **Don't** make the filter toolbar sticky; tables pin their own header instead.
