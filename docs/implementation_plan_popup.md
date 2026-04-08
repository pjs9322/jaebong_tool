# 홈페이지 유지보수 의뢰서 생성 전 팝업 추가 가이드

본 문서는 '홈페이지 유지보수 의뢰서 생성하기' 버튼 클릭 시, 사용자로부터 유지보수 대상 URL을 수집하고 현재 작성된 요청사항 현황을 리마인드하는 팝업 기능을 추가하기 위한 단계별 구현 가이드입니다.

## 1. 개요
사용자가 최종 의뢰서를 생성하기 전, 다음 정보를 확인하고 입력할 수 있는 단계를 추가합니다.
- **수집**: 유지보수 대상 홈페이지 URL
- **리마인드**: 작성중, 작성완료, 다른문제별 요청사항 개수 요약
- **안내**: '작성중'인 항목은 의뢰서에 포함되지 않음을 고지

## 2. 세부 구현 단계

### STEP 1: UI 구조 설계 (HTML)
`index.php` 파일에 팝업을 위한 HTML 레이어를 추가합니다. 기존 `overlay-layer` 스타일을 활용하거나 전용 모달 구조를 정의합니다.

- **위치**: `index.php` 하단 (모달 레이어들이 모여있는 곳)
- **구성 요소**:
  - `id="sharePopupLayer"`: 전체 배경 레이어 (딤드 처리)
  - `id="sharePopupCard"`: 팝업 카드 (중앙 정렬)
  - URL 입력 필드 (`input type="text" id="maintUrlIn"`)
  - 현황판 (작성중, 작성완료, 다른문제, 합계 카운터 영역)
  - 안내 문구 (빨간색 텍스트)
  - '시작' 버튼 (`id="btnStartShare"`)

### STEP 2: 스타일링 (CSS)
`css/main.css`에 팝업 전용 스타일을 추가합니다.

- **디자인 가이드**:
  - 배경: `rgba(0,0,0,0.5)` 딤드 처리
  - 카드: 흰색 배경, 둥근 모서리(`border-radius: 20px`), 중앙 배치
  - 카운터 영역: 4개의 컬럼으로 구성, 하단에 숫자 배치
  - 숫자 색상: '작성중'은 `--action-pink` 활용
  - 버튼: 검정색 배경, 큰 버튼 스타일

### STEP 3: UI 엘리먼트 캐싱 (JS)
`js/store/elements.js`의 `initUI()` 함수에 새로 추가한 엘리먼트들을 등록합니다.

- `UI.sharePopupLayer`, `UI.maintUrlIn`, `UI.btnStartShare` 등 추가
- 카운터 숫자를 표시할 엘리먼트들 (`UI.cntIncomplete`, `UI.cntComplete`, `UI.cntAsset`, `UI.cntTotal`)

### STEP 4: 팝업 노출 및 카운팅 로직 (JS)
`js/core/viewer.js`의 `initViewer()` 내 `UI.shareBtn.onclick` 핸들러를 수정합니다.

1.  **동작 변경**: 버튼 클릭 시 즉시 로딩(`showLoadingAndSwitch`)으로 넘어가지 않고, 팝업 레이어를 활성화합니다.
2.  **카운팅 함수 구현**: `S.history` 배열을 순회하여 각 상태별 개수를 계산합니다.
    - **작성중**: `h.isCompleted === false`
    - **작성완료**: `h.isAsset === false && (h.isCompleted === undefined || h.isCompleted === true)`
    - **다른문제**: `h.isAsset === true && (h.isCompleted === undefined || h.isCompleted === true)`
    - **합계**: 작성완료 + 다른문제
3.  **UI 기초 체력 설정**: 계산된 숫자를 팝업 내 엘리먼트의 `innerText`로 주입하고, URL 입력창(`UI.maintUrlIn`)의 값을 비운 뒤 '시작' 버튼을 기본적으로 비활성화(`disabled`) 처리합니다.

### STEP 5: 버튼 상태 관리 및 최종 실행 (JS)
URL 입력 여부에 따라 '시작' 버튼의 활성화 상태를 제어하고 클릭 이벤트를 처리합니다.

1.  **실시간 유효성 검사 (Validation)**: `UI.maintUrlIn.oninput` 이벤트를 통해 입력값을 실시간으로 감시합니다.
    - 입력값이 없을 경우: `UI.btnStartShare.disabled = true;` 를 설정하여 클릭을 차단하고, CSS(Opacity)를 통해 반투명하게 표시합니다.
    - 입력값이 있을 경우: `UI.btnStartShare.disabled = false;` 로 전환하여 버튼을 활성화합니다.
2.  **최종 실행**: 활성화된 '시작' 버튼(`UI.btnStartShare`) 클릭 시 다음을 수행합니다.
    - **URL 수집**: `UI.maintUrlIn.value`를 수집하여 필요 시 서비스 파라미터로 전달합니다.
    - **팝업 닫기**: 팝업 레이어의 `active` 클래스를 제거합니다.
    - **기존 로직 연동**: 기존의 `showLoadingAndSwitch()` 함수를 호출하여 의뢰서 생성 애니메이션 및 화면 전환을 진행합니다.

## 3. 주의사항
- **반응형 대응**: 모바일 화면에서도 팝업 카드가 잘리지 않도록 최대 너비(`max-width: 90%`) 및 패딩 처리를 확인해야 합니다.
- **예외 처리**: URL이 입력되지 않았을 경우 '시작' 버튼의 활성/비활성 여부 또는 기본값 처리 정책을 결정해야 합니다.
- **UX**: 팝업 외부 영역 클릭 시 팝업이 닫히는 기능을 추가하여 편의성을 높입니다.
