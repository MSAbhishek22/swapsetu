# SwapSetu 3D — Design Constitution

Project: SwapSetu 3D — a working 3D model of a city battery-swap network,
built for Hacksmart 2.0 (Battery Smart × Geek Room, EV-mobility theme).
Date: 24 Nov 2026.

## Design research (inspected 24 Nov 2026, before any build)

1. **threeui.com** — Three.js component/template library. Inspected the
   catalogue structure: components are grouped by page section (hero,
   features, how-it-works) and each is a self-contained, explorable 3D
   scene rather than a decoration. Learning: the 3D scene must BE the
   product surface, not a banner behind text. SwapSetu's city is the app.
   Not copied: their dark shader-heavy look and template layouts.
2. **dark.design** — dark-theme gallery (Railway, xAI, Linear, Vercel…).
   Inspected the listing grid: near-black surfaces, one accent colour,
   dense small-type labelling. Learning: restraint reads as confidence;
   a data tool earns trust with quiet surfaces and honest labels.
   Not copied: SwapSetu deliberately goes LIGHT (see identity below) —
   the lesson taken is restraint, not the dark palette.
3. **minimal.gallery** — hand-picked minimal sites, one strong idea per
   site, category browsing, generous whitespace. Learning: one motif,
   repeated calmly, beats five competing ideas. SwapSetu's single motif
   is the miniature model table.
4. **land-book.com** — landing-page gallery (Baseten, ElevenLabs…).
   Inspected the landing listings: strong first screen, then proof.
   Learning: the page must state the problem in the first screen and
   show the working thing immediately — no long scroll before the app.
5. **godly.website** — design-inspiration gallery (text fetch limited;
   inspected its gallery structure and curation model). Learning:
   curated, editorial presentation — treat the project page like a
   broadsheet, not a dashboard template.

## Identity — "The Model Table"

A city planner's miniature diorama sitting on a warm workbench, with a
broadsheet wrapped around it. The page reads like a well-set newspaper;
the app reads like a physical model you can walk around.

- **Metaphor:** a scale model of a city on a table — you lean over it,
  turn it, point at a tower, add a tower.
- **Palette (light, warm, print-like):**
  - Paper `#f5efe2`, panel `#fffdf6`, ink `#1d2733`
  - Battery green `#1e9e57` (charged / go), amber `#dd8a00` (busy),
    red `#cf4444` (starved zone), road asphalt `#3c4148`
  - No gradients as decoration, no glassmorphism, no glowing blobs.
- **Type:** Georgia (system serif) for the masthead and section heads —
  broadsheet voice; system sans for UI and data; tabular numerals for
  every figure so the ledger columns line up.
- **Layout:** masthead hero (problem, in plain words) → the model table
  (app, full width, framed like a physical model with a soft shadow) →
  "How a swap works" three plain steps → "What the model shows" live
  outcome ledger → footer with honest limits.
- **Motion:** quiet. Panels fade/slide 160 ms; camera eases; nothing
  loops for decoration. `prefers-reduced-motion` disables smooth
  scrolling and camera easing.
- **3D treatment:** soft daylight diorama — warm rooftops, pale roads
  grid, green-glowing swap towers, tiny riders as coloured beads with a
  battery bar each. Time-of-day slider warms/cools the scene light as
  well as the demand. Distinct from Night Touge (night, first-person,
  amber/mono) and from the fleet's dark dashboards.

## Rules this build must keep

- Every visible control works. No placeholder buttons, no dead sliders.
- The simulation is a simple, stated model — the README and the page
  say plainly that numbers come from this model, not from real
  Battery Smart data.
- Stats shown on the page are the sim's real numbers, updated live.
- Keyboard/screen-reader path exists for every 3D action (station list
  mirrors 3D clicking; buttons for camera views).
- Performance: instanced buildings, pooled riders, capped counts,
  pixel-ratio cap, auto-pause when the tab is hidden.
