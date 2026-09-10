import { t, getLanguage, setLanguage } from './i18n.js';
import { LineChart } from './charts.js';
import { CellVisualization } from './cell-visualization.js';
import { PackVisualization } from './pack-visualization.js';
import { downloadJson, downloadResultsCsv } from '../utils/export.js';
import { clamp } from '../utils/math.js';
import { deepClone, last } from '../utils/compat.js';

const $ = function (sel, root) { return (root || document).querySelector(sel); };
const $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

const defaultConfig = {
  cellId: 'ae-nmc111-pouch-12p5ah',
  initialSoc: 0.90,
  initialSoh: 1.0,
  pack: { series: 108, parallel: 10 },
  scenario: { type: 'us06', powerKW: 60, currentC: 1, durationS: 900, dtS: 1 },
  thermal: { ambientTempC: 25, initialTempC: 25, hWm2K: 9 },
  aging: { enabled: false },
  vehicle: {
    massKg: 1900, rotatingMassFactor: 1.04, cd: 0.25, frontalAreaM2: 2.30,
    cRr: 0.011, driveEfficiency: 0.92, regenEfficiency: 0.72, auxPowerKW: 0.8,
    gradePct: 0, maxTractionKW: 180, maxRegenKW: 80
  }
};

export class AppView {
  constructor(options) {
    this.datasets = options.datasets;
    this.simulate = options.simulate;
    this.result = null;
    this.cursor = 0;
    this.playing = false;
    this.raf = null;
    this.lastFrame = 0;
    this.playbackRate = 12;
    this.charts = {};
    this.initialize();
  }

  initialize() {
    this.populateCells();
    this.applyConfig(deepClone(defaultConfig));
    this.bindEvents();
    this.setupVisuals();
    setLanguage(getLanguage());
    this.run();
  }

  populateCells() {
    const select = $('#cellPreset');
    for (let i = 0; i < this.datasets.cells.length; i += 1) {
      const cell = this.datasets.cells[i];
      const option = document.createElement('option');
      option.value = cell.id;
      option.textContent = cell.shortName + ' · ' + cell.format;
      select.appendChild(option);
    }
  }

  bindEvents() {
    const self = this;
    $('#runButton').addEventListener('click', function () { self.run(); });
    $('#resetButton').addEventListener('click', function () { self.applyConfig(deepClone(defaultConfig)); self.run(); });
    $('#languageButton').addEventListener('click', function () { setLanguage(getLanguage() === 'ko' ? 'en' : 'ko'); });
    $('#scenarioType').addEventListener('change', function () { self.updateScenarioVisibility(); });
    $('#cellPreset').addEventListener('change', function () { self.updateCellMeta(); });
    $('#timeline').addEventListener('input', function (event) { self.setCursor(Number(event.target.value)); });
    $('#playButton').addEventListener('click', function () { self.togglePlayback(); });
    $('#exportCsv').addEventListener('click', function () { if (self.result) downloadResultsCsv('ev-battery-sim-result.csv', self.result); });
    $('#exportJson').addEventListener('click', function () { downloadJson('ev-battery-sim-config.json', self.readConfig()); });
    document.addEventListener('evbs:language', function () { self.renderStaticLanguage(); if (self.result) self.renderResult(); });
    window.addEventListener('beforeunload', function () { self.stopPlayback(); });
  }

  setupVisuals() {
    this.cellViz = new CellVisualization($('#cellCanvas'));
    this.packViz = new PackVisualization($('#packCanvas'));
    this.charts.speed = new LineChart($('#speedChart'));
    this.charts.power = new LineChart($('#powerChart'));
    this.charts.voltage = new LineChart($('#voltageChart'));
    this.charts.soc = new LineChart($('#socChart'));
    this.charts.temp = new LineChart($('#tempChart'));
    this.charts.heat = new LineChart($('#heatChart'));
  }

