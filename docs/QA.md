# QA snapshot

Generated: 2026-09-10

## Automated checks

- JavaScript syntax: all `js/**/*.js` and `tests/**/*.mjs` passed `node --check`.
- Static HTML local references: all `./...` references in `index.html` resolve to packaged files.
- US06 dataset: 601 points at 1 s sample period; maximum packaged speed 80.3 mph.
- Source OCP endpoint smoke checks: NMC and LFP computed OCV endpoints remain within 30 mV of their packaged source voltage limits.
- US06 default scenario: all primary voltage/current/SOC/temperature/power output arrays are finite.
- NMC 1C reference comparison path returns finite RMSE and maximum absolute error.

## Numerical snapshot for the default configuration

- Cell: About:Energy NMC111/graphite 12.5 Ah pouch preset
- Pack: 108s10p reduced idealized topology
- Initial SOC: 90%
- Vehicle mass: 1900 kg
- US06 net battery energy: approximately 2.3099 kWh
- NMC 1C reduced-model voltage RMSE: approximately 0.0740 V
- NMC 1C maximum absolute voltage error: approximately 0.3866 V

These are deterministic software-test outputs for the included assumptions. They are not certification or experimental validation values.

## Environment note

The package is designed for a modern browser served over HTTP/HTTPS. The sandbox's long-lived local HTTP/headless-browser integration was unavailable during packaging, so the final visual/browser interaction was not claimed as end-to-end browser-tested here. Core numerical paths, module syntax, datasets, and static path integrity were tested directly.
