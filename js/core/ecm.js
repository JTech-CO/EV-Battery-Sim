import { clamp } from '../utils/math.js';

export function createEcmState() {
  return { v1: 0, v2: 0 };
}

export function resistanceScale(prior, soc, temperatureK, soh = 1) {
  const lowTempDelta = Math.max(0, 298.15 - temperatureK);
  const highTempDelta = Math.max(0, temperatureK - 298.15);
  const tempScale = Math.exp(prior.temperatureResistanceCoeffPerK * lowTempDelta - 0.004 * highTempDelta);
  const edgeScale = 1
    + 0.62 * Math.exp(-clamp(soc, 0, 1) / 0.075)
    + 0.15 * Math.exp(-(1 - clamp(soc, 0, 1)) / 0.08);
  const healthScale = 1 + 1.8 * Math.max(0, 1 - soh);
  return clamp(tempScale * edgeScale * healthScale, 0.55, 6);
}

export function ecmResistances(prior, soc, temperatureK, soh = 1) {
  const scale = resistanceScale(prior, soc, temperatureK, soh);
  return {
    r0: prior.ecm.r0Ohm * scale,
    r1: prior.ecm.r1Ohm * scale,
    r2: prior.ecm.r2Ohm * scale,
    tau1: prior.ecm.tau1S,
    tau2: prior.ecm.tau2S,
    scale
  };
}

export function terminalVoltage(ocvV, currentA, state, resistance) {
  return ocvV - currentA * resistance.r0 - state.v1 - state.v2;
}

export function advanceEcm(state, currentA, resistance, dt) {
  const a1 = Math.exp(-dt / Math.max(1e-6, resistance.tau1));
  const a2 = Math.exp(-dt / Math.max(1e-6, resistance.tau2));
  state.v1 = state.v1 * a1 + currentA * resistance.r1 * (1 - a1);
  state.v2 = state.v2 * a2 + currentA * resistance.r2 * (1 - a2);
  return state;
}
