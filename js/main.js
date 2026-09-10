import { simulate } from './core/simulator.js';
import { AppView } from './ui/app-view.js';
import { t } from './ui/i18n.js';

async function loadJson(path) {
  const r = await fetch(path, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
}

async function boot() {
  try {
    const [cellPresets, priorsRaw, us06, nmcReference] = await Promise.all([
      loadJson('./assets/data/cell-presets.json'),
      loadJson('./assets/data/model-priors.json'),
      loadJson('./assets/data/us06.json'),
      loadJson('./assets/data/nmc-reference-1c.json')
    ]);
    const datasets = { cells: cellPresets.cells, priors: priorsRaw.priors, us06, nmcReference };
    window.evBatterySim = new AppView({ datasets, simulate });
  } catch (error) {
    console.error(error);
    const box = document.querySelector('#appError');
    box.textContent = `${t('loadError')} (${error.message})`;
    box.hidden = false;
  }
}

boot();
