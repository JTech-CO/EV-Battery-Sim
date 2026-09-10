import { clamp, interp1 } from '../utils/math.js';

const lfpPositiveEntropicX = [0,0.05,0.1,0.15,0.2,0.25,0.3,0.35,0.4,0.45,0.5,0.55,0.6,0.65,0.7,0.75,0.8,0.85,0.9,0.95,1];
const lfpPositiveEntropicY = [0.0001,4.7145e-5,3.7666e-5,2.0299e-5,5.9833e-6,-4.6859e-6,-1.3966e-5,-2.3528e-5,-3.3593e-5,-4.3433e-5,-5.2311e-5,-6.0211e-5,-6.8006e-5,-7.6939e-5,-8.7641e-5,-9.913e-5,-0.00010855,-0.00011266,-0.00011238,-0.00010921,-0.00022539];

function nmcNegativeOcp(x) {
  return 9.47057878e-1 * Math.exp(-1.59418743e2 * x)
    - 3.50928033e4
    + 1.64230269e-1 * Math.tanh(-4.55509094e1 * (x - 3.24116012e-2))
    + 3.69968491e-2 * Math.tanh(-1.96718868e1 * (x - 1.68334476e-1))
    + 1.91517003e4 * Math.tanh(3.19648312 * (x - 1.85139824))
    + 5.42448511e4 * Math.tanh(-3.19009848 * (x - 2.01660395));
}

function nmcPositiveOcp(x) {
  return -3.04420906 * x + 10.04892207
    - 0.65637536 * Math.tanh(-4.02134095 * (x - 0.80063948))
    + 4.24678547 * Math.tanh(12.17805062 * (x - 7.57659337))
    - 0.3757068 * Math.tanh(59.33067782 * (x - 0.99784492));
}

function lfpGraphiteNegativeOcp(x) {
  return 5.29210878e1 * Math.exp(-1.72699386e2 * x)
    - 1.17963399e3
    + 1.20956356e3 * Math.tanh(6.72033948e1 * (x + 2.44746396e-2))
    + 4.52430314e-2 * Math.tanh(-1.47542326e1 * (x - 1.62746053e-1))
    + 2.018558e1 * Math.tanh(-2.46666302e1 * (x - 1.12986136))
    + 2.01708039e-2 * Math.tanh(-1.19900231e1 * (x - 5.4977344e-1))
    + 4.99616805e1 * Math.tanh(-6.11370883e1 * (x + 4.69382558e-3));
}

function lfpPositiveOcp(x) {
  return 3.41285712 - 1.49721852e-2 * x
    + 3.54866018e14 * Math.exp(-3.95729493e2 * x)
    - 1.45998465 * Math.exp(-1.10108622e2 * (1 - x));
}

function graphiteEntropic(x) {
  return (-0.1112 * x + 0.02914 + 0.3561 * Math.exp(-((x - 0.08309) ** 2) / 0.004616)) / 1000;
}

const ocpModels = {
  ae_nmc_negative: nmcNegativeOcp,
  ae_nmc_positive: nmcPositiveOcp,
  ae_lfp_graphite_negative: lfpGraphiteNegativeOcp,
  ae_lfp_positive: lfpPositiveOcp
};

const entropicModels = {
  ae_graphite_entropic: graphiteEntropic,
  ae_nmc_positive_entropic: () => -1e-4,
  ae_lfp_positive_entropic: x => interp1(lfpPositiveEntropicX, lfpPositiveEntropicY, x)
};

export function electrodeStoichiometry(cell, soc) {
  const z = clamp(soc, 0, 1);
  const xn = cell.negative.stoichMin + z * (cell.negative.stoichMax - cell.negative.stoichMin);
  const xp = cell.positive.stoichMax - z * (cell.positive.stoichMax - cell.positive.stoichMin);
  return { xn, xp };
}

export function electrochemicalState(cell, soc) {
  const { xn, xp } = electrodeStoichiometry(cell, soc);
  const un = ocpModels[cell.negative.ocpModel](xn);
  const up = ocpModels[cell.positive.ocpModel](xp);
  const dunDT = entropicModels[cell.negative.entropicModel](xn);
  const dupDT = entropicModels[cell.positive.entropicModel](xp);
  return {
    xn,
    xp,
    negativeOcpV: un,
    positiveOcpV: up,
    ocvV: up - un,
    dOcvdTK: dupDT - dunDT,
    negativeLithiation: clamp((xn - cell.negative.stoichMin) / (cell.negative.stoichMax - cell.negative.stoichMin), 0, 1),
    positiveLithiation: clamp((xp - cell.positive.stoichMin) / (cell.positive.stoichMax - cell.positive.stoichMin), 0, 1)
  };
}
