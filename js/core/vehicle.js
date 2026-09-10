import { mphToMps } from '../utils/math.js';

const G = 9.80665;
const RHO_AIR = 1.225;

export function accelerationAt(speedMps, index, dt = 1) {
  if (speedMps.length < 2) return 0;
  if (index <= 0) return (speedMps[1] - speedMps[0]) / dt;
  if (index >= speedMps.length - 1) return (speedMps[index] - speedMps[index - 1]) / dt;
  return (speedMps[index + 1] - speedMps[index - 1]) / (2 * dt);
}

export function vehiclePowerDemand(vehicle, speedMps, accelerationMps2) {
  const grade = Math.atan(vehicle.gradePct / 100);
  const mEq = vehicle.massKg * vehicle.rotatingMassFactor;
  const inertialN = mEq * accelerationMps2;
  const rollingN = vehicle.massKg * G * vehicle.cRr * Math.cos(grade);
  const gradeN = vehicle.massKg * G * Math.sin(grade);
  const aeroN = 0.5 * RHO_AIR * vehicle.cd * vehicle.frontalAreaM2 * speedMps * speedMps;
  const wheelForceN = inertialN + rollingN + gradeN + aeroN;
  const wheelPowerW = wheelForceN * speedMps;

  let batteryPowerW;
  if (wheelPowerW >= 0) {
    batteryPowerW = wheelPowerW / Math.max(0.01, vehicle.driveEfficiency) + vehicle.auxPowerKW * 1000;
  } else {
    const regenW = Math.max(wheelPowerW * vehicle.regenEfficiency, -vehicle.maxRegenKW * 1000);
    batteryPowerW = regenW + vehicle.auxPowerKW * 1000;
  }
  batteryPowerW = Math.min(batteryPowerW, vehicle.maxTractionKW * 1000 + vehicle.auxPowerKW * 1000);
  return { wheelForceN, wheelPowerW, batteryPowerW, inertialN, rollingN, gradeN, aeroN };
}

export function us06Profile(us06) {
  const speedMph = us06.speedMph;
  return {
    dt: us06.samplePeriodS,
    timeS: speedMph.map((_, i) => i * us06.samplePeriodS),
    speedMph,
    speedMps: speedMph.map(mphToMps)
  };
}
