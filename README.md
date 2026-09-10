# EV Battery Sim

[한국어](README-KR.md) · [Research corpus](https://github.com/JTech-CO/EV-Battery-Research/)

**EV Battery Sim** is a static browser simulator built from the public research/data package in `JTech-CO/EV-Battery-Research`. It couples a source-based OCP/stoichiometry layer with an explicit reduced-order electrical model, lumped thermal balance, pack topology, vehicle longitudinal dynamics, and the EPA US06 speed schedule.

It is intentionally **not** presented as a DFN/P2D solver, OEM digital twin, safety certification tool, or validated lifetime predictor. The UI distinguishes source-derived quantities from engineering priors.

## What is implemented

- About:Energy NMC111/graphite 12.5 Ah pouch and LFP/graphite 2 Ah 18650 presets
- Source OCP fits, stoichiometric windows, voltage limits, heat-capacity inputs, and selected structural/electrolyte metadata
- Two-RC Thevenin polarization model with explicit engineering-prior resistance and C-rate limits
- Lumped cell thermal balance with irreversible/reversible heat diagnostics and a convective cooling boundary
- Configurable `Ns × Np` pack with pack-power-to-cell-current coupling and voltage/current limits
- EPA US06 1 Hz / 601-point prescribed speed schedule and configurable longitudinal vehicle load model
- Constant pack-power and constant cell-C-rate experiments
- NMC public 1C reference-curve comparison with RMSE and maximum absolute voltage error
- Exploratory SOH and lithium-plating risk indicators. These are screening priors, not calibrated degradation predictions
- Korean/English UI, responsive desktop/tablet/mobile layout, timeline playback, and CSV/JSON export
- Depth-rendered cell layers and a drag-rotatable 3D pack topology visualization

## Model chain

```text
source OCP + stoichiometry
          |
          v
2-RC terminal-voltage approximation
          |
          v
lumped thermal balance
          |
          v
Ns × Np pack constraints
          |
          v
vehicle longitudinal dynamics / EPA US06
```

For equations, assumptions, sign conventions, and validity boundaries, see [`docs/MODEL-NOTES.md`](docs/MODEL-NOTES.md).

## Browser compatibility changes

Since v1.1, the default runtime no longer depends on ES-module loading or JSON `fetch()`. Source files remain split under `js/core`, `js/ui`, and `js/utils`, while deployment uses two generated classic scripts:

- `js/runtime-data.js` packages the static JSON data for the runtime
- `js/app.bundle.js` packages the split JavaScript sources into a classic-script runtime

This reduces several common startup failures:

- ES-module or JSON fetch restrictions under `file://`
- `localStorage` access exceptions in restricted/private contexts
- support differences for `structuredClone`, `ResizeObserver`, `Array.at`, `flatMap`, optional chaining, and nullish coalescing
- unsupported `backdrop-filter` visual effects

If `ResizeObserver` is unavailable, the app falls back to window resize events. If storage is blocked, only preference persistence is skipped. Directly opening `index.html` is therefore supported, although HTTP or GitHub Pages remains the recommended deployment mode.

## Run locally

You may open `index.html` directly. For development, an HTTP server is still recommended.

```bash
python -m http.server 8000
# http://localhost:8000/
```

No package-manager install or build step is required for deployment.

If source modules or data JSON files are modified, regenerate the bundled runtime with:

```bash
python scripts/build_runtime.py
```

## GitHub Pages

The repository is a static Pages root:

```text
index.html
css/
js/
assets/
.nojekyll
```

Push the files to a repository branch and configure **Settings > Pages** to deploy from the root (`/`) of that branch. Internal application paths are relative, so project Pages paths such as `https://<user>.github.io/<repo>/` do not require a custom base URL.

## Responsive UI

- Desktop: sticky left-side controls and a right-side dashboard
- Tablet: controls move to a full-width top section with multi-column fields
- Mobile: controls, state tables, diagnostics, summaries, and charts become single-column oriented
- 360px and below: metrics and export controls also collapse to one column
- Very narrow form controls use 16px text to reduce iOS input zoom behavior
- The 3D pack canvas supports pointer/touch dragging and reduces its displayed topology sample on narrow screens

## Scientific interpretation

The browser kernel does not solve electrolyte concentration fields, electrode through-thickness potentials, particle radial diffusion PDEs, spatial cell temperature fields, or mechanistic SEI/plating mass balances. Those require an SPM/SPMe/DFN or higher-fidelity scientific solver and substantially more validated input data. The cell-layer and pack-3D views are **schematic state visualizations**, not 3D electrochemical or thermal solutions.

A low voltage RMSE in the included NMC reference test would only validate terminal voltage for that condition. It would not validate inferred internal concentrations, thermal gradients, or degradation mechanisms.

## Repository structure

```text
EV-Battery-Sim/
|-- index.html
|-- css/
|   |-- base.css
|   |-- layout.css
|   |-- components.css
|   `-- responsive.css
|-- js/
|   |-- core/              # reduced-order scientific kernel
|   |-- ui/                # charts, cell/pack visualization, i18n, binding
|   |-- utils/             # math, export, compatibility helpers
|   |-- main.js            # split-source entry point
|   |-- runtime-data.js    # generated static data bundle
|   `-- app.bundle.js      # generated classic browser runtime
|-- assets/
|   |-- data/
|   `-- icons/
|-- scripts/
|   `-- build_runtime.py
|-- docs/
|-- tests/
|-- .nojekyll
|-- LICENSE
`-- THIRD_PARTY_NOTICES.md
```

## Testing

```bash
python scripts/build_runtime.py
node tests/smoke.mjs
```

The smoke checks cover dataset shape, OCV endpoint plausibility, finite US06 outputs, the NMC reference-comparison path, generated runtime data, classic bundle syntax, and major static file references. This is software/numerical QA, not physical validation.

## Licensing and attribution

This is a mixed-license repository. New simulator source code and original UI assets are MIT-licensed. About:Energy-derived parameter subsets and transformations retain **CC BY-SA 4.0** attribution/share-alike requirements. EPA material has its own notices. Read [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) before redistribution.
