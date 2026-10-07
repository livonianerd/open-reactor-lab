# OpenReactorLab v1.5.0

Level-one public educational reactor concept explorer. MIT licensed, dependency-free browser application with five concepts: PWR, BWR, historical RBMK, liquid-fuel MSR with conceptual freeze plug, and pebble HTGR.

**Educational simulation only. Not a reactor design, licensing, safety-analysis, operational, or engineering tool.**

## Run locally

Use Node.js 22+ and Python 3. Run `npm test`, `npm run build`, and `npm start` from this folder. Open http://localhost:8080. No npm installation is required because there are no dependencies. ES modules require an HTTP server, rather than double-clicking index.html.

## GitHub Pages

Live app: https://livonianerd.github.io/open-reactor-lab/

Repository: https://github.com/livonianerd/open-reactor-lab

Pushes to `main` run the tests, build the static site, and deploy `dist/` through the GitHub Actions Pages workflow. Pull requests run the same checks without deploying. The app uses relative asset URLs so it works under the repository subpath. You can also redeploy from Actions → Test and deploy Pages → Run workflow.

## Try an experiment

Select a concept, set power/cooling/heat sink/shutdown delay, and inject station blackout. Enable comparison to see all five simulations with identical controls and clock. Pause, reset, change playback speed, manually shut down, or export the sampled histories as CSV. Changing model parameters resets all runs; changing the displayed concept does not. Failures persist until reset; clicking another failure adds it to the active set. A manual shutdown always works as a teaching intervention, even in the automatic shutdown-unavailable scenario.

## Model scope

All temperatures, capacities, feedback terms, decay curves, and times are arbitrary teaching indices. No physical calibration or validation is claimed. The model uses fixed one-second steps and simple heat storage/removal. Fission power approaches a demand target; illustrative temperature/void feedback modifies the target. Shutdown drives that target to zero while a small diminishing residual heat term remains. Powered forced flow, inventory, a passive contribution, and sink availability affect heat removal. A conceptual MSR drain moves the heat source to a separately tracked tank. The drain may be disabled, and losing the sink prevents both core and tank heat removal.

Preset differences illustrate ideas, not predictions or safety rankings. The PWR, RBMK and BWR presets have a fictional meltdown state at temperature index 3, with a persistent damaged-core visual and a teaching shutdown that leaves residual heat. This threshold does not correspond to real fuel damage or licensed operating limits. There is no Chernobyl accident reenactment, neutron transport, criticality, enrichment, fuel loading, component sizing, radiation release, or engineering output. Initial core index is 1 and power starts at zero, so startup includes an illustrative transient. The chart retains up to 1,200 five-second samples per concept; CSV exports those retained samples. The CSV active_failures column records the failures present at each sample, separated by |, while the on-screen event timeline records injection times.

## Sources for qualitative concepts

- NRC Reactor Concepts Training Course: https://www.nrc.gov/sites/default/files/doc_library/cdn/legacy/reading-rm/training/reactor-concepts-training-course.pdf
- NRC Chernobyl background: https://www.nrc.gov/regulations-legislation/fact-sheets-brochures/backgrounder-on-chernobyl-nuclear-power-plant-accident
- DOE high-temperature gas reactor overview: https://www.energy.gov/ne/articles/nuclear-101-what-high-temperature-gas-reactor
- Freeze valve operating experience and reliability: https://doi.org/10.1016/j.nucengdes.2020.110803

These sources support the explanations, not the invented numerical coefficients. Actual passive capabilities, containment, and accident responses vary by design.

## Contributing

The pure simulation engine is in `src/engine.js`; rendering and controls are in `src/app.js`. Add regression tests for model changes and document new assumptions. Keep user controls at public educational level. `npm test` checks bounded finite outcomes, shutdown residual heat, injection-relative delays, drain failure, lost heat sink, and deterministic replay.

## Interactive interventions

Select RBMK and click **RBMK: meltdown demo** to reset all runs with power at 100%, cooling and sink at 0%, passive systems off, and shutdown unavailable at 100× playback. The RBMK reaches its fictional damage threshold automatically; cooling or shutdown afterward cannot erase damage. Reset clears it. This is not a reconstruction of Chernobyl.

Select MSR and click **MSR: force open drain plug** to immediately move fuel into the drain tank and initiate shutdown. This teaching override works even with passive systems disabled or the drain-unavailable scenario selected. It affects only the MSR and works while paused. Watch the drain temperature: opening the plug does not eliminate heat.


