# 재봉툴 PRO v13 시퀀스 및 내부 아키텍처 역공학 분석 리포트

본 문서는 `index.html` 단일 파일로 구성된 "홈페이지 유지보수 의뢰서 생성 AI 어시스턴트"의 전반적인 기능, 변수 세트(State), 이벤트 바인딩 및 세부 실행 맥락(Sequence)을 상세히 분해하여 기록한 리버스 엔지니어링 문서입니다.

---

## 1. 전역 상태 (State) 및 UI 변수 바인딩 구조

애플리케이션은 바닐라 자바스크립트의 전역 객체인 `S` (State 관리)와 `UI` (DOM 참조 관리)로 나뉘어 설계되었습니다.

### 1-1. 전역 상태 객체 `S` (State Management)
| 변수명 | 타입 | 초기값 | 용도 및 설명 |
| :--- | :--- | :--- | :--- |
| `img` | `Image` | `null` | 현재 캔버스에 로드된 원본 이미지 객체 |
| `w`, `h` | `Number` | `0`, `0` | 로드된 이미지의 원본 가로, 세로 픽셀 크기 |
| `baseImgSrc` | `String` | `null` | 이미지의 Base64 DataURL (수정 작업 불러오기 시 원본 복구용) |
| `annos` | `Array` | `[]` | 캔버스에 그려진 주석/메모들의 배열. 객체 형태: `{ id, rect: {x, y, w, h}, text }` |
| `draftRect` | `Object` | `null` | 캔버스에서 마우스 드래그 중 생성되는 임시 사각형 영역 데이터 |
| `activeAnnoId` | `Number` | `null` | 현재 선택(포커스)된 주석(Annotation)의 고유 ID |
| `state` | `String` | `'IDLE'` | 캔버스 마우스 조작 상태머신 (`'IDLE'`, `'DRAWING'`, `'EDITING'`, `'MEMO_WAIT'`) |
| `action` | `String` | `null` | `EDITING` 상태 시 수행 중인 액션. 이동(`'move'`) 또는 크기 조절(`'nw'`, `'ne'`, `'sw'`, `'se'`, `'n'`, `'s'`, `'e'`, `'w'`) |
| `dragStart` | `Object` | `{x: 0, y: 0}` | 마우스 드래그(Mousedown)가 시작된 x, y 좌표 |
| `history` | `Array` | `[]` | 큐(Queue)에 등록된 작업의 전체 이력 배열 (최종 다운로드/뷰어 시 사용 됨 데이터 뱅크) |
| `editingHistoryId` | `Number`| `null` | 왼쪽 큐 리스트에서 "수정" 모드 진입 시, 해당 이력을 식별하는 ID |
| `qrImage` | `Image` | `null` | `qrcodejs`가 생성한 QR 코드 이미지 객체 |
| `currentCategory` | `String` | `'text'` | 현재 선택된 요건 카테고리 (`'text'`, `'layout'`, `'func'`, `'image'`) |
| `isFitMode` | `Boolean`| `false` | 캔버스 줌 설정 상태 (100% 모드 또는 화면 너비에 맞춘 Fit 모드) |
| `zoom` | `Number` | `100` | 현재 줌 비율 퍼센트. 마우스 위치를 실제 이미지 픽셀 좌표로 변환(역산)할 때 배율 상수로 사용 |
| `tutIndex` | `Number` | `0` | 도입부 튜토리얼 스텝 진행 인덱스 |


### 1-2. DOM 캐싱 객체 `UI` (UI Elements)
주요한 특징으로는 레이어 관리 방식 (`editorLayer`, `viewerLayer`), 상단 탑바 액션, 스텝별 컨테이너 (`step1Panel`, `step2Panel`, `step3Panel`), 캔버스 인터페이스(`canvas`, `ctx`, `urlIn`), 메모 입력기(`memoPanel`, `memoInput`), 그리고 뷰어 및 채팅 리스트(`chatList`) 등 사용 빈도가 높은 DOM 노드를 초기화 시점에 전역적으로 바인딩하여 재사용하고 있습니다.

---

## 2. 주요 기능 및 라이프사이클 시퀀스 분석

애플리케이션이 실행(`DOMContentLoaded`)된 뒤 작동하는 개별 기능의 흐름을 함수와 이벤트 단위로 분해했습니다.