  applyConfig(c) {
    const map = {
      cellPreset: c.cellId, series: c.pack.series, parallel: c.pack.parallel,
      initialSoc: Math.round(c.initialSoc * 100), initialSoh: Math.round(c.initialSoh * 100), scenarioType: c.scenario.type,
      powerKW: c.scenario.powerKW, currentC: c.scenario.currentC, durationS: c.scenario.durationS,
      ambientTempC: c.thermal.ambientTempC, initialTempC: c.thermal.initialTempC, coolingH: c.thermal.hWm2K,
      massKg: c.vehicle.massKg, cd: c.vehicle.cd, frontalArea: c.vehicle.frontalAreaM2, crr: c.vehicle.cRr,
      driveEff: Math.round(c.vehicle.driveEfficiency * 100), regenEff: Math.round(c.vehicle.regenEfficiency * 100),
      auxPower: c.vehicle.auxPowerKW, gradePct: c.vehicle.gradePct, maxTraction: c.vehicle.maxTractionKW, maxRegen: c.vehicle.maxRegenKW
    };
    const entries = Object.entries(map);
    for (let i = 0; i < entries.length; i += 1) {
      const el = $('#' + entries[i][0]);
      if (el) el.value = entries[i][1];
    }
    $('#agingEnabled').checked = c.aging.enabled;
    this.updateScenarioVisibility();
    this.updateCellMeta();
  }

  readConfig() {
    const n = function (id, fallback) {
      const el = $('#' + id);
      const value = Number(el ? el.value : fallback);
      return Number.isFinite(value) ? value : fallback;
    };
    return {
      cellId: $('#cellPreset').value,
      initialSoc: clamp(n('initialSoc', 90) / 100, 0.001, 0.999),
      initialSoh: clamp(n('initialSoh', 100) / 100, 0.5, 1),
      pack: { series: Math.max(1, Math.round(n('series', 108))), parallel: Math.max(1, Math.round(n('parallel', 10))) },
      scenario: { type: $('#scenarioType').value, powerKW: n('powerKW', 60), currentC: n('currentC', 1), durationS: Math.max(1, n('durationS', 900)), dtS: 1 },
      thermal: { ambientTempC: n('ambientTempC', 25), initialTempC: n('initialTempC', 25), hWm2K: Math.max(0, n('coolingH', 9)) },
      aging: { enabled: $('#agingEnabled').checked },
      vehicle: {
        massKg: Math.max(100, n('massKg', 1900)), rotatingMassFactor: 1.04, cd: Math.max(0, n('cd', 0.25)), frontalAreaM2: Math.max(0.1, n('frontalArea', 2.3)),
        cRr: Math.max(0, n('crr', 0.011)), driveEfficiency: clamp(n('driveEff', 92) / 100, 0.01, 1), regenEfficiency: clamp(n('regenEff', 72) / 100, 0, 1),
        auxPowerKW: Math.max(0, n('auxPower', 0.8)), gradePct: n('gradePct', 0), maxTractionKW: Math.max(1, n('maxTraction', 180)), maxRegenKW: Math.max(0, n('maxRegen', 80))
      }
    };
  }

  updateScenarioVisibility() {
    const type = $('#scenarioType').value;
    const conditional = $$('[data-scenario]');
    for (let i = 0; i < conditional.length; i += 1) {
      conditional[i].hidden = conditional[i].dataset.scenario.split(' ').indexOf(type) === -1;
    }
    if (type !== 'us06') $('#vehiclePanel').classList.add('dimmed');
    else $('#vehiclePanel').classList.remove('dimmed');
  }

  updateCellMeta() {
    const id = $('#cellPreset').value;
    let cell = null;
    for (let i = 0; i < this.datasets.cells.length; i += 1) {
      if (this.datasets.cells[i].id === id) { cell = this.datasets.cells[i]; break; }
    }
    if (!cell) return;
    const refOption = $('#scenarioType option[value="reference-1c"]');
    const supportsReference = cell.id === 'ae-nmc111-pouch-12p5ah';
    refOption.disabled = !supportsReference;
    if (!supportsReference && $('#scenarioType').value === 'reference-1c') {
      $('#scenarioType').value = 'constant-current';
      $('#currentC').value = 1;
      this.updateScenarioVisibility();
    }
    $('#cellMeta').innerHTML = '<strong>' + cell.chemistry.positive + ' / ' + cell.chemistry.negative + '</strong><span>' + cell.capacityAh + ' Ah · ' + cell.lowerVoltageV.toFixed(2) + ' ~ ' + cell.upperVoltageV.toFixed(2) + ' V · BPX ' + cell.bpxVersion + '</span>';
  }

