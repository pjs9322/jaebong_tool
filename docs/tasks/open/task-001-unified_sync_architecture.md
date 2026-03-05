# [기획 확정] Task 001: 기기 식별 기반 실시간(Sync) 데이터 수집 및 공유 권한 분기

## Goal
사용자의 별도 가입 절차(로그인 등) 없이, 생성된 기기 고유 식별값(UUID/Fingerprint)을 통해 모든 작업 이력을 서버에 자동 수집(저장)하고, 식별값의 일치 여부에 따라 에디터(수정 권한)와 뷰어(열람 전용) 모드를 완벽하게 분기하는 SaaS형 데이터 파이프라인을 구축합니다.

> 💡 **진행 상태 명세:** 기존 `task-002` (로컬 백업)와 `task-003` (공유 링크 서버 연동)이 합쳐져 본 통합 태스크로 격상되었습니다. 목적은 **재봉툴 내 모든 사용자의 데이터 자산(홈페이지, 요청사항)을 100% 수집**함과 동시에 무결점의 실시간 UX를 제공하는 것입니다. 

---

## 🏗️ 핵심 아키텍처 (비로그인 기반 개인화 및 데이터 수집)

### 1. 익명 기기 식별 (Cryptographic UUID & Token 매칭)
* **보안 이슈 (중복 및 위변조 방지):** 클라이언트 생성이므로 악의적인 유저가 `localStorage`의 값을 조작해 타인의 문서 ID를 파싱/수정할 위험(보안 취약점)이 있습니다. 이를 방지하기 위해 단순한 난수가 아닌, **암호학적으로 안전한 식별 체계**를 도입합니다.
* **초기화 및 토큰 발급:** 
  - 브라우저 최초 접속 시 `crypto.randomUUID()` (가장 안전한 v4 UUID 명세)를 사용하여 절대 중복되지 않는 고유 ID를 생성합니다.
  - 보안 강화를 위해, 문서를 생성할 때 서버 측에서 이 UUID에 대한 **Secret Token (수정 권한 키)**을 함께 발급하여 클라이언트에 내려줍니다.
* **오너십 부여:** 서버 DB 구조는 `owner_id: UUID`와 비공개 필드인 `edit_token: XYZ`를 가집니다. 사용자가 이후 문서를 수정(Patch)하려고 통신할 때, 브라우저는 반드시 발급받았던 `edit_token`을 헤더에 담아 보내야만 백엔드에서 쓰기 권한을 승인합니다. (단순히 UUID 문자열만 똑같이 적어 넣는다고 남의 문서를 수정할 수 없게 철저히 방어합니다.)
* **⚠️ 로컬 저장소 유실 한계점 (토큰 만료/삭제):**
  - **제약:** 비로그인 익명 인증의 숙명적인 한계입니다. 사용자가 브라우저 캐시/쿠키를 '전체 삭제'하거나, 시크릿 모드에서 탭을 닫아버리면 내 기기에 보관 중이던 `UUID`와 `edit_token`이 영구적으로 증발합니다.
  - **결과:** 이 경우 본인이 작성한 문서(URL)에 들어가도 **서버는 나를 뷰어(제3자)로 인식하여 수정 권한을 박탈**합니다.
  - **대응책(MVP):** "시크릿 모드 사용 시 탭을 닫으면 작업 이력을 잃을 수 있습니다"라는 경고문(Toast/Alert)을 접속 시 1회 고지하는 것이 최선이며, 향후 **이 한계점이 큰 불편으로 다가올 즈음이 바로 "회원가입/로그인(계정 연동) 기능"을 정식 도입할 최적의 타이밍(PMF 지점)**이 됩니다.

### 2. 실시간 자동 동기화 & 백그라운드 수집 (Auto-Save)
* **디바운스(Debounce) 저장:** 사용자가 메모를 작성하거나 박스를 칠 때마다(또는 액션 후 1~2초 정지 시) 백그라운드 API가 호출되어 서버 DB 모델을 최신화(Patch) 합니다.
* **공유와 상관없는 자산 수집:** 사용자가 최종적으로 우측 상단의 [공유] 또는 [PDF] 버튼을 누르지 않은 '미완성 작업'이거나 '단순 테스트'라도, 이미 우리의 서버 DB에 실시간으로 적재되므로 MVP 단계의 **데이터 수집(Data Tracking) 목적을 완벽히 달성**할 수 있습니다.
* **가비지 컬렉션(GC):** 너무 짧은 시간 내에 이탈한 의미 없는 선 긋기 데이터 등은 서버 배치(Batch) 작업이나 TTL 속성을 통해 N일 후 자동 삭제(Clean-up)시켜 인프라 과금 폭탄을 통제합니다.

### 3. 소유권(Owner) 기반 뷰어/에디터 라우팅
이 서비스의 핵심은, 수정 권한이 있는 사람과 열람만 할 사람의 화면이 어떻게 안전하게 분기되는가에 있습니다.