### [기능 1] 초기화 및 튜토리얼 동작 흐름
1. `window.addEventListener('DOMContentLoaded', () => {...})` 실행.
2. `setTimeout(() => showTutorial(0), 500)` 호출 (0.5초 뒤 튜토리얼 노출).
3. `showTutorial(idx)`:
   - `idx`에 따라 타겟 요소(`step1Panel`, `step2Panel` 등)의 `getBoundingClientRect()` 값을 읽음.
   - `tutSpot`(스포트라이트 오버레이)과 `tutCard`(안내 카드)의 위치 최적화 및 CSS 표출.
4. **튜토리얼 넘기기:** `UI.tutNext.onclick` 발생 시 `tutIndex` 증가 후 `showTutorial` 재호출.

### [기능 2] 이미지 가져오기 및 캔버스 등록 흐름
이미지 가져오기는 화면 캡처, 파일 업로드, 클립보드 붙여넣기 3가지 방식을 지원합니다.
모든 방식은 최종적으로 `loadImage(src, onLoadCallback)`를 호출합니다.
1. **화면 캡처 방식 (`UI.btnScreenCapture.onclick`)**
   - 사용자 퍼미션 및 화면 스트림 요청: `navigator.mediaDevices.getDisplayMedia({ video: true })`
   - 메모리 상의 `<video>` 요소에 스트림 연결 후 재생(`video.play()`).
   - 메타데이터 로드(`onloadedmetadata`) 시 메모리 캔버스에 비디오 프레임을 캡처.
   - 캡처된 캔버스를 `toDataURL()` 변환 후 `loadImage()`로 전달, 스트림 종료(`track.stop()`).
2. **파일 업로드 방식 (`UI.btnOpenImg.onclick` -> `UI.fileIn.onchange`)**
   - `FileReader.readAsDataURL()`을 통해 로컬 이미지 Base64로 파싱 -> `loadImage()`
3. **클립보드 방식 (`window.addEventListener('paste')`)**
   - 붙여넣기 이벤트 객체의 `clipboardData.items` 중 `image/*` 타입을 `getAsFile()`로 추출 -> `FileReader` 동작 -> `loadImage()`
4. **이미지 로딩 핵심 로직 (`loadImage(src, onLoadCallback)`)**
   - 새로운 `Image()` 객체 생성 -> `img.src = src`
   - `img.onload` 발생 시 `S.img`, `S.w`, `S.h`, `S.baseImgSrc` 설정.
   - 캔버스 해상도 초기화 (`UI.canvas.width/height`).
   - 각종 폼 초기화: `clearEditingState()`, `resetMemoPanel()`, 이벤트 상태 머신 `S.state='IDLE'`.
   - 화면 출력: `updateZoomMode()` -> `render()` 호출.

### [기능 3] 작업 캔버스 및 마우스 제어 시퀀스
사용자가 캔버스 위에서 메모를 치기 위한 핵심 조작 시퀀스입니다.

1. **상태 계산 유틸리티**
   - `getPos(e)`: 마우스 이벤트(e.clientX, e.clientY)를 받아 `getBoundingClientRect()`와 실해상도 비율(`sx`, `sy`)을 통해 원본 이미지 픽셀 좌표(x, y)로 환산 반환.
   - `hitCheck(p, rect)`: 파라미터 `p`(마우스 위치)가 사각형 테두리를 감싸는 리사이즈/이동 트리거 포인트 8방향 허용오차(tol) 안에 진입했는지 `'nw'`, `'n'`, `'move'` 등 String 식별자 반환.

2. **`UI.canvas.onmousedown` 발생 시나리오**
   - **(조건 1) `MEMO_WAIT` 상태일 경우 무시.**
   - **(조건 2) 선택된 박스의 리사이즈 타겟일 경우 (`S.activeAnnoId` 존재하며 `hitCheck` 통과):**
     - `S.state = 'EDITING'; S.action = hit; S.dragStart = p;` 로 상태 전환 후 종료.
   - **(조건 3) 기존 주석(Annotation) 박스를 클릭할 경우:**
     - 역순 순회(`[...S.annos].reverse().find()`)로 클릭 지점이 사각형 안쪽인지 판별.
     - 찾은 경우: `openEditPanel(id)`(기존 메모 패널 열기) 호출 -> `S.state = 'EDITING'`, `S.action='move'` 상태 전환.
   - **(조건 4) 빈 곳 클릭 시 신규 박스 드로잉 시작:**
     - 기존 메모 패널 닫기(`resetMemoPanel()`) -> `S.activeAnnoId = null`
     - `S.state = 'DRAWING'; S.dragStart = p`. 임시 도형의 시작점 선언 -> `S.draftRect = {x: p.x, y: p.y, w: 0, h: 0}`
     - `render()` 호출 (점선 렌더링).

