# EV Battery Sim

[한국어](README-KR.md) · [Research corpus](https://github.com/JTech-CO/EV-Battery-Research/)

**EV Battery Sim** is a dependency-free, static browser simulator built from the public research/data package in `JTech-CO/EV-Battery-Research`. It couples a source-based OCP/stoichiometry layer with an explicit reduced-order electrical model, lumped thermal balance, pack topology, vehicle longitudinal dynamics, and the official EPA US06 speed schedule.

It is intentionally **not** presented as a DFN/P2D solver, OEM digital twin, safety certification tool, or validated lifetime predictor. The UI distinguishes source-derived quantities from engineering priors.

## What is implemented

- About:Energy NMC111/graphite 12.5 Ah pouch and LFP/graphite 2 Ah 18650 presets.
- Source OCP fits, stoichiometric windows, voltage limits, heat capacity inputs, and selected structural/electrolyte metadata.
- Two-RC Thevenin polarization model with explicit engineering-prior resistance and C-rate limits.
- Lumped cell thermal balance with irreversible/reversible heat diagnostics and convective cooling boundary.
- Configurable `Ns × Np` pack and power-to-cell-current coupling with voltage/current limits.
- EPA US06 1 Hz / 601-point prescribed speed schedule and a configurable longitudinal vehicle load model.
- Constant pack-power and constant cell-C-rate experiments.
- NMC public 1C reference-curve comparison with RMSE and maximum absolute voltage error.
- Exploratory SOH and lithium-plating risk indicators. These are screening priors, not calibrated degradation predictions.
- Korean/English UI, responsive desktop/mobile layout, timeline playback, CSV/JSON export.

## Model chain

```text
source OCP + stoichiometry
          ↓
2-RC terminal-voltage approximation
          ↓
lumped thermal balance
          ↓
Ns × Np pack constraints
          ↓
vehicle longitudinal dynamics / EPA US06
```

For the equations, assumptions, sign conventions, and validity boundaries, see [`docs/MODEL-NOTES.md`](docs/MODEL-NOTES.md).

## Run locally

ES modules and `fetch()` require an HTTP origin. Do not open `index.html` directly with `file://`.

```bash
python -m http.server 8000
# open http://localhost:8000/
```

No build step or package manager is required.

## GitHub Pages

The repository is already laid out as a static Pages root:

```text
index.html
css/
js/
assets/
.nojekyll
```

Push the contents to a repository branch and configure **Settings → Pages** to deploy from the repository root of that branch. All internal application paths are relative, so project Pages paths such as `https://<user>.github.io/<repo>/` work without a custom base URL.

## Scientific interpretation

The browser kernel does not solve electrolyte concentration fields, electrode through-thickness potentials, particle radial diffusion PDEs, spatial cell temperature fields, or mechanistic SEI/plating mass balances. Those require an SPM/SPMe/DFN or higher-fidelity scientific solver and substantially more validated input data. The cell animation is explicitly schematic.

A low voltage RMSE in the included NMC reference test would only validate terminal voltage for that condition; it would not validate inferred internal concentrations, thermal gradients, or degradation mechanisms.

## Repository structure

```text
EV-Battery-Sim/
├── index.html
├── css/
│   ├── base.css
│   ├── layout.css
│   ├── components.css
│   └── responsive.css
├── js/
│   ├── core/          # scientific/reduced-order kernel
│   ├── ui/            # charts, visualization, i18n, app binding
│   ├── utils/
│   └── main.js
├── assets/
│   ├── data/
│   └── icons/
├── docs/
├── tests/
├── .nojekyll
├── LICENSE
└── THIRD_PARTY_NOTICES.md
```

## Testing

```bash
node tests/smoke.mjs
```

The smoke test checks dataset shape, OCV endpoint plausibility, finite US06 outputs, and the NMC reference-comparison path. This is software/numerical QA, not physical validation.

## Licensing and attribution

This is a mixed-license repository. New simulator source code and original UI assets are MIT-licensed. About:Energy-derived parameter subsets and transformations retain **CC BY-SA 4.0** attribution/share-alike requirements. EPA material has its own notices. Read [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) before redistribution.
