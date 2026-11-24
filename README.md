# SwapSetu 3D

A working 3D model of a city battery-swap network, built for
Hacksmart 2.0 (Battery Smart × Geek Room).

## The problem

E-rickshaw and delivery riders run on swappable batteries. When a
battery dies mid-shift, the rider stops earning until they reach a swap
station that has a charged pack and a short queue. Where stations are
placed decides how long that wait is — and the worst-served corner of a
city is easy to miss on a spreadsheet.

## What this does

SwapSetu puts the whole network on one screen as a small 3D city:

- Riders drive around a 7×7 block city and drain their batteries.
- At low charge they head to the nearest station that should have a
  charged pack, queue if they must, swap, and ride on.
- Stations hold 10 packs and recharge slowly, so a busy station can run
  dry at peak hours.
- The time-of-day slider moves demand: morning and evening peaks put
  more riders on the road.
- The panel keeps a live ledger: swaps done, riders served, average
  wait, and the worst-served zone, which is shaded red on the model.
- You can add a station. Click a road junction, and the network changes
  in front of you. Put one in the red zone and the wait falls.

## The model rules (plain and simple)

This is a teaching model, not real Battery Smart data.

- Riding drains 1.15% of a battery per sim-minute.
- At 25% charge a rider seeks a station.
- A swap takes 0.75 sim-minutes. One station serves one rider at a time.
- A station holds 10 packs and recharges one pack every 4 sim-minutes.
- 1 real second is 1 sim-minute at 1× speed.

The point is placement behaviour: queues, dry stations and badly served
zones show up honestly under these rules.

## Run it

No build step, no server needed beyond static files:

```
python3 -m http.server 8000
# open http://localhost:8000
```

Or open `index.html` from any static host. Three.js r160 is vendored in
`vendor/`, so the app works offline and makes no network calls.

## Controls

- **Pause / Resume** and **0.5×–4×** speed buttons
- **Time-of-day slider** — sets the city clock and the demand level
- **Add station** — then click any road junction to place a station
- **View** — tilt or top-down camera; drag to orbit, scroll to zoom
- **Click any green tower** (or its row in the Stations list) for its
  packs, queue, swaps and average wait
- **Reset** — back to the starting six stations

## Tech

- Three.js r160 (vendored module, pinned), vanilla JS modules, no build
- Instanced buildings and pack racks, pooled riders (max 30), capped
  pixel ratio, auto-pause of simulation work when the tab is hidden
- QA: `node qa/smoke.mjs` — headless Chromium drives the real page and
  clicks real buttons (21/21 checks, see `qa/QA_RESULTS.md`)

## Files

- `index.html`, `style.css` — the page (problem → model → solution → outcome)
- `js/app.js` — scene + simulation
- `design/` — design constitution and registry
- `qa/` — interaction inventory, smoke test, results, screenshots
- `DEPLOY.md`, `SUBMISSION_PACK.md` — go-live and filing steps

Solo build by M S Abhishek for Hacksmart 2.0.
