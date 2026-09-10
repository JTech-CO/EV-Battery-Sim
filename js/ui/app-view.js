import { t, getLanguage, setLanguage } from './i18n.js';
import { LineChart } from './charts.js';
import { CellVisualization } from './cell-visualization.js';
import { downloadJson, downloadResultsCsv } from '../utils/export.js';
import { clamp } from '../utils/math.js';

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

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
  constructor({ datasets, simulate }) {
    this.datasets = datasets;
    this.simulate = simulate;
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
    this.applyConfig(structuredClone(defaultConfig));
    this.bindEvents();
    this.setupVisuals();
    setLanguage(getLanguage());
    this.run();
  }

  populateCells() {
    const select = $('#cellPreset');
    this.datasets.cells.forEach(cell => {
      const option = document.createElement('option');
      option.value = cell.id;
      option.textContent = `${cell.shortName} · ${cell.format}`;
      select.appendChild(option);
    });
  }

  bindEvents() {
    $('#runButton').addEventListener('click', () => this.run());
    $('#resetButton').addEventListener('click', () => { this.applyConfig(structuredClone(defaultConfig)); this.run(); });
    $('#languageButton').addEventListener('click', () => setLanguage(getLanguage() === 'ko' ? 'en' : 'ko'));
    $('#scenarioType').addEventListener('change', () => this.updateScenarioVisibility());
    $('#cellPreset').addEventListener('change', () => this.updateCellMeta());
    $('#timeline').addEventListener('input', e => this.setCursor(Number(e.target.value)));
    $('#playButton').addEventListener('click', () => this.togglePlayback());
    $('#exportCsv').addEventListener('click', () => this.result && downloadResultsCsv('ev-battery-sim-result.csv', this.result));
    $('#exportJson').addEventListener('click', () => downloadJson('ev-battery-sim-config.json', this.readConfig()));
    document.addEventListener('evbs:language', () => { this.renderStaticLanguage(); if (this.result) this.renderResult(); });
    window.addEventListener('beforeunload', () => this.stopPlayback());
  }

  setupVisuals() {
    this.cellViz = new CellVisualization($('#cellCanvas'));
    this.charts.speed = new LineChart($('#speedChart'));
    this.charts.power = new LineChart($('#powerChart'));
    this.charts.voltage = new LineChart($('#voltageChart'));
    this.charts.soc = new LineChart($('#socChart'));
    this.charts.temp = new LineChart($('#tempChart'));
    this.charts.heat = new LineChart($('#heatChart'));
  }

  applyConfig(c) {
    const map = {
      cellPreset:c.cellId, series:c.pack.series, parallel:c.pack.parallel,
      initialSoc:Math.round(c.initialSoc*100), initialSoh:Math.round(c.initialSoh*100), scenarioType:c.scenario.type,
      powerKW:c.scenario.powerKW, currentC:c.scenario.currentC, durationS:c.scenario.durationS,
      ambientTempC:c.thermal.ambientTempC, initialTempC:c.thermal.initialTempC, coolingH:c.thermal.hWm2K,
      massKg:c.vehicle.massKg, cd:c.vehicle.cd, frontalArea:c.vehicle.frontalAreaM2, crr:c.vehicle.cRr,
      driveEff:Math.round(c.vehicle.driveEfficiency*100), regenEff:Math.round(c.vehicle.regenEfficiency*100),
      auxPower:c.vehicle.auxPowerKW, gradePct:c.vehicle.gradePct, maxTraction:c.vehicle.maxTractionKW, maxRegen:c.vehicle.maxRegenKW
    };
    Object.entries(map).forEach(([id,value]) => { const el=$(`#${id}`); if(el) el.value=value; });
    $('#agingEnabled').checked = c.aging.enabled;
    this.updateScenarioVisibility();
    this.updateCellMeta();
  }

  readConfig() {
    const n = (id, fallback=0) => { const v=Number($(`#${id}`).value); return Number.isFinite(v)?v:fallback; };
    return {
      cellId: $('#cellPreset').value,
      initialSoc: clamp(n('initialSoc',90)/100, .001, .999),
      initialSoh: clamp(n('initialSoh',100)/100, .5, 1),
      pack: { series: Math.max(1,Math.round(n('series',108))), parallel: Math.max(1,Math.round(n('parallel',10))) },
      scenario: { type:$('#scenarioType').value, powerKW:n('powerKW',60), currentC:n('currentC',1), durationS:Math.max(1,n('durationS',900)), dtS:1 },
      thermal: { ambientTempC:n('ambientTempC',25), initialTempC:n('initialTempC',25), hWm2K:Math.max(0,n('coolingH',9)) },
      aging: { enabled:$('#agingEnabled').checked },
      vehicle: {
        massKg:Math.max(100,n('massKg',1900)), rotatingMassFactor:1.04, cd:Math.max(0,n('cd',.25)), frontalAreaM2:Math.max(.1,n('frontalArea',2.3)),
        cRr:Math.max(0,n('crr',.011)), driveEfficiency:clamp(n('driveEff',92)/100,.01,1), regenEfficiency:clamp(n('regenEff',72)/100,0,1),
        auxPowerKW:Math.max(0,n('auxPower',.8)), gradePct:n('gradePct',0), maxTractionKW:Math.max(1,n('maxTraction',180)), maxRegenKW:Math.max(0,n('maxRegen',80))
      }
    };
  }

  updateScenarioVisibility() {
    const type=$('#scenarioType').value;
    $$('[data-scenario]').forEach(el => el.hidden = !(el.dataset.scenario.split(' ').includes(type)));
    $('#vehiclePanel').classList.toggle('dimmed', type !== 'us06');
  }

  updateCellMeta() {
    const cell=this.datasets.cells.find(c=>c.id===$('#cellPreset').value);
    if(!cell) return;
    const refOption = $('#scenarioType option[value="reference-1c"]');
    const supportsReference = cell.id === 'ae-nmc111-pouch-12p5ah';
    refOption.disabled = !supportsReference;
    if (!supportsReference && $('#scenarioType').value === 'reference-1c') { $('#scenarioType').value = 'constant-current'; $('#currentC').value = 1; this.updateScenarioVisibility(); }
    $('#cellMeta').innerHTML = `<strong>${cell.chemistry.positive} / ${cell.chemistry.negative}</strong><span>${cell.capacityAh} Ah · ${cell.lowerVoltageV.toFixed(2)}–${cell.upperVoltageV.toFixed(2)} V · BPX ${cell.bpxVersion}</span>`;
  }

  run() {
    this.stopPlayback();
    try {
      this.result = this.simulate(this.readConfig(), this.datasets);
      this.cursor = 0;
      $('#timeline').min=0; $('#timeline').max=Math.max(0,this.result.out.timeS.length-1); $('#timeline').value=0;
      $('#appError').hidden=true;
      this.renderResult();
    } catch(err) {
      console.error(err); $('#appError').textContent=err.message; $('#appError').hidden=false;
    }
  }

  renderStaticLanguage() {
    $('#languageButton').textContent = getLanguage()==='ko' ? 'EN' : 'KR';
    $('#playButton').textContent = this.playing ? t('pause') : t('playback');
    this.updateScenarioVisibility();
  }

  renderResult() {
    const { out, summary } = this.result;
    const i=Math.min(this.cursor,out.timeS.length-1);
    const f=(v,d=1)=>Number.isFinite(v)?v.toFixed(d):'—';
    $('#metricPackVoltage').textContent=`${f(out.packVoltageV[i],1)} V`;
    $('#metricPackCurrent').textContent=`${f(out.packCurrentA[i],1)} A`;
    $('#metricSoc').textContent=`${f(out.soc[i]*100,1)} %`;
    $('#metricTemp').textContent=`${f(out.temperatureC[i],1)} °C`;
    $('#metricSoh').textContent=`${f(out.soh[i]*100,2)} %`;
    $('#metricEnergy').textContent=`${f(summary.netEnergyKWh,3)} kWh`;
    $('#timelineTime').textContent=`${f(out.timeS[i],0)} / ${f(out.timeS.at(-1),0)} s`;

    $('#terminalVoltageValue').textContent=`${f(out.cellVoltageV[i],3)} V`;
    $('#ocvValue').textContent=`${f(out.ocvV[i],3)} V`;
    $('#negativeOcpValue').textContent=`${f(out.negativeOcpV[i],3)} V`;
    $('#positiveOcpValue').textContent=`${f(out.positiveOcpV[i],3)} V`;
    $('#xnValue').textContent=f(out.xn[i],4); $('#xpValue').textContent=f(out.xp[i],4);
    $('#cRateValue').textContent=`${f(out.cRate[i],2)} C`;
    $('#irreversibleHeatValue').textContent=`${f(out.irreversibleHeatWCell[i],2)} W`;
    $('#reversibleHeatValue').textContent=`${f(out.reversibleHeatWCell[i],2)} W`;
    $('#platingRiskValue').textContent=`${f(out.platingRisk[i],1)} / 100`;
    $('#agingStressValue').textContent=`${f(out.agingStress[i],1)} / 100`;
    $('#powerLimitValue').textContent=out.powerLimited[i] ? t('yes') : t('no');
    $('#powerLimitValue').classList.toggle('warning-text', !!out.powerLimited[i]);

    this.cellViz.update({ timeS:out.timeS[i], currentA:out.cellCurrentA[i], soc:out.soc[i], xn:out.xn[i], xp:out.xp[i], negativeLithiation:out.xn[i], positiveLithiation:out.xp[i], temperatureC:out.temperatureC[i] });
    this.renderSummary(summary);
    this.renderCharts();
  }

  renderSummary(s) {
    const f=(v,d=1)=>Number.isFinite(v)?v.toFixed(d):'—';
    $('#summaryGrid').innerHTML = [
      [t('nominalPack'),`${f(s.packNominal.nominalVoltageV,0)} V · ${f(s.packNominal.nominalEnergyKWh,1)} kWh`],
      [t('cells'),`${s.packNominal.cellCount.toLocaleString()} (${this.result.config.pack.series}s${this.result.config.pack.parallel}p)`],
      [t('maxTemp'),`${f(s.maxTemperatureC,1)} °C`],
      [t('peakPower'),`${f(s.peakDischargeKW,1)} kW`],
      [t('peakRegen'),`${f(Math.abs(Math.min(0,s.peakRegenKW)),1)} kW`],
      [t('maxCRate'),`${f(s.maxCRate,2)} C`],
      [t('recovered'),`${f(s.recoveredEnergyKWh,3)} kWh`],
      [t('limitsActive'),`${f(s.limitedFraction*100,1)} %`]
    ].map(([k,v])=>`<div class="summary-item"><span>${k}</span><strong>${v}</strong></div>`).join('');

    const validation=$('#validationCard');
    validation.hidden = s.referenceRmseV === undefined;
    if(!validation.hidden){ $('#rmseValue').textContent=`${f(s.referenceRmseV*1000,1)} mV`; $('#maxErrorValue').textContent=`${f(s.referenceMaxAbsErrorV*1000,1)} mV`; }
    $('#cellSourceNote').textContent=s.cell.provenance.note;
  }

  renderCharts() {
    const o=this.result.out;
    this.charts.speed.setData(o.timeS,[{label:t('speed'),values:o.speedMph}],{yMin:0});
    this.charts.power.setData(o.timeS,[{label:t('requested'),values:o.requestedPackPowerKW},{label:t('actual'),values:o.actualPackPowerKW}]);
    this.charts.voltage.setData(o.timeS,[{label:t('terminal'),values:o.cellVoltageV},{label:t('ocv'),values:o.ocvV}],{yMin:Math.min(this.result.summary.cell.lowerVoltageV-.1,...o.cellVoltageV)});
    this.charts.soc.setData(o.timeS,[{label:t('soc'),values:o.soc.map(v=>v*100)}],{yMin:0,yMax:100});
    this.charts.temp.setData(o.timeS,[{label:t('cellTemp'),values:o.temperatureC}]);
    this.charts.heat.setData(o.timeS,[{label:t('generated'),values:o.generatedHeatWCell},{label:t('coolingHeat'),values:o.coolingWCell}]);
    Object.values(this.charts).forEach(c=>c.setCursor(this.cursor));
  }

  setCursor(index) {
    if(!this.result) return;
    this.cursor=clamp(Math.round(index),0,this.result.out.timeS.length-1);
    $('#timeline').value=this.cursor;
    this.renderResult();
  }

  togglePlayback() { this.playing ? this.stopPlayback() : this.startPlayback(); }
  startPlayback() {
    if(!this.result) return;
    if(this.cursor >= this.result.out.timeS.length-1) this.cursor=0;
    this.playing=true; $('#playButton').textContent=t('pause'); this.lastFrame=performance.now();
    const tick=(now)=>{
      if(!this.playing) return;
      const elapsed=(now-this.lastFrame)/1000; this.lastFrame=now;
      const dt=Math.max(.001,this.result.out.timeS[1]-this.result.out.timeS[0] || 1);
      this.cursor=Math.min(this.result.out.timeS.length-1,this.cursor + elapsed*this.playbackRate/dt);
      this.setCursor(this.cursor);
      if(this.cursor >= this.result.out.timeS.length-1) this.stopPlayback(); else this.raf=requestAnimationFrame(tick);
    };
    this.raf=requestAnimationFrame(tick);
  }
  stopPlayback() { this.playing=false; if(this.raf) cancelAnimationFrame(this.raf); this.raf=null; const b=$('#playButton'); if(b) b.textContent=t('playback'); }
}

export { defaultConfig };
