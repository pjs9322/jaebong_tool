# 🧵 재봉툴 PRO v13 프로젝트 분석 리포트 (Research)

이 문서는 "재봉툴 PRO v13" (홈페이지 유지보수 의뢰서 생성 AI 어시스턴트) 프로젝트의 전체 구성, 핵심 기능, 상태 관리, 사용자 흐름(User Flow)을 포괄적으로 보여줍니다. 바닐라 JS(Vanilla JS) 기반의 프론트엔드 환경에서 어플리케이션이 어떻게 모듈화되어 동작하는지 분석합니다.

---

## 📂 1. 프로젝트 디렉터리 아키텍처

로컬에 위치한 `main.css`, `index.html`과 더불어 JavaScript가 완전한 모듈 시스템으로 분리되어 있습니다.

```text
d:\project\AG_workspace\jaebong\
├── index.html                 # 메인 화면 구조 및 라이브러리 (jsPDF, html2canvas, QRCode) 선언
├── css/
│   ├── main.css               # 전반적인 레이아웃 및 스타일링
│   └── viewer.css             # 공유(뷰어) 모드 및 채팅 UI 스타일링
└── js/
    ├── main.js                # Entry Point (모듈 초기화 로직 및 튜토리얼 제어)
    ├── store/
    │   ├── state.js           # 어플리케이션 전역 상태 보관 (상태머신, 배열 등)
    │   └── elements.js        # DOM 요소를 캐싱해 두는 UI 객체
    ├── core/
    │   ├── canvas.js          # Core: 캔버스 이벤트, 영역 그리기/리사이징, 렌더링
    │   ├── history.js         # Core: 하단 큐(리스트) 저장/수정/삭제 로직
    │   └── viewer.js          # Core: 상태 칩 변경 및 모의 채팅 열람 모드
    ├── services/
    │   └── pdfExport.js       # Service: html2canvas & jsPDF를 통한 PDF 생성
    └── utils/
        └── imageLoader.js     # Util: 화면 녹화 커스텀 캡처, 파일 업로드, 클립보드 복사
```

---

## 🎯 2. 주요 기능 및 사용자 흐름 (User Flow)

프로젝트는 유지보수 대상을 지정하고 수정사항을 표시한 후 의뢰서를 작성해 공유/다운로드하는 흐름으로 이루어집니다.

### STEP 1: 화면/이미지 가져오기 (`utils/imageLoader.js`)
- **화면 캡쳐 (Screen Capture)**: `navigator.mediaDevices.getDisplayMedia` 브라우저 화면 공유 API를 사용해 캔버스로 변환.
- **파일 불러오기**: 클릭 이벤트를 트리거하여 `accept="image/*"` 형식 파일을 `FileReader`로 `DataURL` 변환.
- **클립보드 지원 (Paste)**: `window.addEventListener('paste')` 이벤트로 클립보드의 이미지 직접 붙여넣기 기능 지원.

### STEP 2 & 3: 워크 캔버스 작성 (`core/canvas.js`) & 메모 생성
- **URL & QR코드 생성**: 입력란에 페이지 URL을 작성하면 `QRCode` 라이브러리를 통해 즉시 QR코드가 캔버스 우하단 영역 처리를 위해 메모리에 저장됨.
- **카테고리 설정**: 4가지 카테고리 (내용 수정, 항목 추가, 기능 수정, 기능 개발) 선택 가능.
- **영역 지정 (박스 치기)**:
  - 캔버스 내 마우스를 드래그하여 목표 영역을 박스(`S.draftRect`) 형태로 선택.
  - 마우스를 뗄 때, 박스의 상태가 `MEMO_WAIT`으로 진입하여 **STEP 03**의 메모 작성 폼 활성화. 
- **메모 및 어노테이션 (`S.annos`)**:
  - 메모를 입력하고 확인을 누르면 배열에 `[번호, 영역정보, 텍스트]`가 저장됨.
  - 생성된 박스는 **이동(move)** 및 **8방향 리사이징(n, s, e, w, ne, nw, se, sw)** 이 가능.  
- **줌 (Zoom)**: 100% 모드 원본 보기 / 화면 맞춤 (Fit Mode) 기능 토글.

### STEP 4: 내역 (History) 관리 (`core/history.js`)
- **목록 추가**: 수정 사항을 캔버스 이미지(DataURL 기반 Thumb & Full)로 직렬화하여 `S.history` 배열에 큐 형태로 저장.
- **수정 (덮어쓰기)**: 저장된 히스토리 카드의 '수정' 버튼 클릭 시, 기존 이미지를 캔버스에 띄우고 메모 데이터를 복구.
- **삭제**: 리스트 요소 삭제. (리스트가 비워지면 상단 PDF/공유 버튼 비활성화)