* **동일한 주소, 다른 화면:** 공유 링크(예: `jaebong.com/?id=wx92k`)로 모두가 접속할 수 있습니다.
* **권한 검증 로직:** 
  1. 페이지 진입 시 해당 `id` 문서를 서버에서 불러옵니다.
  2. 문서에 명시된 `owner_id`와, 현재 접속한 브라우저의 `localStorage.UUID` 값을 비교합니다.
  3. **값이 일치한다면 (본인):** 편집 권한을 부여하고, 모든 드로잉 기능(캔버스/히스토리 수정)이 켜진 <b>에디터(Editor) UI</b>를 렌더링합니다.
  4. **값이 다르거나 없다면 (타인/뷰어):** 캔버스와 수정 로직을 잠그고 오직 내역 확인만 할 수 있는 <b>공유 페이지(Viewer) UI</b> 전용 화면으로 강제 이동/렌더링 시킵니다.

### 4. 🚀 마이그레이션 전략 (추후 로그인 시스템 도입 대비)
이 UUID 기반의 익명 인증 구조는 추후 정식으로 **회원가입 기능(Firebase Auth / OAuth)이 도입될 때 완벽하게 100% 마이그레이션 호환이 가능**하도록 설계되었습니다.

* **시나리오:** MVP 기간 동안 사용자 A가 로컬스토리지를 유지한 채 회원가입 버튼을 클릭합니다.
* **연동 프로세스 (Account Binding):**
  1. 회원가입/로그인이 완료되어 정상적인 User UID(`auth_id`)가 발급됩니다.
  2. 프론트엔드는 현재 브라우저에 남아있던 익명 식별자(`UUID`와 `edit_token`)를 챙겨서 서버로 "계정 연동 API"를 1회 호출합니다.
  3. 백엔드는 DB 전체를 뒤져 `owner_id`가 해당 `UUID`인 모든 문서의 소유권을 새로 발급된 `auth_id`로 영구 이전(Update) 시켜버립니다.
* **결과 검증:** 사용자는 회원가입을 하자마자, 과거 자신이 **로그인 없이 만들었던 모든 문서(수십 개의 과거 의뢰서들)가 내 계정의 마이페이지(Dashboard)에 모조리 복원되어 나타나는 파워풀하고 매끄러운 UX**를 경험하게 됩니다. 

### 5. 📂 MVP 단계의 "단일 문서" 제한 방향성 및 DB 마이그레이션 영향 분석
다중 문서 기능(작업 목록 대시보드)은 MVP 단계에서 과스펙이 될 수 있으므로, **"로그인 전까지는 오직 1개의 문서만 수정할 수 있도록"** 제한하는 방향으로 후순위 배치가 가능합니다.

* **MVP 기획 (단일 문서 강제):** 
  - 사용자가 루트(`jaebong.com/`)로 들어올 때, 서버는 DB에서 이 브라우저의 `UUID`를 가진 문서 단 1개가 존재하는지 찾습니다.
  - 없다면 새로 하나 생성하여 `?id=DOC-001`로 넘기고, 이미 있다면 새로 만들지 않고 기존에 쓰던 `?id=DOC-001`로만 강제 라우팅(리다이렉트) 시킵니다.
  - 즉, 익명 사용자는 캐시를 삭제하지 않는 한 평생 1개의 도화지만 썼다 지웠다 반복하게 됩니다. (작업 목록 UI 개발 불필요)

* **💡 추후 다중 문서로 전환 시 DB 마이그레이션 소요가 심해지는가?**
  - **전혀 심해지지 않습니다 (소요 비용 0).** 
  - DB 구조 자체(`owner_id` 필드 존재)는 이미 1:N (한 명의 유저가 여러 문서를 가질 수 있는) 확장성을 염두에 두고 처음부터 짜여 있습니다.
  - 나중에 단일 문서 제한을 풀려면, 프론트엔드의 `무조건 기존 문서로 리다이렉트` 시키는 if문 한 줄만 빼버리고 "작업 목록 UI(대시보드)" 뷰 화면만 그려주면 끝납니다. 백엔드 DB 스키마 구조를 뜯어고칠 필요가 없습니다.

## 🛠️ 백엔드 연동 통신 인프라 확정 (기입란)
MVP 단계에서 실시간 동기화와 데이터 수집을 감당할 클라우드/BaaS 환경을 기입해주세요. 

* **사용할 플랫폼 (BaaS/클라우드):** 카페24 웹호스팅
* **Database (세션/문서 라우팅용):** 마리아 DB
* **Storage (이미지 덤프용):** 서버 스토리지 디렉토리에 압축하여 저장함
* **Functions (UUID 토큰 파싱/인증용 API):** PHP 기반 로직 제작 또는 REST API 호출 필요
* **기타 코멘트 (과금 한도, 제약 사항 등):** 서버 내 DB 및 CDN 용량 제한은 있으나 추후 확장 가능하므로 고려하지 말것

