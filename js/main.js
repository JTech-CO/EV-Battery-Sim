import { simulate } from './core/simulator.js';
import { AppView } from './ui/app-view.js';
import { t } from './ui/i18n.js';

async function loadJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(path + ': HTTP ' + response.status);
  return response.json();
}

function normalizeEmbeddedData(raw) {
  if (!raw) return null;
  return {
    cells: raw.cellPresets.cells,
    priors: raw.modelPriors.priors,
    us06: raw.us06,
    nmcReference: raw.nmcReference
  };
}

async function loadDatasets() {
  const embedded = normalizeEmbeddedData(window.EVBS_RUNTIME_DATA);
  if (embedded) return embedded;

  const results = await Promise.all([
    loadJson('./assets/data/cell-presets.json'),
    loadJson('./assets/data/model-priors.json'),
    loadJson('./assets/data/us06.json'),
    loadJson('./assets/data/nmc-reference-1c.json')
  ]);
  return { cells: results[0].cells, priors: results[1].priors, us06: results[2], nmcReference: results[3] };
}

async function boot() {
  try {
    const datasets = await loadDatasets();
    window.evBatterySim = new AppView({ datasets: datasets, simulate: simulate });
    document.documentElement.classList.add('app-ready');
  } catch (error) {
    console.error(error);
    const box = document.querySelector('#appError');
    if (box) {
      box.textContent = t('loadError') + ' (' + (error && error.message ? error.message : String(error)) + ')';
      box.hidden = false;
    }
    document.documentElement.classList.add('app-failed');
  }
}

boot();
