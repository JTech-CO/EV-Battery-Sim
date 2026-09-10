import { clamp } from '../utils/math.js';

export function createAgingState(initialSoh = 1) {
  return { soh: clamp(initialSoh, 0.5, 1), efc: 0, damage: 0 };
}

export function advanceAging(state, { prior, currentA, capacityAh, temperatureK, soc, dt, enabled }) {
  const cRate = Math.abs(currentA) / Math.max(capacityAh, 1e-9);
  const efcIncrement = Math.abs(currentA) * dt / (2 * 3600 * Math.max(capacityAh, 1e-9));
  state.efc += efcIncrement;

  const charge = currentA < 0;
  const lowTemperatureFactor = clamp((288.15 - temperatureK) / 20, 0, 1.5);
  const highSocFactor = clamp((soc - 0.75) / 0.25, 0, 1);
  const highChargeFactor = clamp((cRate - 0.5) / 1.5, 0, 1.5);
  const platingRisk = clamp((charge ? 1 : 0) * lowTemperatureFactor * highSocFactor * highChargeFactor * 100, 0, 100);

  const thermalStress = Math.exp((temperatureK - 298.15) / prior.aging.temperatureScaleK);
  const highSocStress = 1 + prior.aging.highSocWeight * Math.max(0, (soc - 0.7) / 0.3) ** 2;
  const cRateStress = 1 + prior.aging.highCRateWeight * Math.max(0, cRate - 1) ** 1.25;
  const stressIndex = clamp(25 * thermalStress * highSocStress * cRateStress, 0, 100);

  if (enabled) {
    const damageIncrement = prior.aging.damagePerEfc * efcIncrement * thermalStress * highSocStress * cRateStress;
    state.damage += damageIncrement;
    state.soh = clamp(state.soh - damageIncrement, 0.5, 1);
  }

  return { state, cRate, platingRisk, stressIndex };
}