---

## Plan (개발 명세 - PHP / MariaDB 스택 적용)

1. **DB 스키마 디자인 (MariaDB):**
   - `g5_jaebong_documents` 테이블 생성 SQL 스크립트 작성 준비.
     - 주요 컬럼: `id` (PK, Varchar), `owner_uuid` (Varchar), `edit_token` (Varchar), `history_json` (LongText), `created_at` (Datetime), `updated_at` (Datetime)
   - `g5_jaebong_images` 테이블 생성 SQL 스크립트 작성 준비 (이미지 URL과 연관 문서 매핑용).
   ```sql
   CREATE TABLE `g5_jaebong_documents` (
     `id` VARCHAR(50) PRIMARY KEY,
     `owner_uuid` VARCHAR(100) NOT NULL,
     `edit_token` VARCHAR(100) NOT NULL,
     `history_json` LONGTEXT DEFAULT NULL,
     `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
     `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     INDEX `idx_owner` (`owner_uuid`)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

   CREATE TABLE `g5_jaebong_images` (
     `id` INT AUTO_INCREMENT PRIMARY KEY,
     `document_id` VARCHAR(50) NOT NULL,
     `url` VARCHAR(255) NOT NULL,
     `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (`document_id`) REFERENCES `g5_jaebong_documents`(`id`) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
   ```

2. **백엔드 API 모듈 개발 (Javascript `fetch` 연동용 구조 고려):**
   - 백엔드 로직을 직접(자체) 서버단에 PHP 형태로 짤 경우, 프론트엔드 API 호출 유틸리티 함수들을 `js/util/api.js` 내부로 분리/설계합니다.
   - `POST /api/docs/create.php`: 처음 접속 시 새 문서를 만들고 `id`와 `edit_token`을 Json으로 반환.
   - `PATCH /api/docs/sync.php`: 프론트에서 디바운스된 데이터를 보낼 때, 헤더의 `edit_token` 검증 후 `history_json` 컬럼 업데이트 수행.
   - `POST /api/upload.php`: Base64 이미지를 받아 서버 디렉토리(예: `uploads/`)에 File로 치환하고, 접근 가능한 정적 URL 파싱 후 반환.
   
   **[ API 요청 및 응답 명세 ]**
   * **`POST /api/docs/create.php`** (빈 문서 생성)
     - Request Payload: `{"owner_uuid": "dev-1234..."}`
     - Response: `{"success": true, "data": {"id": "DOC-XYZ", "edit_token": "secret-abc"}}`
   * **`PATCH /api/docs/sync.php`** (저장 및 동기화)
     - Headers: `Authorization: Bearer secret-abc` (Token 검증)
     - Request Payload: `{"id": "DOC-XYZ", "history_json": "[...]"}`
     - Response: `{"success": true, "updated_at": "2026-03-05 14:00:00"}`

3. **클라이언트 코어 리팩터링:**
   - `main.js`: 루트 접속 시 `create.php`를 호출하여 문서 ID를 발급받고 주소를 변경(`history.pushState`).
   - 파라미터 `?id=` 가 있을 시 `fetch`로 데이터를 불러와 권한에 따라 에디터/뷰어 모드 결정.
   
   **[ 클라이언트 접속 시퀀스 (단일 문서 제한 정책) ]**
   1. **최초 접속 (`/`)**: 
      - 로컬스토리지에 UUID가 없다면 신규 발급(`crypto.randomUUID()`).
      - 백엔드에 문서가 없으므로 `POST /api/docs/create.php` 통신하여 새 `id`와 `token` 발급받음.
      - 클라이언트 주소창을 `/?id=새로운ID`로 강제 리다이렉트 후 에디터 모드 On.
   2. **재입장 (`/`)**: 
      - 로컬스토리지에 UUID가 이미 존재.
      - 서버를 조회하여 내 UUID로 만들어진 기존 문서를 발견하면, 새 문서를 만들지 않고 원래 하던 주소(`/?id=기존ID`)로 강제 리다이렉트 (작업 이어서 하기).
   3. **공유 링크 접속 (`/?id=XXX`)**:
      - `GET` 요청으로 서버에서 문서(`XXX`) 데이터 다운로드.
      - 문서의 `owner_id`와 내 접속기기의 `UUID` 일치 여부 판별.
      - **일치 (본인):** `edit_token`을 세팅하고 편집 기능 오픈 ➡️ **에디터 상태 유지**.
      - **불일치 (타인):** 마우스 이벤트 차단, 툴바 UI 숨김 ➡️ **공유 뷰어(단순 열람) 상태로 전환**.

## Result
(작업 대기 중)
