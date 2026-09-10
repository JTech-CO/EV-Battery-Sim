import fs from 'node:fs';
import assert from 'node:assert/strict';
import { simulate } from '../js/core/simulator.js';
import { electrochemicalState } from '../js/core/electrochem.js';

const read = p => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf8'));
const cellPack = read('../assets/data/cell-presets.json');
const priorPack = read('../assets/data/model-priors.json');
const us06 = read('../assets/data/us06.json');
const nmcReference = read('../assets/data/nmc-reference-1c.json');
const datasets = { cells:cellPack.cells, priors:priorPack.priors, us06, nmcReference };

assert.equal(us06.speedMph.length, 601);
assert.equal(us06.samplePeriodS, 1);
assert.equal(Math.max(...us06.speedMph), 80.3);

for (const cell of datasets.cells) {
  for (const soc of [0, .25, .5, .75, 1]) {
    const e = electrochemicalState(cell, soc);
    assert.ok(Number.isFinite(e.ocvV));
  }
  const lo = electrochemicalState(cell, 0).ocvV;
  const hi = electrochemicalState(cell, 1).ocvV;
  assert.ok(Math.abs(lo - cell.lowerVoltageV) < .03, `${cell.id} low OCV endpoint`);
  assert.ok(Math.abs(hi - cell.upperVoltageV) < .03, `${cell.id} high OCV endpoint`);
}

const config = {
  cellId:'ae-nmc111-pouch-12p5ah', initialSoc:.9, initialSoh:1,
  pack:{series:108,parallel:10}, scenario:{type:'us06',powerKW:60,currentC:1,durationS:900,dtS:1},
  thermal:{ambientTempC:25,initialTempC:25,hWm2K:9}, aging:{enabled:false},
  vehicle:{massKg:1900,rotatingMassFactor:1.04,cd:.25,frontalAreaM2:2.3,cRr:.011,driveEfficiency:.92,regenEfficiency:.72,auxPowerKW:.8,gradePct:0,maxTractionKW:180,maxRegenKW:80}
};
const result = simulate(config, datasets);
assert.equal(result.out.timeS.length, 601);
for (const key of ['packVoltageV','cellVoltageV','soc','temperatureC','actualPackPowerKW']) assert.ok(result.out[key].every(Number.isFinite), key);
assert.ok(result.summary.netEnergyKWh > 0);
assert.ok(result.summary.recoveredEnergyKWh > 0);

const reference = simulate({...config,initialSoc:.999,scenario:{...config.scenario,type:'reference-1c'}}, datasets);
assert.ok(Number.isFinite(reference.summary.referenceRmseV));
assert.ok(Number.isFinite(reference.summary.referenceMaxAbsErrorV));
console.log(JSON.stringify({ok:true,us06Points:result.out.timeS.length,us06NetEnergyKWh:result.summary.netEnergyKWh,nmc1cRmseV:reference.summary.referenceRmseV,nmc1cMaxAbsErrorV:reference.summary.referenceMaxAbsErrorV},null,2));