### STEP 5: 내보내기 및 뷰어 (`services/pdfExport.js` & `core/viewer.js`)
- **PDF 다운로드**: 내역들을 순회하며, 모의 DOM HTML(양식 패널 포함)을 `div`로 제작. `html2canvas`로 찍은 후 `jsPDF`를 이용해 A4 다중 페이지 형태로 PDF 저장. 
- **공유 뷰어 모드 (Viewer)**: URL로 접속해 피드백을 주고받는 상황 모방.
  - 의뢰 상태 변경 Select Box (`🟡 검토요청`, `🔵 검토중`, `🟢 검토완료`).
  - 우측에 모의 **"통신 채팅창(History 모의 뷰)"** 제공. 입력 시 1.2초 후 시스템 자동 답변이 실행됨.

---

## 🧠 3. 전역 상태와 변수 (`store/state.js`)

앱 전체를 중앙에서 통제하는 전역 변수 `S` 객체.

```javascript
/* state.js - S 객체의 주요 속성 */
export const S = {
    // [이미지 상태]
    img: null,            // 현재 로드된 Image 객체
    w: 0,                 // 원본 너비
    h: 0,                 // 원본 높이
    baseImgSrc: null,     // Base64 소스
    
    // [캔버스 및 메모 상태]
    annos: [],            // 작성 중인 메모 목록. [{ id: Date.now(), rect: {x, y, w, h}, text: '내용' }] 
    draftRect: null,      // 드래그 중인 임시 사각형
    activeAnnoId: null,   // 선택(포커스)된 기존 메모의 ID 
    
    // [상태 머신 컨트롤 (FSM)]
    state: 'IDLE',        // 'IDLE', 'DRAWING', 'EDITING', 'MEMO_WAIT'
    action: null,         // 'move' 혹은 리사이즈 핸들 ('nw', 'se' 등)
    dragStart: { x:0, y:0 }, // 마우스 오프셋 저장
    
    // [저장 & 데이터]
    history: [],          // 하단 리스트에 저장된 객체 배열 (썸네일, 카테고리, 좌표 등 모두 포함)
    editingHistoryId: null, // 저장된 내역을 수정할 때 활성화되는 해당 내역 ID
    
    // [설정 상태]
    qrImage: null,        // 생성된 QR코드 이미지 객체
    currentCategory: 'text', // (기본) 내용 수정 카테고리
    isFitMode: false,     // Zoom 기능용 토글 
    zoom: 100,            // 확대/축소 % 
    tutIndex: 0           // 튜토리얼 팝업 시퀀스 인덱스
};
```

---

## ⚙️ 4. 주요 핵심 함수 분석

### `core/canvas.js`
- **`render(isExport)`**: 캔버스를 항상 최신화하는 기능. `S.annos` 배열 기반으로 빨간색 박스와 번호 원형 배지를 그림. 편집 시 파란색 점선, Export(PDF 내보내기 시) 우측 하단 QR코드를 삽입하는 로직 포함.
- **`hitCheck(p, rect)`**: 마우스 좌표 `p`가 그려져 있는 `rect` (선택된 메모의 영역) 내부인지 커서 가장자리(8방향 리사이징 노드)인지 계산하여 반환.
- **`onmousemove / onmousedown / onmouseup`**: FSM(`S.state`)에 따라 사각형을 드래그하여 그리거나 편집을 수행할 수 있도록 이벤트 라우팅.

### `core/history.js`
- **`renderQueue()`**: 우측(또는 하단) 요청사항 리스트 UI를 초기화하고 `S.history` 배열 기반으로 아이템 삽입. '수정' 이벤트 바인딩으로 과거 상태 되감기(Deserialize) 처리.

### `utils/imageLoader.js`
- **`loadImage(src, callback)`**: Base64 Src를 받아 이미지 객체 초기화. 캔버스 넓이 적용. 줌 업데이트 후 즉시 캔버스에 이미지를 렌더링.

### `services/pdfExport.js`
- **`UI.exportBtn.onclick`**: 임시 `div`를 `absolute / left -9999px`로 배치 후, `S.history`를 기반으로 HTML 탬플릿을 주입. 이를 `html2canvas`로 이미지로 스크린캡처 후 `jsPDF` 인스턴스에 넣고 파일명 `의뢰서.pdf` 로 다운로드 시키는 파이프라인.

---

## 📝 5. 총평

"재봉툴 PRO"는 **SPA 프레임워크 (React/Vue) 없이 바닐라 환경에서 객체 지향적인 FSM 모델 (상태 머신)을 적극적으로 활용한 훌륭한 패턴**을 보여주고 있습니다. FSM으로 캔버스 위의 마우스 이벤트를 명확히 분기 (`IDLE`, `DRAWING`, `EDITING`, `MEMO_WAIT`) 시킨 점, 컴포넌트 간 책임을 모듈 관점으로 깔끔하게 분리한 점(`core`, `services`, `utils`, `store`)이 돋보입니다. 별도의 백엔드 없이 DataURL과 클라우드 없이 직렬화하여 클라이언트 내에서 데이터를 처리하고 PDF 렌더링까지 완벽하게 수행하는 스탠드얼론(Client-side) 생산성 앱입니다.