3. **`window.onmousemove` 이동 시나리오**
   - `S.state === 'DRAWING'`: 현재 위치를 바탕으로 Width, Height 절대값 도출. `S.draftRect`를 업데이트 후 `render()` 호출.
   - `S.state === 'EDITING'`: `S.action`(이동 혹은 방향)에 따라 원본 `rect`(x,y,w,h) 값을 `dx`, `dy`만큼 보정 업데이트 -> `render()` 호출.
   - 드래그 중이 아닐 때: 박스 근처에 갈 경우 마우스 커서를 `cursor='crosshair'`, `resize`, `pointer` 류로 변경시킴.

4. **`window.onmouseup` 완료/해제 시나리오**
   - `S.state === 'DRAWING'`: 사이즈 검증(`w > 20 && h > 20`). 사이즈가 충분하면 `S.state = 'MEMO_WAIT'` 로 변경하여 더 이상의 드로잉을 차단하고 `memoPanel` 오버레이를 열고 포커스 시킴.
   - `S.state === 'EDITING'`: `IDLE` 상태로 복귀 및 `render()`.

### [기능 4] 캔버스 그래픽 렌더링 시퀀스 (`render(isExport)`)
- `ctx.clearRect()` 이미지를 밀고 다시 `ctx.drawImage(S.img)`.
- **Annotation 렌더링:** `S.annos` 배열 내 아이템들을 `forEach` 순회하며 그립니다.
  - 선택(`active`) 시에는 채색(`rgba`) 박스와 파란색 테두리로 노출하며, 비선택 시에는 분홍색(`boxColor: #f43f5e`) 테두리로 표기.
  - 박스의 우상단에 번호(Number badge)을 원형(`arc`)과 텍스트(`fillText`)로 오버레이.
- **Draft 렌더링:** `S.draftRect` 가 존재하면 점선(`setLineDash`)으로 임시 그리기.
- `isExport===true` 일 경우 생성된 QR 이미지 객체(`S.qrImage`)를 실제 캔버스의 구석(우상단)에 합성 렌더링함.

### [기능 5] 큐 리스트 저장 (히스토리 추가) 및 복구
- **목록에 추가 (`UI.saveReqBtn.onclick`)**
  - Validation: 쓰다 만 메모(`MEMO_WAIT`, `EDITING`)가 있다면 알림 노출 후 정지.
  - `render(true)` (QR코드 삽입 상태로 그림).
  - Canvas 데이터 2종 추출: `toDataURL` 원본(Full) 해상도 썸네일(Thumb) 압축.
  - 새 오브젝트 생성 (`Date.now()` 고유 ID, `thumb`, `full`, `baseImgSrc`, `annos`, `url`, `desc`, `category` 전부 Clone/Deep Copy)
  - `S.editingHistoryId` 가 존재하면 덮어쓰기 업데이트, 없으면 `S.history.push(data)`.
  - 캔버스를 초기화(Clear)하고 `renderQueue()` 실행.
  
- **왼쪽 패널 이력 렌더링 (`renderQueue`)**
  - `S.history` 배열을 바탕으로 사이드바 UI에 DOM 구축.
  - 각 아이템 하단의 "수정" 버튼 클릭 시 -> `S.editingHistoryId = h.id`, `loadImage(h.baseImgSrc)`로 원본 복구 후 `S.annos`를 깊은 수준 복원으로 재할당하여 기존 작업 구역 부활(`render()`). 

### [기능 6] PDF 다운로드 내보내기 흐름 (`UI.exportBtn.onclick`)
1. 생성 중 상태 전환 `exportBtn.innerText = "생성 중..."`
2. `jspdf` 인스턴스화 (`new jsPDF('p', 'mm', 'a4')`).
3. 투명한(Off-screen) 컨테이너 요소를 `body` 바깥(`tempDiv`)에 생성하고 폭을 A4 비율로 맞춤.
4. `S.history` 루프:
   - 배열에 있는 이력 데이터를 HTML 템플릿 리터럴 문법 내에 컴파일 (고객 정보 타이틀, URL QR, 카테고리, 메모 리스트 문단, Base64 스크린샷 썸네일 합성).
   - 생성된 템플릿 DOM을 `tempDiv`에 주입 후 `html2canvas`로 Snapshot 촬영 처리.
   - `canvas.toDataURL()`을 통해 이미지화 한 뒤 `doc.addImage(imgData, ...)`을 사용해서 PDF 페이지 단위로 스탬핑. (`i > 0`일 때 `doc.addPage()` 수행).
5. 루프 종료 후 `doc.save('의뢰서.pdf')` 동작 및 가상 DOM 삭제.

