# SUBMISSION PACK — SwapSetu 3D for Hacksmart 2.0

## Event facts (verified 24 Nov 2026, official Unstop listing)

- **Event:** Hacksmart 2.0 — Battery Smart × Geek Room
- **Registration deadline:** 15 Dec 2026, 23:59 IST (free, ₹0)
- **Teams:** 1–4; individual registration explicitly welcome
- **Prize:** ₹1,00,000 cash (₹50,000 / ₹30,000 / ₹20,000) + PS5 + GTA VI
  special prize + ₹20,000 Amazon vouchers + pre-placement interviews
- **Judging:** jury-scored (innovation, technical implementation,
  feasibility, scalability, industry relevance); top 5 pitch to a jury
- **Format:** register → profile shortlist → online idea round
  (Jan 2027) → offline finale 6–7 Feb 2027, Battery Smart office,
  Sector 62, Gurugram
- **Official page:** https://unstop.com/hackathons/hacksmart-20-geek-room-1799091

## Project identity

- **Name:** SwapSetu 3D
- **One line:** A working 3D model of a battery-swap city — riders
  drain, queue and swap live, and you fix the worst-served zone by
  placing a station yourself.
- **Theme fit:** EV mobility — battery swapping is Battery Smart's own
  domain; the project is about swap-network placement, not a generic
  dashboard.

## Description (paste-ready, plain words)

> SwapSetu 3D is a working model of a city battery-swap network, built
> in Three.js. Riders drive a small 3D city and drain their batteries.
> At low charge they travel to the nearest station with a charged pack,
> queue if it is busy, swap, and ride on. Stations hold ten packs and
> recharge slowly, so at peak hours a busy station can run dry.
>
> A time-of-day slider drives demand — morning and evening peaks put
> more riders on the road. A live ledger tracks swaps, riders served
> and average wait, and the worst-served zone is shaded red on the
> model. The planner can add a station at any road junction and watch
> the wait fall. It turns station placement — the real cost decision
> in a swap network — into something you can test in seconds.
>
> The model is honest about what it is: a simple teaching model with
> stated rules (drain, swap time, recharge time), not real operator
> data.

## Links (fill after DEPLOY.md steps)

- Live app: `____________` (expected https://msabhishek22.github.io/swapsetu/)
- GitHub repo: `____________` (expected https://github.com/MSAbhishek22/swapsetu)
- Demo video (recorded from the live URL): `____________`
- Registration confirmation / team ID: `____________`

## Evidence on hand

- QA: 21/21 automated checks in headless Chromium against the real
  page (qa/QA_RESULTS.md), including real mouse clicks for tower
  selection and station placement; 0 console errors.
- Screenshots: qa/smoke-app.png (landing), qa/smoke-model.png (model
  mid-simulation, queue forming at Station E).
- Three.js proof: `grep "from 'three'" js/app.js` → import present;
  `grep -c "THREE\." js/app.js` → 79; vendored r160,
  sha256 starts 76dea8151bc9352a (same pinned build as Night Touge).

## Release-gate status (blueprint Part V)

- Research + design constitution: DONE (design/)
- Functional build + meaningful 3D: DONE (the sim is the product)
- QA (every control works): DONE (qa/INTERACTION_INVENTORY.md)
- Live HTTPS deployment: PENDING — DEPLOY.md step 2 (user's browser)
- GitHub / deployed commit match: PENDING — DEPLOY.md step 1
- Demo video from live deployment: PENDING — DEPLOY.md step 3
- Registration: PENDING — DEPLOY.md step 4 (deadline 15 Dec 2026)

**Overall status: INCOMPLETE — build and QA complete; deployment,
video and registration are the exact remaining steps in DEPLOY.md.**
