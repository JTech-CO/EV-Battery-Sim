# QA snapshot

Generated: 2026-09-11
Version: 1.1.0

## Automated checks

- Classic runtime bundle: `js/runtime-data.js` and `js/app.bundle.js` are loaded with ordinary deferred scripts instead of browser ES-module entry loading.
- Direct-file startup: packaged JSON required at startup is embedded into `js/runtime-data.js`, so initial rendering does not depend on `fetch()` succeeding under `file://`.
- JavaScript syntax: the generated classic bundle passes `node --check` and `new Function(...)` compilation checks.
- Compatibility scan: startup-critical source code contains no `structuredClone`, `Array.prototype.at`, `Array.prototype.flatMap`, optional chaining, or nullish-coalescing dependency.
- Storage and resize APIs: local storage failures are caught, and canvas resizing falls back to window resize events when `ResizeObserver` is unavailable.
- Static HTML local references: packaged local `src` and `href` targets resolve to existing files.
- Typography: stylesheet scan reports a minimum explicit text size of 12 px. The former 8 px minimum was increased by 150%.
- Responsive layout: dedicated breakpoints are present at 1280, 1040, 820, 560, and 360 px.
- Long dash scan: no em dash or en dash characters remain in packaged HTML, CSS, JavaScript, JSON, Markdown, or test sources.
- US06 dataset: 601 points at 1 s sample period; maximum packaged speed is 80.3 mph.
- Source OCP endpoint smoke checks: NMC and LFP computed OCV endpoints remain within 30 mV of their packaged source voltage limits.
- US06 default scenario: primary voltage, current, SOC, temperature, and power arrays remain finite.
- NMC 1C reference comparison returns finite RMSE and maximum absolute error.

## Numerical snapshot for the default configuration

- Cell: About:Energy NMC111/graphite 12.5 Ah pouch preset
- Pack: idealized 108s10p topology
- Initial SOC: 90%
- Vehicle mass: 1900 kg
- US06 net battery energy: approximately 2.3099 kWh
- NMC 1C reduced-model voltage RMSE: approximately 0.0740 V
- NMC 1C maximum absolute voltage error: approximately 0.3866 V

These are deterministic software-test outputs for the included assumptions. They are not certification values or experimental validation of the simulator.

## Visual and browser test boundary

The page was prepared to start both from GitHub Pages and by opening `index.html` directly. Startup data no longer requires an HTTP fetch, and the deployable entry point no longer requires ES-module loading.

A headless Chromium screenshot run was attempted in the packaging container, but Chromium could not complete startup because the container environment repeatedly failed its DBus and zygote integration. The process timed out before page rendering. Therefore this package does not claim a completed cross-browser visual E2E run from this environment.

The compatibility changes specifically remove common browser-dependent startup failure points, but final release QA should still include current Chrome, Edge, Firefox, Safari, Android Chrome, and iOS/iPadOS Safari on real browser environments.

## 3D visualization boundary

The cell and pack views use canvas geometry, perspective projection, animation, and interaction to improve spatial readability. They are schematic visualizations of simulator states. They are not DFN spatial fields, finite-element thermal solutions, CT reconstructions, or OEM pack geometry.