Version 1.3.0 uses visible buttons for reactor concepts and failure selection. The six one-click experiment buttons are always visible and select their reactor automatically. Clicking a failure button immediately adds it; click additional buttons to combine failures. The MSR override does not reset runs.

**BWR: Fukushima-inspired demo** resets all runs with reference power already present, immediately initiates shutdown, and removes backup power and heat-sink availability after 20 teaching seconds. Residual heat then reduces an invented coolant inventory and raises the temperature index; BWR damage persists until reset. Timing, boil-off coefficients, and the damage threshold are fictional, not an accident reconstruction. No hydrogen explosions or releases are modeled. Qualitative context: [NRC Fukushima overview](https://www.nrc.gov/reactors/power/atf/roadmap/origins) and [Japan Ministry of Environment accident sequence](https://www.env.go.jp/en/chemi/rhm/basic-info/2018/06-01-03.html).


Version 1.3.0 adds a large persistent meltdown banner, a cracked-vessel / molten-core illustration, and overheating warnings for every concept. PWR now also has the fictional index-3 damage threshold; The pebble reactor indicates that meltdown is not modeled; the molten salt reactor now models vessel and drain-tank damage separately. Explosions are not simulated and the damage graphic is symbolic. **Chernobyl-inspired scenario (RBMK)** selects RBMK and starts a fictional loss-of-cooling / positive-feedback demo with shutdown at the damage threshold. It does not reproduce historical operating actions or accident physics.


Version 1.3.0 adds **MSR: drain safety demo** and **Pebble HTGR: failure attempt**, both starting a blackout at 10× with passive cooling and the heat sink available. The MSR plug opens automatically at 20 teaching seconds; a ten-second illustrative transfer fills the drawn drain tank. A green “Safe state” status requires completed transfer, shutdown, low temperatures, and available cooling. The pebble demo displays TRISO pebbles, a passive heat-removal path, and “Overheating avoided in this simulation” once shutdown and cooling satisfy the teaching checks. These statuses are recalculated and disappear if protection conditions fail, including loss of heat sink. Reset clears the run. Pebbles produce heat; this is not an unconditional no-meltdown guarantee. Qualitative context: [DOE pebble reactor explanation](https://www.energy.gov/ne/articles/x-energy-developing-pebble-bed-reactor-they-say-cant-melt-down).


## Combining failures (v1.4.0)

Click buttons under **Add failures · click to combine**. For example, click **MSR drain unavailable**, then **Station blackout**, then **Loss of heat sink**. All remain active, appear above the diagram with injection times, and apply to every comparison run. Repeat clicks are harmless and do not reset timers. Reset, parameter changes, or **Start a fresh demo** start a new run; selecting a reactor does not.

Fukushima's flood delay runs from its own injection time. Adding another failure does not delay pending shutdown or automatic drainage. Shutdown unavailable blocks future automatic shutdown requests, including Fukushima, but cannot undo a completed shutdown. Manual shutdown and the explicit manual drain override remain available. A drain fault added after opening cannot close the plug or move fuel back. CSV rows preserve the failure set at sample time.


Version 1.4.2 explains why fission power falls: automatic shutdown, manual intervention, drainage, the fictional damage shutdown, or temperature feedback without shutdown. Tiny nonzero values display as <0.05% instead of rounding to 0.0%. Shutdown unavailable prevents future automatic shutdown; it does not undo an earlier shutdown or disable temperature feedback or the drain. Pebble and molten-salt presets have overheating warnings but no damage model. Residual heat is currently added only after a recorded shutdown, so feedback-only heat behavior is incomplete and must not be read as proof of safety.


## Molten salt vessel and drain tank damage (v1.5.0)

Both the reactor vessel and a fuel-containing drain tank show overheating at index 2 and persistent fictional damage / loss of fuel containment at index 3. They have independent graphics, gauges, timestamps, comparison entries, and CSV damage columns. Damage prevents a green safe-state banner even after cooling or later drainage; Reset clears it. These are illustrative damage flags, not a leakage, release, or structural model. Damage itself does not initiate a shutdown.

To demonstrate vessel damage, start a fresh run, select Molten salt reactor, and add Shutdown unavailable, Molten salt reactor drain unavailable, and Loss of heat sink before shutdown or drainage occurs. For tank damage, run the drain safety demo and add Loss of heat sink; residual heat gradually heats the tank. Set 100× to watch this longer transient. Opening the drain cannot repair prior vessel damage.
