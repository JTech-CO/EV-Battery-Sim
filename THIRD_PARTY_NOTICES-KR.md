# 제3자 자료 고지

## About:Energy 파라미터 자료
`assets/data/cell-presets.json`의 NMC111/graphite·LFP/graphite 파라미터 일부, 해당 OCP/엔트로피 함수의 JavaScript 전사본, `assets/data/nmc-reference-1c.json`은 `JTech-CO/EV-Battery-Research`에 보존된 About:Energy BPX 파라미터 자료를 바탕으로 한 변형 자료다.

원 프로젝트: https://github.com/About-Energy-OpenSource/About-Energy-BPX-Parameterisation
라이선스: CC BY-SA 4.0
https://creativecommons.org/licenses/by-sa/4.0/

필드 선별·명칭 변경·JSON 재구조화·안전한 하드코딩 함수 전사·축약 모델 적용·기준곡선 패키징 등의 변경이 있다. 저작자 표시, 라이선스 링크, 변경 고지를 유지해야 하며 About:Energy가 본 프로젝트를 보증한다는 뜻이 아니다.

원 파라미터 헤더에는 사이클링·셀 해체 기반 값, 문헌의 전해질/엔트로피 값, 추정 열물성이 혼재한다고 명시되어 있다. 본 시뮬레이터도 모든 값을 실측값으로 재표기하지 않는다.

## 미국 EPA US06
`assets/data/us06.json`은 EV-Battery-Research에서 사용한 미국 환경보호청의 US06 규정 속도 프로파일을 전사한 것이다.

EPA 원문: https://www.epa.gov/system/files/other-files/2025-03/us06col.txt
주행 사이클 안내: https://www.epa.gov/vehicle-and-fuel-emissions-testing/dynamometer-drive-schedules
EPA 저작권/면책: https://www.epa.gov/web-policies-and-procedures/epa-disclaimers

프로파일은 차량의 규정 속도 입력으로만 사용한다. 배터리 전류 실측값이 아니며 EPA가 본 차량/배터리 모델을 검증했다는 뜻도 아니다.

## EV-Battery-Research
연구 해석, 출처 판단, 데이터 구성은 https://github.com/JTech-CO/EV-Battery-Research/ 를 기반으로 한다. 연구 자산을 재배포할 때 해당 프로젝트 링크와 각 원 출처를 유지한다.
