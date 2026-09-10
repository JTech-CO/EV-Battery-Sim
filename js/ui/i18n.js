import { readStorage, writeStorage, dispatchAppEvent } from '../utils/compat.js';

const dictionaries = {
  ko: {
    appSubtitle: '공개 파라미터 기반 셀·팩·차량 연성 시뮬레이터',
    researchBased: 'EV-Battery-Research 기반',
    modelBadge: '축약 다중물리 모델',
    dataBadge: 'BPX 0.1 + EPA US06',
    config: '시뮬레이션 설정',
    cellPack: '셀 및 팩',
    scenario: '시나리오',
    thermalAging: '열 및 열화',
    vehicle: '차량',
    cellPreset: '셀 프리셋',
    series: '직렬 셀 수 (Ns)',
    parallel: '병렬 셀 수 (Np)',
    initialSoc: '초기 SOC',
    initialSoh: '초기 SOH',
    scenarioType: '부하 시나리오',
    us06: 'EPA US06 주행 사이클',
    ref1c: 'NMC 공개 1C 기준곡선 비교',
    constantPower: '일정 팩 전력',
    constantCurrent: '일정 셀 C-rate',
    power: '팩 전력',
    currentC: '셀 C-rate',
    duration: '지속 시간',
    ambient: '주변 온도',
    initialTemp: '초기 셀 온도',
    cooling: '열전달계수 h',
    agingToggle: '탐색용 열화 prior 적용',
    agingWarning: 'SOH 변화는 공개 열화 데이터에 맞춘 예측이 아니라 screening prior입니다.',
    mass: '차량 질량',
    cd: '항력계수 Cd',
    area: '전면적',
    crr: '구름저항계수 Crr',
    driveEff: '구동 효율',
    regenEff: '회생 효율',
    aux: '보조 부하',
    grade: '도로 경사',
    maxTraction: '최대 구동 전력',
    maxRegen: '최대 회생 전력',
    run: '시뮬레이션 실행',
    reset: '기본값 복원',
    exportCsv: '결과 CSV',
    exportJson: '설정 JSON',
    packVoltage: '팩 전압',
    packCurrent: '팩 전류',
    soc: 'SOC',
    cellTemp: '셀 온도',
    soh: 'SOH',
    netEnergy: '순 배터리 에너지',
    electrochem: '전기화학 상태',
    schematic: '3D 레이어 개략도 - 공간 PDE 해석 결과가 아님',
    terminalV: '단자 전압',
    ocv: 'OCV',
    negOcp: '음극 OCP',
    posOcp: '양극 OCP',
    xn: '음극 stoichiometry',
    xp: '양극 stoichiometry',
    cRate: 'C-rate',
    irrHeat: '비가역',
    revHeat: '가역',
    risk: '모델 상태 / 위험 지표',
    platingRisk: '리튬 석출 위험 지수',
    agingStress: '열화 스트레스 지수',
    powerLimited: 'BMS/모델 전력 제한',
    no: '없음',
    yes: '활성',
    pack3d: '팩 3D 토폴로지',
    pack3dHint: '드래그로 회전 · 휠/핀치로 확대',
    pack3dSchematic: '표시 셀은 토폴로지 샘플이며 실제 셀 전부를 렌더링하지 않습니다.',
    charts: '시계열',
    speed: '차량 속도',
    packPower: '팩 전력',
    voltage: '셀 전압',
    socChart: 'SOC',
    tempChart: '셀 온도',
    heatChart: '셀 열률',
    requested: '요구',
    actual: '실제',
    terminal: '단자',
    generated: '총 생성',
    coolingHeat: '냉각 제거',
    validation: 'NMC 1C 기준곡선 검증',
    rmse: '전압 RMSE',
    maxError: '최대 절대 오차',
    modelScope: '모델 범위 및 출처',
    sourceBased: '출처 기반',
    engineeringPrior: '엔지니어링 prior',
    sourceOcp: 'OCP·stoichiometry·셀 열용량·전압 한계',
    priorEcm: '2-RC 분극 저항·온도 스케일링·C-rate 한계',
    sourceVehicle: 'EPA US06 속도 프로파일',
    priorVehicle: '차량 질량·공력·효율·회생·보조 부하',
    priorAging: '열화/SOH·석출 위험은 탐색용 지표',
    limitation: '본 앱은 OEM 디지털 트윈이나 DFN/P2D 솔버가 아닙니다. 결과는 공개 파라미터와 명시적 가정의 조합입니다.',
    playback: '재생',
    pause: '일시정지',
    summary: '결과 요약',
    nominalPack: '정격 팩',
    cells: '셀',
    maxTemp: '최고 온도',
    peakPower: '최대 방전',
    peakRegen: '최대 회생',
    maxCRate: '최대 C-rate',
    recovered: '회수 에너지',
    limitsActive: '제한 활성 비율',
    runtimeMode: '호환 런타임',
    runtimeNote: '외부 CDN, ES module fetch 없이 정적 데이터 번들로 실행',
    loadError: '앱 초기화에 실패했습니다. 브라우저 콘솔의 오류와 파일 배포 경로를 확인하십시오.'
  },
  en: {
    appSubtitle: 'Coupled cell, pack and vehicle simulator using public parameters',
    researchBased: 'Based on EV-Battery-Research',
    modelBadge: 'Reduced multiphysics model',
    dataBadge: 'BPX 0.1 + EPA US06',
    config: 'Simulation setup',
    cellPack: 'Cell & pack', scenario: 'Scenario', thermalAging: 'Thermal & aging', vehicle: 'Vehicle',
    cellPreset: 'Cell preset', series: 'Series cells (Ns)', parallel: 'Parallel cells (Np)', initialSoc: 'Initial SOC', initialSoh: 'Initial SOH',
    scenarioType: 'Load scenario', us06: 'EPA US06 drive cycle', ref1c: 'NMC public 1C reference comparison', constantPower: 'Constant pack power', constantCurrent: 'Constant cell C-rate',
    power: 'Pack power', currentC: 'Cell C-rate', duration: 'Duration', ambient: 'Ambient temperature', initialTemp: 'Initial cell temperature', cooling: 'Heat transfer coefficient h',
    agingToggle: 'Apply exploratory aging prior', agingWarning: 'SOH change is a screening prior, not a dataset-calibrated lifetime prediction.',
    mass: 'Vehicle mass', cd: 'Drag coefficient Cd', area: 'Frontal area', crr: 'Rolling resistance Crr', driveEff: 'Drive efficiency', regenEff: 'Regen efficiency', aux: 'Auxiliary load', grade: 'Road grade', maxTraction: 'Max traction power', maxRegen: 'Max regen power',
    run: 'Run simulation', reset: 'Restore defaults', exportCsv: 'Result CSV', exportJson: 'Config JSON', packVoltage: 'Pack voltage', packCurrent: 'Pack current', soc: 'SOC', cellTemp: 'Cell temperature', soh: 'SOH', netEnergy: 'Net battery energy',
    electrochem: 'Electrochemical state', schematic: '3D-layer schematic - not a spatial PDE solution', terminalV: 'Terminal voltage', ocv: 'OCV', negOcp: 'Negative OCP', posOcp: 'Positive OCP', xn: 'Negative stoichiometry', xp: 'Positive stoichiometry', cRate: 'C-rate', irrHeat: 'Irreversible', revHeat: 'Reversible',
    risk: 'Model state / risk indicators', platingRisk: 'Lithium plating risk index', agingStress: 'Aging stress index', powerLimited: 'BMS/model power limit', no: 'None', yes: 'Active',
    pack3d: '3D pack topology', pack3dHint: 'Drag to rotate · wheel/pinch to zoom', pack3dSchematic: 'Rendered cells are a topology sample, not every physical cell in the pack.',
    charts: 'Time series', speed: 'Vehicle speed', packPower: 'Pack power', voltage: 'Cell voltage', socChart: 'SOC', tempChart: 'Cell temperature', heatChart: 'Cell heat rate', requested: 'Requested', actual: 'Actual', terminal: 'Terminal', generated: 'Total generated', coolingHeat: 'Cooling removal',
    validation: 'NMC 1C reference validation', rmse: 'Voltage RMSE', maxError: 'Max absolute error', modelScope: 'Model scope & provenance', sourceBased: 'Source-based', engineeringPrior: 'Engineering prior', sourceOcp: 'OCP, stoichiometry, cell heat capacity and voltage limits', priorEcm: '2-RC polarization, temperature scaling and C-rate limits', sourceVehicle: 'EPA US06 speed profile', priorVehicle: 'Vehicle mass, aero, efficiency, regen and auxiliary load', priorAging: 'Aging/SOH and plating risk are exploratory indicators', limitation: 'This app is not an OEM digital twin or a DFN/P2D solver. Results combine public parameters with explicit assumptions.', playback: 'Play', pause: 'Pause', summary: 'Result summary', nominalPack: 'Nominal pack', cells: 'cells', maxTemp: 'Max temperature', peakPower: 'Peak discharge', peakRegen: 'Peak regen', maxCRate: 'Max C-rate', recovered: 'Recovered energy', limitsActive: 'Limit-active fraction', runtimeMode: 'Compatibility runtime', runtimeNote: 'Runs from a static data bundle without CDN or ES-module fetch dependencies.', loadError: 'App initialization failed. Check the browser console and deployed file paths.'
  }
};

let language = readStorage('evbs-language', 'ko');
if (language !== 'en' && language !== 'ko') language = 'ko';

export const getLanguage = function () { return language; };
export const t = function (key) {
  const current = dictionaries[language] || dictionaries.en;
  return current[key] !== undefined ? current[key] : (dictionaries.en[key] !== undefined ? dictionaries.en[key] : key);
};

export function setLanguage(next) {
  language = next === 'en' ? 'en' : 'ko';
  writeStorage('evbs-language', language);
  document.documentElement.lang = language;
  const nodes = document.querySelectorAll('[data-i18n]');
  for (let i = 0; i < nodes.length; i += 1) {
    const el = nodes[i];
    const value = t(el.dataset.i18n);
    if (el.tagName === 'INPUT' && el.type === 'button') el.value = value;
    else el.textContent = value;
  }
  dispatchAppEvent('evbs:language', language);
}
