# EV Battery Sim

[English](README.md) · [기반 연구 저장소](https://github.com/JTech-CO/EV-Battery-Research/)

**EV Battery Sim**은 `JTech-CO/EV-Battery-Research`의 공개 연구·데이터 패키지를 바탕으로 만든 의존성 없는 정적 브라우저 시뮬레이터이다. 출처 기반 OCP/stoichiometry 계층에 축약 전기 모델, 집중정수 열 모델, 팩 토폴로지, 차량 종방향 동역학, EPA US06 속도 프로파일을 연성한다.

이 프로그램은 **DFN/P2D 솔버, OEM 디지털 트윈, 안전 인증 도구, 검증된 수명 예측기라고 주장하지 않는다.** UI에서 출처 기반 값과 엔지니어링 prior를 구분한다.

## 구현 범위

- About:Energy NMC111/graphite 12.5 Ah 파우치 셀과 LFP/graphite 2 Ah 18650 셀 프리셋
- 출처 OCP 적합식, stoichiometry 구간, 셀 전압 한계, 열용량 관련 입력 및 일부 구조·전해질 메타데이터
- 명시적 엔지니어링 prior를 사용하는 2-RC Thevenin 분극 모델
- 비가역/가역 발열 진단과 대류 냉각 경계를 포함한 집중정수 열수지
- `Ns × Np` 팩과 팩 전력 → 셀 전류 연산, 전압·C-rate 제한
- EPA US06 1 Hz / 601점 규정 속도와 차량 질량·공력·구름저항·구동효율·회생효율·보조부하 모델
- 일정 팩 전력 / 일정 셀 C-rate 실험
- NMC 공개 1C 기준곡선과의 전압 RMSE·최대 절대오차 비교
- 탐색용 SOH 및 리튬 석출 위험 지표. **열화 데이터셋으로 보정한 수명 예측값이 아님**
- 한국어/영어 UI, 데스크톱·모바일 반응형, 시간축 재생, CSV/JSON 내보내기

## 모델 흐름

```text
출처 OCP + stoichiometry
          ↓
2-RC 단자전압 근사
          ↓
집중정수 열수지
          ↓
Ns × Np 팩 제약
          ↓
차량 종방향 동역학 / EPA US06
```

방정식, 가정, 부호 규약, 유효 범위는 [`docs/MODEL-NOTES-KR.md`](docs/MODEL-NOTES-KR.md)에 정리했다.

## 로컬 실행

ES Module과 `fetch()`를 사용하므로 `index.html`을 `file://`로 직접 열지 말고 HTTP 서버를 사용한다.

```bash
python -m http.server 8000
# http://localhost:8000/ 접속
```

빌드 과정이나 npm 설치는 필요하지 않다.

## GitHub Pages 배포

루트 자체가 정적 Pages 구조다.

```text
index.html
css/
js/
assets/
.nojekyll
```

저장소 브랜치에 파일을 푸시한 뒤 **Settings → Pages**에서 해당 브랜치의 루트(`/`)를 배포 대상으로 설정하면 된다. 앱 내부 경로는 모두 상대 경로이므로 `https://<user>.github.io/<repo>/` 형태의 Project Pages에서도 별도 base URL 변경 없이 동작한다.

## 과학적 해석 범위

브라우저 커널은 전해질 농도장의 PDE, 전극 두께 방향 전위 분포, 입자 반경 방향 확산 PDE, 셀 내부 공간 온도장, 기작별 SEI/석출 리튬 질량수지를 풀지 않는다. 그러한 상태를 직접 계산하려면 PyBaMM 등의 SPM/SPMe/DFN 계열 과학 솔버와 추가 검증 자료가 필요하다. 화면의 셀 내부 리튬 이동 애니메이션은 **개략도**로 명시한다.

또한 포함된 NMC 1C 비교의 전압 오차가 작더라도 그것은 해당 조건의 단자 전압 비교일 뿐, 내부 농도·열구배·열화 기작까지 검증했다는 의미가 아니다.

## 폴더 구조

```text
EV-Battery-Sim/
├── index.html
├── css/                 # base/layout/components/responsive
├── js/
│   ├── core/            # 축약 과학 커널
│   ├── ui/              # 차트·개략도·i18n·UI 바인딩
│   ├── utils/
│   └── main.js
├── assets/
│   ├── data/
│   └── icons/
├── docs/
├── tests/
├── .nojekyll
├── LICENSE
└── THIRD_PARTY_NOTICES-KR.md
```

## 테스트

```bash
node tests/smoke.mjs
```

데이터 배열, OCV 종점의 타당 범위, US06 연산의 유한값, NMC 기준곡선 비교 경로를 검사한다. 이는 소프트웨어·수치 QA이며 실험적 물리 검증이 아니다.

## 라이선스

혼합 라이선스 저장소이다. 새 시뮬레이터 코드와 자체 UI 자산은 MIT로 제공한다. About:Energy 파라미터에서 파생한 하위 데이터에는 **CC BY-SA 4.0**의 저작자 표시·동일조건변경허락 요건을 유지한다. EPA 자료는 별도 고지를 따른다. 재배포 전 [`THIRD_PARTY_NOTICES-KR.md`](THIRD_PARTY_NOTICES-KR.md)를 확인한다.
