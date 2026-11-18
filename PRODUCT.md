# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Players and DMs running D&D 2024 games, served equally. The main situation is live play: someone at the table needs a rule, weapon or condition and wants the answer before the game loses momentum, often on a phone. DMs also use it between sessions to prep and settle rulings.

## Product Purpose

A fast, searchable reference for the D&D 2024 rules built from the SRD 5.2.1: the Rules Glossary, weapons, weapon properties, weapon masteries, equipment (armor, tools, adventuring gear, mounts and vehicles), plus SRD rules that aren't in the glossary (mounted and underwater combat). Success means someone at the table gets from a question to the correct rule text in seconds and goes back to playing.

It replaces the two earlier sites, `dnd_2024` and `dnd_2024_weapons`.

## Positioning

Three things together set it apart from D&D Beyond and other SRD sites, and future work must protect all three:

- **Speed:** instant global search (Ctrl/⌘+K or `/`), no account, no ads, no paywall.
- **Linked rules:** rules terms inside rule text link to their entries, with a preview on hover (desktop) or tap (touch). Following one rule into the next is a core behaviour, not decoration.
- **Phone at the table:** it is built to be usable on a phone in the middle of a game.

## Operating Context

- Used during live sessions on phones, tablets and laptops, often in a hurry and sometimes with poor signal. The site is an installable PWA that works offline after the first visit.
- Every entry has its own page and URL, so rules can be shared in group chats or at the table.
- Favourites and recently viewed items are stored on the user's device. There are no accounts.
- Hosted on GitHub Pages at `https://jabed-tech.github.io/dnd-2024-reference/`.

## Capabilities and Constraints

- **Content scope: SRD 5.2.1 only.** No rules text from outside the SRD (CC-BY-4.0 licensing). The SRD PDF (`source/SRD_CC_v5.2.1.pdf`) is the source of truth, and data in `src/data/*.json` is generated from it by `scripts/*.py`.
- **More SRD sections are planned** (for example spells, classes, species, monsters). Information architecture, navigation, search and components must scale to more content types without a rebuild.
- Stack: Astro static site with `base: '/dnd-2024-reference'` and trailing slashes. `npm run build` validates data and type-checks. Playwright and axe tests run against the build.
- Current features: global search palette, a page per entry, linked rules terms with previews, sortable and filterable weapons and equipment tables that turn into cards on narrow screens, favourites, recently viewed, light and dark themes (follows the system setting, with a manual toggle), and offline PWA.
- Terminology follows the SRD exactly (Rules Glossary, Weapon Mastery, Weapon Properties, condition names and so on). The UI uses British English ("Favourites", "Licence").

## Brand Commitments

- Name: **D&D 2024 Reference**.
- An unofficial fan project, not affiliated with or endorsed by Wizards of the Coast. The SRD attribution (SRD 5.2.1 by Wizards of the Coast LLC, CC-BY-4.0) must stay visible.

## Evidence on Hand

- Real content: 157 rules, 38 weapons, 10 properties, 8 masteries and 145 equipment items in `src/data/`.
- Audits dated 2026-11-18: `audit/design.md` (design and UX, score 15/20) and `audit/code.md` (code health).
- No user research, usage analytics or testimonials exist. Don't invent any.

## Product Principles

1. **Seconds to the answer.** Every change is judged on whether someone mid-game finds the rule faster or slower.
2. **The rules text is the product.** Show SRD wording faithfully and keep it readable. Chrome and decoration never compete with it.
3. **Follow the thread.** Cross-links and previews let one rule lead to the next without losing your place.
4. **One hand, one phone.** Phone use at the table is a first-class case, not a downscaled desktop.
5. **Built to grow.** New SRD sections should slot into the existing patterns rather than adding one-off pages.

## Accessibility & Inclusion

WCAG 2.2 AA is the working standard: axe checks run in the Playwright suite, and `audit/design.md` tracks the open AA issues (focus hidden behind the sticky toolbar, live region in the search palette). Light and dark themes must both pass contrast.
