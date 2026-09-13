# Architecture and source adaptation

## Original behavior

The source is a single HTML document: CSS and controls, graph/building data, schedule-driven population, dispatch, vehicle state machines, interactive planning, top-down rendering, perspective rendering, metrics, and startup.

- `BUILDINGS`, `buildingsByType`, `nodeXY`, `adj`, and `edges` connect semantic destinations to pickup nodes.
- `makeHuman` creates randomized worker/student/errand/commuter schedules; `checkSchedules` and `fireEvent` enqueue requests.
- `dispatch` groups requests into same-origin sedan carpools, same-destination shuttle pools, overloaded-origin sweeps, then singles. Multi-stop routes keep ordered pickup/dropoff segments and reserve road edges.
- `dijkstra` respects directed streets and weights congestion; `kShortest` bans selected edges to find route alternatives. Some tree-like suburban routes necessarily share their only exit.
- `stepCars` handles travel, one-rider-per-tick boarding, traffic waits, obstacles and trip completion. Idle cars return to Central Station. Live fleet removal requeues affected requests.
- Auto mode runs schedule demand and random obstacles. Interactive mode pauses the background fleet and follows a selected trip with scripted obstacles and optional narration.
- Top-down maps render buildings, roads, traffic, congestion, waiting counts, routes, obstacles and cars. Driver POV projects the same world geometry into an offscreen Canvas and copies it to the cockpit.
- The 100 ms tick advances simulation time, updates demand/dispatch/vehicles, refreshes UI, records metrics and renders. Debug logs cap at 500 entries; trip history and graph samples are bounded.

## Adaptation

The original center indexing remains, now 7 intersections per side. Additional nodes use explicit coordinates in `extraNodes`. All roads, including curve samples, enter the same graph. Residential buildings have explicit centers, small footprints and nearby road access nodes, so drawing, picking, waiting badges, destinations and POV all agree.

Four separate outward sectors with randomized offsets and gaps avoid overlapping development footprints. Quadratic curves are sampled into traversable segments; dead ends have turning circles. Distance-weighted routing and distance-based vehicle progress prevent short curve segments from artificially slowing cars. One-way streets remain inside the grid, avoiding disconnected suburban access roads.

Six independent view transforms share the same live state. Pointer coordinates are inverted through the selected view before picking a car or building. Only onscreen maps render each tick to limit phone workload. The sidebar cockpit remains based on world coordinates. Native document scrolling and sticky shortcuts replace the original viewport-locked layout.

Canvas backing buffers follow CSS display dimensions multiplied by device pixel ratio, while map coordinates (780 × 780) and POV projection coordinates (640 × 640) stay fixed. Each visible frame checks sizing, so window resizing, browser zoom and monitor density changes redraw at native resolution. The POV buffer matches the cockpit pixel-for-pixel; metrics use the same sizing helper. Unchanged buffers are reused.

Rail is a visual layer, separate from the drivable graph. Passenger-count markers interpolate along it during the ten simulated minutes before each train event; the existing event scheduler injects passengers at arrival. Reset now clears event fired flags and the active banner as well as trips.

## Scope and assumptions

This remains an illustrative simulation, not an engineering traffic or accessibility model. The source's profiles, fleet, pooling strategy, traffic behavior and optional API narration are preserved. Routing still uses a simple Dijkstra queue and approximate alternate paths; “congestion” means route claims, not measured road capacity. Travel timing retains the source's calibration. No external map tiles, backend, geolocation or geographic dataset is needed.
