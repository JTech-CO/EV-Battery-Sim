import { clamp, nearestIndex, rms } from '../utils/math.js';
import { last } from '../utils/compat.js';
import { electrochemicalState } from './electrochem.js';
import { createEcmState, ecmResistances, terminalVoltage, advanceEcm } from './ecm.js';
import { heatRates, advanceThermal } from './thermal.js';
import { createAgingState, advanceAging } from './degradation.js';
import { accelerationAt, vehiclePowerDemand, us06Profile } from './vehicle.js';
import { nominalPack, solveCellCurrentForPackPower } from './pack.js';

function makeGenericProfile(durationS, dt) {
  const n = Math.floor(durationS / dt) + 1;
  return { dt, timeS: Array.from({ length: n }, (_, i) => i * dt), speedMph: Array(n).fill(0), speedMps: Array(n).fill(0) };
}

export function simulate(config, datasets) {
  const cell = datasets.cells.find(c => c.id === config.cellId);
  if (!cell) throw new Error(`Unknown cell preset: ${config.cellId}`);
  const prior = datasets.priors[cell.id];
  if (!prior) throw new Error(`No reduced-order prior for: ${cell.id}`);

  const seriesCount = Math.max(1, Math.round(config.pack.series));
  const parallelCount = Math.max(1, Math.round(config.pack.parallel));
  const packNominal = nominalPack(cell, prior, seriesCount, parallelCount);

  let profile;
  if (config.scenario.type === 'us06') profile = us06Profile(datasets.us06);
  else if (config.scenario.type === 'reference-1c') profile = makeGenericProfile(cell.id.includes('nmc') ? 3700 : 3600, 1);
  else profile = makeGenericProfile(config.scenario.durationS, config.scenario.dtS || 1);

  let soc = clamp(config.initialSoc, 0.001, 0.999);
  let temperatureK = config.thermal.initialTempC + 273.15;
  const ambientK = config.thermal.ambientTempC + 273.15;
  const ecm = createEcmState();
  const aging = createAgingState(config.initialSoh === undefined ? 1 : config.initialSoh);
  let netEnergyKWh = 0;
  let dischargedEnergyKWh = 0;
  let recoveredEnergyKWh = 0;
  let cutoff = false;

  const out = {
    timeS: [], speedMph: [], speedMps: [], accelerationMps2: [],
    requestedPackPowerKW: [], actualPackPowerKW: [], unmetPackPowerKW: [],
    packVoltageV: [], packCurrentA: [], cellVoltageV: [], cellCurrentA: [], cRate: [],
    soc: [], temperatureC: [], soh: [], efc: [],
    ocvV: [], positiveOcpV: [], negativeOcpV: [], xn: [], xp: [],
    irreversibleHeatWCell: [], reversibleHeatWCell: [], generatedHeatWCell: [], coolingWCell: [],
    resistanceMOhmCell: [], platingRisk: [], agingStress: [], powerLimited: [], cutoff: []
  };

  for (let i = 0; i < profile.timeS.length; i++) {
    const dt = i === 0 ? profile.dt : Math.max(1e-6, profile.timeS[i] - profile.timeS[i - 1]);
    const electro = electrochemicalState(cell, soc);
    const resistance = ecmResistances(prior, soc, temperatureK, aging.soh);
    const baseCellVoltageV = electro.ocvV - ecm.v1 - ecm.v2;

    let requestedPowerW = 0;
    let currentA = 0;
    let packCurrentA = 0;
    let actualPowerW = 0;
    let unmetPowerW = 0;
    let cellVoltageV;
    let powerLimited = false;
    let accelerationMps2 = 0;

    if (!cutoff && config.scenario.type === 'us06') {
      accelerationMps2 = accelerationAt(profile.speedMps, i, profile.dt);
      const demand = vehiclePowerDemand(config.vehicle, profile.speedMps[i], accelerationMps2);
      requestedPowerW = demand.batteryPowerW;
      const solved = solveCellCurrentForPackPower({ requestedPowerW, seriesCount, parallelCount, baseCellVoltageV, r0Ohm: resistance.r0, cell, prior });
      ({ currentA, packCurrentA, actualPowerW, unmetPowerW, cellVoltageV, powerLimited } = solved);
    } else if (!cutoff && config.scenario.type === 'constant-power') {
      requestedPowerW = config.scenario.powerKW * 1000;
      const solved = solveCellCurrentForPackPower({ requestedPowerW, seriesCount, parallelCount, baseCellVoltageV, r0Ohm: resistance.r0, cell, prior });
      ({ currentA, packCurrentA, actualPowerW, unmetPowerW, cellVoltageV, powerLimited } = solved);
    } else if (!cutoff) {
      const requestedC = config.scenario.type === 'reference-1c' ? 1 : config.scenario.currentC;
      const maxDischargeA = prior.limits.maxDischargeC * cell.capacityAh;
      const maxChargeA = prior.limits.maxChargeC * cell.capacityAh;
      currentA = clamp(requestedC * cell.capacityAh, -maxChargeA, maxDischargeA);
      powerLimited = Math.abs(currentA - requestedC * cell.capacityAh) > 1e-9;
      cellVoltageV = terminalVoltage(electro.ocvV, currentA, ecm, resistance);
      if (cellVoltageV <= cell.lowerVoltageV && currentA > 0) { currentA = 0; cellVoltageV = baseCellVoltageV; cutoff = true; }
      if (cellVoltageV >= cell.upperVoltageV && currentA < 0) { currentA = 0; cellVoltageV = baseCellVoltageV; cutoff = true; }
      packCurrentA = currentA * parallelCount;
      actualPowerW = seriesCount * parallelCount * currentA * cellVoltageV;
      requestedPowerW = actualPowerW;
    }

    if (cellVoltageV === undefined) cellVoltageV = terminalVoltage(electro.ocvV, currentA, ecm, resistance);
    const packVoltageV = cellVoltageV * seriesCount;
    const heat = heatRates({ currentA, ocvV: electro.ocvV, terminalVoltageV: cellVoltageV, temperatureK, dOcvdTK: electro.dOcvdTK });
    const thermal = advanceThermal({ cell, temperatureK, ambientK, generatedW: heat.generatedW, heatTransferCoeffWm2K: config.thermal.hWm2K, dt });
    const agingStep = advanceAging(aging, { prior, currentA, capacityAh: cell.capacityAh, temperatureK, soc, dt, enabled: config.aging.enabled });

    out.timeS.push(profile.timeS[i]);
    out.speedMph.push(profile.speedMph[i] === undefined ? 0 : profile.speedMph[i]);
    out.speedMps.push(profile.speedMps[i] === undefined ? 0 : profile.speedMps[i]);
    out.accelerationMps2.push(accelerationMps2);
    out.requestedPackPowerKW.push(requestedPowerW / 1000);
    out.actualPackPowerKW.push(actualPowerW / 1000);
    out.unmetPackPowerKW.push(unmetPowerW / 1000);
    out.packVoltageV.push(packVoltageV);
    out.packCurrentA.push(packCurrentA);
    out.cellVoltageV.push(cellVoltageV);
    out.cellCurrentA.push(currentA);
    out.cRate.push(agingStep.cRate);
    out.soc.push(soc);
    out.temperatureC.push(temperatureK - 273.15);
    out.soh.push(aging.soh);
    out.efc.push(aging.efc);
    out.ocvV.push(electro.ocvV);
    out.positiveOcpV.push(electro.positiveOcpV);
    out.negativeOcpV.push(electro.negativeOcpV);
    out.xn.push(electro.xn);
    out.xp.push(electro.xp);
    out.irreversibleHeatWCell.push(heat.irreversibleW);
    out.reversibleHeatWCell.push(heat.reversibleW);
    out.generatedHeatWCell.push(heat.generatedW);
    out.coolingWCell.push(thermal.coolingW);
    out.resistanceMOhmCell.push(resistance.r0 * 1000);
    out.platingRisk.push(agingStep.platingRisk);
    out.agingStress.push(agingStep.stressIndex);
    out.powerLimited.push(powerLimited ? 1 : 0);
    out.cutoff.push(cutoff ? 1 : 0);

    if (i < profile.timeS.length - 1) {
      const effectiveCapacityAh = Math.max(cell.capacityAh * aging.soh, cell.capacityAh * 0.5);
      soc = clamp(soc - currentA * dt / (3600 * effectiveCapacityAh), 0, 1);
      temperatureK = thermal.temperatureK;
      advanceEcm(ecm, currentA, resistance, dt);
      if ((soc <= 0 && currentA >= 0) || (soc >= 1 && currentA <= 0)) cutoff = true;
      const e = actualPowerW * dt / 3.6e6;
      netEnergyKWh += e;
      if (e >= 0) dischargedEnergyKWh += e; else recoveredEnergyKWh += -e;
    }
  }

  const limitedFraction = out.powerLimited.reduce((a, b) => a + b, 0) / Math.max(1, out.powerLimited.length);
  const summary = {
    cell,
    prior,
    packNominal,
    finalSoc: last(out.soc, 0),
    finalSoh: last(out.soh, 1),
    finalTemperatureC: last(out.temperatureC, config.thermal.initialTempC),
    maxTemperatureC: Math.max(...out.temperatureC),
    minCellVoltageV: Math.min(...out.cellVoltageV),
    maxCellVoltageV: Math.max(...out.cellVoltageV),
    peakDischargeKW: Math.max(...out.actualPackPowerKW),
    peakRegenKW: Math.min(...out.actualPackPowerKW),
    netEnergyKWh,
    dischargedEnergyKWh,
    recoveredEnergyKWh,
    maxCRate: Math.max(...out.cRate),
    maxPlatingRisk: Math.max(...out.platingRisk),
    limitedFraction,
    cutoff
  };

  if (config.scenario.type === 'reference-1c' && cell.id === 'ae-nmc111-pouch-12p5ah' && datasets.nmcReference) {
    const errors = datasets.nmcReference.timeS.map((t, j) => {
      const idx = nearestIndex(out.timeS, t);
      return out.cellVoltageV[idx] - datasets.nmcReference.voltageV[j];
    });
    summary.referenceRmseV = rms(errors);
    summary.referenceMaxAbsErrorV = Math.max(...errors.map(Math.abs));
  }

  return { config, out, summary };
}
