export function thermalCapacityJperK(cell) {
  return cell.specificHeatJkgK * cell.densityKgM3 * cell.volumeM3;
}

export function heatRates({ currentA, ocvV, terminalVoltageV, temperatureK, dOcvdTK }) {
  const irreversibleW = currentA * (ocvV - terminalVoltageV);
  const reversibleW = -currentA * temperatureK * dOcvdTK;
  return { irreversibleW, reversibleW, generatedW: irreversibleW + reversibleW };
}

export function advanceThermal({ cell, temperatureK, ambientK, generatedW, heatTransferCoeffWm2K, dt }) {
  const cth = thermalCapacityJperK(cell);
  const coolingW = heatTransferCoeffWm2K * cell.externalSurfaceAreaM2 * (temperatureK - ambientK);
  const dT = (generatedW - coolingW) * dt / Math.max(cth, 1e-9);
  return { temperatureK: temperatureK + dT, coolingW, thermalCapacityJperK: cth };
}
