# EV Battery Sim

[English](README.md) · [기반 연구 저장소](https://github.com/JTech-CO/EV-Battery-Research/)

**EV Battery Sim**은 `JTech-CO/EV-Battery-Research`의 공개 연구·데이터 패키지를 바탕으로 만든 정적 브라우저 시뮬레이터이다. 출처 기반 OCP/stoichiometry 계층에 축약 전기 모델, 집중정수 열 모델, 팩 토폴로지, 차량 종방향 동역학, EPA US06 속도 프로파일을 연성한다.

이 프로그램은 **DFN/P2D 솔버, OEM 디지털 트윈, 안전 인증 도구, 검증된 수명 예측기라고 주장하지 않는다.** UI에서 출처 기반 값과 엔지니어링 prior를 구분한다.

## 구현 범위

- About:Energy NMC111/graphite 12.5 Ah 파우치 셀과 LFP/graphite 2 Ah 18650 셀 프리셋
- 출처 OCP 적합식, stoichiometry 구간, 셀 전압 한계, 열용량 관련 입력 및 일부 구조·전해질 메타데이터
- 명시적 엔지니어링 prior를 사용하는 2-RC Thevenin 분극 모델
- 비가역/가역 발열 진단과 대류 냉각 경계를 포함한 집중정수 열수지
- `Ns × Np` 팩과 팩 전력에서 셀 전류를 계산하는 전압·C-rate 제한 모델
- EPA US06 1 Hz / 601점 규정 속도와 차량 질량·공력·구름저항·구동효율·회생효율·보조부하 모델
- 일정 팩 전력 / 일정 셀 C-rate 실험
- NMC 공개 1C 기준곡선과의 전압 RMSE·최대 절대오차 비교
- 탐색용 SOH 및 리튬 석출 위험 지표. **열화 데이터셋으로 보정한 수명 예측값이 아님**
- 한국어/영어 UI, 데스크톱·태블릿·모바일 반응형 레이아웃, 시간축 재생, CSV/JSON 내보내기
- 깊이 표현이 적용된 셀 레이어 시각화와 드래그 회전 가능한 팩 3D 토폴로지 시각화

## 모델 흐름

```text
출처 OCP + stoichiometry
          |
          v
2-RC 단자전압 근사
          |
          v
집중정수 열수지
          |
          v
Ns × Np 팩 제약
          |
          v
차량 종방향 동역학 / EPA US06
```

방정식, 가정, 부호 규약, 유효 범위는 [`docs/MODEL-NOTES-KR.md`](docs/MODEL-NOTES-KR.md)에 정리했다.

## 브라우저 호환성 개선

v1.1부터 기본 실행 경로는 ES module과 JSON `fetch()`에 의존하지 않는다. `assets/data/*.json`은 유지하되 `js/runtime-data.js`에 정적 런타임 데이터를 함께 패키징하고, 분할된 소스 모듈은 `js/app.bundle.js` 클래식 스크립트로 빌드해 실제 페이지가 이를 사용한다.

이 구조는 다음과 같은 로딩 실패 요인을 줄인다.

- `file://`에서 ES module 또는 JSON fetch가 차단되는 문제
- 일부 브라우저에서 `localStorage` 접근이 예외를 발생시키는 문제
- `structuredClone`, `ResizeObserver`, `Array.at`, `flatMap`, optional chaining/nullish 문법 지원 차이
- `backdrop-filter` 미지원 시 시각 효과 때문에 레이아웃이 영향을 받는 문제

`ResizeObserver`가 없으면 window resize 기반 폴백을 사용하고, `localStorage`가 차단되면 언어 설정 저장만 생략한다. 따라서 `index.html`을 직접 열어도 기본 데이터로 실행할 수 있다. GitHub Pages 또는 HTTP 서버 실행은 여전히 권장한다.

## 로컬 실행

가장 간단한 방법은 `index.html`을 브라우저에서 직접 여는 것이다. 개발 중에는 HTTP 서버를 권장한다.

```bash
python -m http.server 8000
# http://localhost:8000/
```

별도 npm 설치나 빌드 과정은 배포에 필요하지 않는다.

소스 모듈 또는 데이터 JSON을 수정한 경우에는 포함된 빌드 스크립트로 런타임 번들을 다시 생성한다.

```bash
python scripts/build_runtime.py
```

## GitHub Pages 배포

루트 자체가 정적 Pages 구조다.

```text
index.html
css/
js/
assets/
.nojekyll
```

저장소 브랜치에 파일을 푸시한 뒤 **Settings > Pages**에서 해당 브랜치의 루트(`/`)를 배포 대상으로 설정하면 된다. 앱 내부 경로는 모두 상대 경로이므로 `https://<user>.github.io/<repo>/` 형태의 Project Pages에서도 별도 base URL 변경 없이 동작하도록 구성했다.

## 반응형 UI

- 데스크톱: 좌측 고정 입력 패널 + 우측 대시보드
- 태블릿: 입력 패널을 상단 전체폭으로 이동하고 입력 필드를 다열 구성
- 모바일: 입력, 상태표, 진단, 요약, 차트를 1열 중심으로 재배치
- 360px 이하: 지표와 내보내기 버튼까지 단일 열로 전환
- iOS 입력 확대를 줄이기 위해 매우 좁은 화면의 form control은 16px로 보정
- 3D 팩 캔버스는 터치 pointer drag를 지원하고 화면 폭에 따라 렌더링 셀 수를 자동 축소

## 과학적 해석 범위

브라우저 커널은 전해질 농도장의 PDE, 전극 두께 방향 전위 분포, 입자 반경 방향 확산 PDE, 셀 내부 공간 온도장, 기작별 SEI/석출 리튬 질량수지를 풀지 않는다. 그러한 상태를 직접 계산하려면 PyBaMM 등의 SPM/SPMe/DFN 계열 과학 솔버와 추가 검증 자료가 필요하다. 화면의 셀 레이어와 팩 3D 표현은 **상태를 설명하는 개략 시각화**이지 3D 전기화학/열 해석 결과가 아니다.

또한 포함된 NMC 1C 비교의 전압 오차가 작더라도 그것은 해당 조건의 단자 전압 비교일 뿐, 내부 농도·열구배·열화 기작까지 검증했다는 의미가 아니다.

## 폴더 구조

```text
EV-Battery-Sim/
|-- index.html
|-- css/
|   |-- base.css
|   |-- layout.css
|   |-- components.css
|   `-- responsive.css
|-- js/
|   |-- core/              # 축약 과학 커널
|   |-- ui/                # 차트, 셀/팩 시각화, i18n, UI 바인딩
|   |-- utils/             # 수학, export, 호환성 유틸
|   |-- main.js            # 분할 소스 진입점
|   |-- runtime-data.js    # 생성된 정적 데이터 번들
|   `-- app.bundle.js      # 생성된 클래식 브라우저 런타임
|-- assets/
|   |-- data/
|   `-- icons/
|-- scripts/
|   `-- build_runtime.py
|-- docs/
|-- tests/
|-- .nojekyll
|-- LICENSE
`-- THIRD_PARTY_NOTICES-KR.md
```

## 테스트

```bash
python scripts/build_runtime.py
node tests/smoke.mjs
```

데이터 배열, OCV 종점의 타당 범위, US06 연산의 유한값, NMC 기준곡선 비교 경로, 런타임 데이터 번들, 클래식 JS 번들의 구문과 주요 파일 참조를 검사한다. 이는 소프트웨어·수치 QA이며 실험적 물리 검증이 아니다.

## 라이선스

혼합 라이선스 저장소이다. 새 시뮬레이터 코드와 자체 UI 자산은 MIT로 제공한다. About:Energy 파라미터에서 파생한 하위 데이터에는 **CC BY-SA 4.0**의 저작자 표시·동일조건변경허락 요건을 유지한다. EPA 자료는 별도 고지를 따른다. 재배포 전 [`THIRD_PARTY_NOTICES-KR.md`](THIRD_PARTY_NOTICES-KR.md)를 확인한다.