### [기능 7] 웹 뷰어 (Viewer) 동작 흐름
- **공유 버튼 클릭 (`UI.shareBtn.onclick`)** -> 레이어 교체 `viewerLayer.classList.add('active')`.
- `renderViewerContent()`: `S.history` 배열을 기반으로 단순 편집화면이 아닌 세로 스크롤형 카드 뷰 문서(Read-Only + Inline Edit) 스타일의 DOM 요소 렌더링을 진행합니다.
  - `updateItemStatus`, `updateItemUrl`: `<select>`와 `<input>` 에서 호출되는 네이티브 DOM 이벤트 `onchange`, `onblur`에 따라 전역 `S.history[id]` 데이터를 인라인으로 수정시키고 채팅 시스템 알림(`addSystemChat`)을 동조 발생시킵니다.
- **채팅 패널 조작 (`btnSendChat.onclick`)**: 입력한 값을 받아 우측 채팅 `div`에 자식(채팅 버블)을 할당. 이후 1200ms `setTimeout` 콜백 방식으로 작업자(Manager)의 더미 응답을 시뮬레이션 함.

---

## 3. 코드 개선 체크포인트 결론 (Insight)
- **DOM / Event 복잡성:** 파일 하나에 모든 코드가 집적되어 가독성이 떨어지며 이벤트 위임(Event Delegation)이 아닌 개별 바인딩 위주라 메모리 관리의 약점이 보입니다. Component 분리(예: `Editor`, `HistoryPanel`, `Viewer`)를 강력히 추천합니다.
- **Canvas 성능 / 상태 추적:** 상태 관리 객체 `S`가 빈번하게 변이함에도 `render()` 함수가 매번 캔버스 전역을 Paint하며 부하를 만들고 있습니다. RequestAnimationFrame으로 최적화 하거나, `React / Vue` 등 VDOM을 쓰며 Canvas 레이어를 패스스루하는 방식 도입이 권장됩니다.
# 재봉툴 PRO v13 리버스 엔지니어링 분석 보고서 (Research)

## 1. 프로젝트 개요 (Project Overview)
본 프로젝트는 **"홈페이지 유지보수 의뢰서 생성 AI 어시스턴트"**라는 목적을 가진 프론트엔드 웹 애플리케이션입니다. 
단일 HTML 파일(`index.html`) 내에 문서 구조(HTML), 스타일(CSS), 그리고 인터랙션 로직(JavaScript)이 모두 포함되어 있는 **SPA(Single Page Application)** 형태의 사이드 프로젝트 또는 프로토타입 형태를 띠고 있습니다.

## 2. 기술 스택 및 외부 라이브러리 (Tech Stack & Libraries)
* **언어:** HTML5, CSS3 (Vanilla), JavaScript (Vanilla JS - ES6)
* **외부 라이브러리 (CDN을 통해 로드):**
  * `jspdf` (v2.5.1): 생성된 작업물(이미지 및 텍스트)을 기반으로 PDF 문서를 생성하기 위해 사용.
  * `html2canvas` (v1.4.1): DOM 요소를 캡처하여 이미지 데이터로 렌더링하기 위해 사용 (PDF 내보내기 시 화면 캡처 용도).
  * `qrcodejs` (v1.0.0): 입력받은 페이지 URL을 QR 코드로 변환하여 화면 및 PDF에 삽입하기 위해 사용.

## 3. 핵심 기능 분석 (Key Features)
이 애플리케이션은 사용자가 웹사이트의 스크린샷 위에서 수정할 부분을 표시하고 상세 내용을 기록한 뒤, 이를 최종 의뢰서 형태(PDF 또는 뷰어)로 변환하는 워크플로우를 제공합니다.

### STEP 01: 이미지 가져오기
* **화면 캡처 (Screen Capture):** `navigator.mediaDevices.getDisplayMedia` API를 활용하여 브라우저의 현재 화면이나 다른 탭/창을 캡처한 뒤, Canvas 요소에 그려 이미지 데이터를 가져옵니다.
* **파일 업로드 (File Upload):** `<input type="file">` 및 `FileReader`를 통해 로컬 이미지를 불러옵니다.
* **클립보드 붙여넣기 (Clipboard Paste):** `window.addEventListener('paste')`를 통해 복사한 이미지 데이터를 인식하여 불러옵니다.