  run() {
    this.stopPlayback();
    try {
      this.result = this.simulate(this.readConfig(), this.datasets);
      this.cursor = 0;
      $('#timeline').min = 0;
      $('#timeline').max = Math.max(0, this.result.out.timeS.length - 1);
      $('#timeline').value = 0;
      $('#appError').hidden = true;
      this.renderResult();
    } catch (error) {
      console.error(error);
      $('#appError').textContent = error && error.message ? error.message : String(error);
      $('#appError').hidden = false;
    }
  }

  renderStaticLanguage() {
    $('#languageButton').textContent = getLanguage() === 'ko' ? 'EN' : 'KR';
    $('#playButton').textContent = this.playing ? t('pause') : t('playback');
    this.updateScenarioVisibility();
  }

  renderResult() {
    const out = this.result.out;
    const summary = this.result.summary;
    const i = Math.min(Math.round(this.cursor), out.timeS.length - 1);
    const f = function (value, digits) { return Number.isFinite(value) ? value.toFixed(digits === undefined ? 1 : digits) : '-'; };

    $('#metricPackVoltage').textContent = f(out.packVoltageV[i], 1) + ' V';
    $('#metricPackCurrent').textContent = f(out.packCurrentA[i], 1) + ' A';
    $('#metricSoc').textContent = f(out.soc[i] * 100, 1) + ' %';
    $('#metricTemp').textContent = f(out.temperatureC[i], 1) + ' °C';
    $('#metricSoh').textContent = f(out.soh[i] * 100, 2) + ' %';
    $('#metricEnergy').textContent = f(summary.netEnergyKWh, 3) + ' kWh';
    $('#timelineTime').textContent = f(out.timeS[i], 0) + ' / ' + f(last(out.timeS, 0), 0) + ' s';

    $('#terminalVoltageValue').textContent = f(out.cellVoltageV[i], 3) + ' V';
    $('#ocvValue').textContent = f(out.ocvV[i], 3) + ' V';
    $('#negativeOcpValue').textContent = f(out.negativeOcpV[i], 3) + ' V';
    $('#positiveOcpValue').textContent = f(out.positiveOcpV[i], 3) + ' V';
    $('#xnValue').textContent = f(out.xn[i], 4);
    $('#xpValue').textContent = f(out.xp[i], 4);
    $('#cRateValue').textContent = f(out.cRate[i], 2) + ' C';
    $('#irreversibleHeatValue').textContent = f(out.irreversibleHeatWCell[i], 2) + ' W';
    $('#reversibleHeatValue').textContent = f(out.reversibleHeatWCell[i], 2) + ' W';
    $('#platingRiskValue').textContent = f(out.platingRisk[i], 1) + ' / 100';
    $('#agingStressValue').textContent = f(out.agingStress[i], 1) + ' / 100';
    $('#powerLimitValue').textContent = out.powerLimited[i] ? t('yes') : t('no');
    if (out.powerLimited[i]) $('#powerLimitValue').classList.add('warning-text');
    else $('#powerLimitValue').classList.remove('warning-text');

    const maxC = Math.max(0.1, summary.prior.limits.maxDischargeC);
    const cRateWidth = clamp(Math.abs(out.cRate[i]) / maxC * 100, 0, 100);
    const cRateMeter = $('#cRateMeter');
    if (cRateMeter) cRateMeter.style.width = cRateWidth.toFixed(1) + '%';

    this.cellViz.update({
      timeS: out.timeS[i], currentA: out.cellCurrentA[i], soc: out.soc[i], xn: out.xn[i], xp: out.xp[i],
      negativeLithiation: normalizedStoich(summary.cell.negative, out.xn[i]),
      positiveLithiation: normalizedStoich(summary.cell.positive, out.xp[i]),
      temperatureC: out.temperatureC[i]
    });
    this.packViz.update({
      soc: out.soc[i], temperatureC: out.temperatureC[i], packPowerKW: out.actualPackPowerKW[i],
      series: this.result.config.pack.series, parallel: this.result.config.pack.parallel
    });

    this.renderSummary(summary);
    this.renderCharts();
  }

