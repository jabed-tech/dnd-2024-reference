---
version: 1
slug: "src-layouts-appshell-astro"
primary_target: "src/layouts/AppShell.astro"
related_targets: ["src/styles/global.css"]
---

Scope: the whole site shell and every page type (home, glossary index/detail, weapons, masteries, properties, equipment index/detail, favourites, 404, search palette, term previews). Mode: Operate (lookup tool), with Read rules for rule text.

Audience and job: players and DMs mid-game on a phone, and prepping at a desk; both first-class. Get from question to correct SRD text in seconds, follow linked terms, save favourites. Constraints: keep every feature, SRD wording verbatim, WCAG 2.2 AA in both themes, offline PWA, base path /dnd-2024-reference/. User pinned: D&D colour theme — black/red in dark mode, soft white/red in light; keep the fantasy feel; avoid anything that reads as generic SaaS docs. Also fixing audit items 1–8 and 10 (audit/SUMMARY.md); item 9 (data pipeline) later.

## Direction contract

THESIS: Every entry reads like a stat block: small-caps serif title, a tapered red rule, a stat line, then rule text. Refuses both the parchment + Cinzel + gold-ornament fantasy default and the grey docs-site default.

OWN-WORLD: Dark: near-black ground #121012, block surface #1c181b, warm ink #ece6e7, red fill #c8102e, red text-on-dark #ff6b76. Light: soft white ground #f7f4f2, white blocks, near-black ink, red #b0102a. Spectral SC for titles and section heads; a workhorse sans for UI and body. Blocks have a red top edge; dividers are tapered red rules; active nav is a red-tinted fill.

STORY: The visitor searches or taps a section, lands on a stat block, reads the stat line first, then the rule. Linked terms open mini stat-block previews; the star saves it.

FIRST VIEWPORT: 60px header: d20 brand left, search field centre as the primary action (Ctrl K), theme toggle right. 260px rail: Home, Favourites, Rules Glossary categories with counts, Equipment. Main: stat block (max 720px) beside a 300px aside (See also, Recently viewed). Phone: header search, full-width blocks, five-item bottom nav.

FORM: Stat Block, chosen from the safer-register lineup (position 1 of 3); seed: a94f4ea4784ffade. Signature move: stat-block grammar (tapered red rule + stat line) on every entry type, and term previews rendered as mini stat blocks.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
- Item 9 (generator/summary fixes) deferred by the user.