### STEP 02: 작업 캔버스 (Work Canvas)
* **URL 입력 및 QR 생성:** 수정할 페이지의 주소를 입력하면 `qrcodejs`를 이용해 화면 우측 상단(?)과 최종 문서에 들어갈 QR 코드를 자동 생성합니다.
* **캔버스 인터랙션:** 사용자가 업로드한 이미지를 Canvas API (`MainCanvas`)를 통해 렌더링합니다.
  * **그리기 (Drawing):** 마우스 드래그를 통해 수정이 필요한 영역을 사각형(박스) 치도록 지원합니다.
  * **편집 (Editing):** 그려진 박스를 클릭하여 이동(`move`)하거나 테두리를 잡고 크기를 조절(`resize`)할 수 있습니다. 
  * 화면 맞춤 / 100% 모드 (`Zoom` 기능) 토글이 가능합니다.

### STEP 03: 수정사항 메모 생성
* 캔버스에 영역을 지정하면 우측 메모 패널이 활성화(Slide-up 애니메이션)됩니다.
* 사용자가 해당 영역의 수정 전/후 내용을 적으면 주석(`Annotation`) 리스트에 저장되며, 캔버스 위의 박스에 번호 뱃지(1, 2, ...)가 매핑됩니다.
* 개별 메모의 수정 및 삭제가 가능합니다.

### 히스토리 (History) 및 내보내기 (Export)
* **History Queue:** 작성 완료된 내용들(캔버스 썸네일, 카테고리, 메모 리스트 등)을 하나의 작업(의뢰 항목)으로 리스트업하여 보관합니다. (`S.history` 배열)
* **PDF 다운로드:** `html2canvas`를 사용해 가상 DOM 화면(tempDiv)에 의뢰서 포맷을 렌더링한 후 사진으로 찍고, `jspdf`를 사용해 페이지별로 PDF에 붙여 다운로드하게 합니다.
* **웹 뷰어 및 공유 모드 (`Viewer Layer`):** 링크 공유 버튼을 누르면 편집 모드(`editorLayer`)에서 뷰어 모드(`viewerLayer`)로 화면이 전환(Layer Display 제어)됩니다.

### 뷰어 모드 (Viewer Mode)의 특징
* 의뢰 상태 변경 (Status): `검토요청 / 검토중 / 검토완료` 등의 작업 상태를 변경할 수 있습니다.
* **채팅 시스템 (History / Comment):** 클라이언트와 작업자(Manager) 간의 가상 대화창 UI가 제공됩니다. 간단한 봇 형식으로 "메시지 확인했습니다" 등의 자동 응답이 `setTimeout`으로 구현되어 있습니다.

## 4. 아키텍처 및 내부 구현 방식
### 상태 관리 구조 (State Management)
별도의 프레임워크 없는 순수 바닐라 JS이므로 전역 객체로 상태를 관리합니다.
* `S` (State / Data): 
  * `img`, `w`, `h`: 로드된 이미지와 크기
  * `annos`: 현재 선택된 이미지 위에 그려진 메모/박스 배열 (`{ id, rect: {x,y,w,h}, text }`)
  * `history`: 목록에 추가된 전체 작업 내역
  * `state`: 현재 마우스의 동작 상태 (`IDLE`, `DRAWING`, `EDITING`, `MEMO_WAIT`)
* `UI` (DOM Elements): 
  * `editorLayer`, `viewerLayer`, `btnScreenCapture`, `canvas`, `ctx`, 등 주로 쓰이는 DOM 엘리먼트들을 사전에 캐싱해두었습니다.

### 디자인 시스템 및 레이아웃
* CSS Variables (`:root`)를 활용하여 배경(`--bg`), 카드배경(`--card-bg`), 메인 색상(`--primary`), 포인트 색상(`--action-pink` 등)을 토큰처럼 정의하였습니다.
* **3-Column 레이아웃:** 300px(가져오기) - 1fr(캔버스) - 340px(메모) 형태로 깊이있는 그림자(`--shadow-card`)와 함께 구분되는 모던한 카드형 UI 디자인을 채택했습니다.

## 5. 개선 포인트 (잠재적 확장성)
1. **단일 파일 분리 제안:** 현재 HTML 파일이 약 1,500줄에 달합니다. 추후 유지보수를 위해 CSS와 JS, HTML을 분리(모듈화) 리팩토링하는 것이 좋습니다.
2. **백엔드 로직 연동:** 현재 `S.history`는 사용자 세션 내에서만 동작하고 새로고침 시 날아갑니다. LocalStorage나 서버 API를 연동하여 작업 내역이 영구 저장되도록 발전시킬 수 있습니다.
3. **TypeScript 도입:** `S`나 각각의 도형(rect) 데이터를 타이핑하여 잠재적 런타임 에러를 방지할 수 있습니다.

---
**보고서 작성일:** 2026-03-04
**원본 파일:** `jaebong/index.html`
