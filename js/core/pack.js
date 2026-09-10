import { clamp } from '../utils/math.js';

export function nominalPack(cell, prior, seriesCount, parallelCount) {
  return {
    nominalVoltageV: prior.nominalVoltageV * seriesCount,
    nominalCapacityAh: cell.capacityAh * parallelCount,
    nominalEnergyKWh: prior.nominalVoltageV * seriesCount * cell.capacityAh * parallelCount / 1000,
    cellCount: seriesCount * parallelCount
  };
}

export function solveCellCurrentForPackPower({ requestedPowerW, seriesCount, parallelCount, baseCellVoltageV, r0Ohm, cell, prior }) {
  const nsnp = Math.max(1, seriesCount * parallelCount);
  const pPerCellW = requestedPowerW / nsnp;
  let currentA;
  let powerLimited = false;

  if (Math.abs(r0Ohm) < 1e-12) {
    currentA = pPerCellW / Math.max(0.1, baseCellVoltageV);
  } else {
    let disc = baseCellVoltageV * baseCellVoltageV - 4 * r0Ohm * pPerCellW;
    if (disc < 0) {
      disc = 0;
      powerLimited = true;
    }
    currentA = (baseCellVoltageV - Math.sqrt(disc)) / (2 * r0Ohm);
  }

  const maxDischargeA = prior.limits.maxDischargeC * cell.capacityAh;
  const maxChargeA = prior.limits.maxChargeC * cell.capacityAh;
  const limitedByCurrent = currentA > maxDischargeA || currentA < -maxChargeA;
  currentA = clamp(currentA, -maxChargeA, maxDischargeA);

  // Enforce terminal-voltage limits using the instantaneous R0 branch.
  const currentAtLower = (baseCellVoltageV - cell.lowerVoltageV) / Math.max(r0Ohm, 1e-9);
  const currentAtUpper = (baseCellVoltageV - cell.upperVoltageV) / Math.max(r0Ohm, 1e-9);
  if (currentA > currentAtLower) { currentA = Math.max(0, currentAtLower); powerLimited = true; }
  if (currentA < currentAtUpper) { currentA = Math.min(0, currentAtUpper); powerLimited = true; }

  const cellVoltageV = baseCellVoltageV - currentA * r0Ohm;
  const actualPowerW = seriesCount * parallelCount * currentA * cellVoltageV;
  return {
    currentA,
    cellVoltageV,
    packCurrentA: currentA * parallelCount,
    actualPowerW,
    unmetPowerW: requestedPowerW - actualPowerW,
    powerLimited: powerLimited || limitedByCurrent,
    limitedByCurrent
  };
}
