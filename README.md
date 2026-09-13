# PubTrans — 15 minute city

[Open the simulation](https://jsherman999.github.io/pubtrans_15_minute_city/)

A browser-only autonomous transit simulation adapted from [pubtrans_solved](https://github.com/jsherman999/pubtrans_solved), source commit `77c245254cbefd0a4acf77f18662736988c48592`. Vanilla JavaScript and Canvas, no dependencies or build step.

## The region

- A **6 × 6 block center**, using 7 × 7 intersections. Blocks represent 100 m, so the center is 600 m across. The “15 minute city” label describes the center's scale; the simulation models vehicle trips, not pedestrian accessibility.
- Four neighborhoods with **20 individual residences each**, two winding boulevard branches and four cul-de-sacs per neighborhood.
- Neighborhood positions vary on refresh. Each occupies a different side of the center, with randomized lateral offset and separation from zero (direct connection) to 1,609 m (about a mile). This sector-based placement prevents neighborhoods from overlapping. An entrance road connects each neighborhood to downtown.
- Sedans and shuttles share one connected road graph, serving neighborhood-to-center, center, local neighborhood and cross-neighborhood trips.
- A visible railway runs north from Central Station off the regional map. Numbered rider markers approach before the scheduled 09:00, 11:30 and 13:00 arrivals. Those same events enqueue 12, 10 and 10 actual ride requests at the station.

## Using it

Scroll through the regional overview, city center, and four neighborhood maps. Sticky shortcuts jump between maps and Controls / POV. On desktop, the controls remain in a sidebar; on phones they follow the maps and metrics.

**Auto:** runs immediately at 1×. Change speed, pause/resume, reset the day, adjust population or fleet, and tap a moving vehicle on any map to watch its driver POV. Reset day preserves the geography; refresh randomizes it.

**Interactive:** select the mode in Controls, tap a source building and destination on any maps, then return to Controls / POV and press Plan and Drive. Candidate routes, congestion scoring, obstacles, replanning and driver POV work across the region. A cul-de-sac has only one exit, so some origin/destination pairs have fewer than three distinct routes.

The fleet starts with 28 sedans (4 seats), 14 shuttles (8 seats), and four large purple buses (20 seats each), serving 100 simulated people by default. Individual houses are potential origins/destinations, not one person per house. Worker, student, errand and commuter profiles retain their original schedules; suburban residents also generate neighborhood visits. School/train surges, pooling, boarding one passenger per tick, stoplights, stop signs, one-way streets, automatic depot returns, metrics, and inline/pop-out debug logs are retained.

Optional Anthropic narration still uses the source app's direct browser API call. Paste a key in Settings; it is held in memory and cleared by refresh. Core simulation needs no API key. The optional paid API call is not covered by the automated tests.

## Large neighborhood buses

Each development starts with one dedicated 20-seat bus. Buses get first choice of waiting trips between their assigned neighborhood and any center destination, including schools, workplaces, groceries and Central Station, throughout the day. The oldest eligible request selects inbound or outbound service; each run pools up to 20 riders in that direction. Smaller vehicles handle remaining demand, including local and cross-neighborhood trips.

Fleet & demand has a separate bus count, active count and +/− controls, plus a live breakdown by neighborhood. Added buses go to the least-served neighborhood. Removal reduces the most-served neighborhood first, using an idle bus when possible. Busy buses finish their assigned pickups and dropoffs before leaving the simulation; the panel shows pending retirements. Bus assignments survive Reset day. Purple, larger map vehicles and the driver POV caption identify buses and their assigned development.

## Run locally

Open `index.html` directly, or:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. For regression checks, with Node installed:

```sh
node tests/simulation.cjs
```

The regression harness loads the actual application script with a minimal DOM/Canvas stub. It checks 12 randomized worlds for home counts, distance bounds, directed connectivity, local and cross-region routes, road-only vehicle positions, capacity limits, completed trips, train events and reset. Browser checks separately cover mobile rendering and interactive route selection.

## GitHub Pages

Publish the repository's `main` branch, `/ (root)`, in Settings → Pages. `.nojekyll` keeps this a plain static site. No secrets, server, package install or build workflow is required.

## Implementation

All runtime code is in `index.html`. See [ARCHITECTURE.md](ARCHITECTURE.md) for the source app's subsystems and adaptation details.