  renderSummary(s) {
    const f = function (value, digits) { return Number.isFinite(value) ? value.toFixed(digits === undefined ? 1 : digits) : '-'; };
    const items = [
      [t('nominalPack'), f(s.packNominal.nominalVoltageV, 0) + ' V · ' + f(s.packNominal.nominalEnergyKWh, 1) + ' kWh'],
      [t('cells'), s.packNominal.cellCount.toLocaleString() + ' (' + this.result.config.pack.series + 's' + this.result.config.pack.parallel + 'p)'],
      [t('maxTemp'), f(s.maxTemperatureC, 1) + ' °C'],
      [t('peakPower'), f(s.peakDischargeKW, 1) + ' kW'],
      [t('peakRegen'), f(Math.abs(Math.min(0, s.peakRegenKW)), 1) + ' kW'],
      [t('maxCRate'), f(s.maxCRate, 2) + ' C'],
      [t('recovered'), f(s.recoveredEnergyKWh, 3) + ' kWh'],
      [t('limitsActive'), f(s.limitedFraction * 100, 1) + ' %']
    ];
    let html = '';
    for (let i = 0; i < items.length; i += 1) html += '<div class="summary-item"><span>' + items[i][0] + '</span><strong>' + items[i][1] + '</strong></div>';
    $('#summaryGrid').innerHTML = html;

    const validation = $('#validationCard');
    validation.hidden = s.referenceRmseV === undefined;
    if (!validation.hidden) {
      $('#rmseValue').textContent = f(s.referenceRmseV * 1000, 1) + ' mV';
      $('#maxErrorValue').textContent = f(s.referenceMaxAbsErrorV * 1000, 1) + ' mV';
    }
    $('#cellSourceNote').textContent = s.cell.provenance.note;
  }

  renderCharts() {
    const out = this.result.out;
    this.charts.speed.setData(out.timeS, [{ label: t('speed'), values: out.speedMph }], { yMin: 0 });
    this.charts.power.setData(out.timeS, [{ label: t('requested'), values: out.requestedPackPowerKW }, { label: t('actual'), values: out.actualPackPowerKW }]);
    const voltageMin = Math.min.apply(null, out.cellVoltageV.concat([this.result.summary.cell.lowerVoltageV - 0.1]));
    this.charts.voltage.setData(out.timeS, [{ label: t('terminal'), values: out.cellVoltageV }, { label: t('ocv'), values: out.ocvV }], { yMin: voltageMin });
    this.charts.soc.setData(out.timeS, [{ label: t('soc'), values: out.soc.map(function (value) { return value * 100; }) }], { yMin: 0, yMax: 100 });
    this.charts.temp.setData(out.timeS, [{ label: t('cellTemp'), values: out.temperatureC }]);
    this.charts.heat.setData(out.timeS, [{ label: t('generated'), values: out.generatedHeatWCell }, { label: t('coolingHeat'), values: out.coolingWCell }]);
    const chartValues = Object.values(this.charts);
    for (let i = 0; i < chartValues.length; i += 1) chartValues[i].setCursor(this.cursor);
  }

  setCursor(index) {
    if (!this.result) return;
    this.cursor = clamp(Math.round(index), 0, this.result.out.timeS.length - 1);
    $('#timeline').value = this.cursor;
    this.renderResult();
  }

  togglePlayback() {
    if (this.playing) this.stopPlayback();
    else this.startPlayback();
  }

  startPlayback() {
    if (!this.result) return;
    if (this.cursor >= this.result.out.timeS.length - 1) this.cursor = 0;
    this.playing = true;
    $('#playButton').textContent = t('pause');
    this.lastFrame = performance.now();
    const self = this;
    const tick = function (now) {
      if (!self.playing) return;
      const elapsed = (now - self.lastFrame) / 1000;
      self.lastFrame = now;
      const firstStep = self.result.out.timeS.length > 1 ? self.result.out.timeS[1] - self.result.out.timeS[0] : 1;
      const dt = Math.max(0.001, firstStep || 1);
      self.cursor = Math.min(self.result.out.timeS.length - 1, self.cursor + elapsed * self.playbackRate / dt);
      self.setCursor(self.cursor);
      if (self.cursor >= self.result.out.timeS.length - 1) self.stopPlayback();
      else self.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stopPlayback() {
    this.playing = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    const button = $('#playButton');
    if (button) button.textContent = t('playback');
  }
}

function normalizedStoich(electrode, value) {
  const span = electrode.stoichMax - electrode.stoichMin;
  if (Math.abs(span) < 1e-12) return 0;
  return clamp((value - electrode.stoichMin) / span, 0, 1);
}

export { defaultConfig };
