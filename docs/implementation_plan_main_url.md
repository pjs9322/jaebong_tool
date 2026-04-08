# 의뢰서 메인 URL(유지보수 대상) DB 저장 구현 계획

본 문서는 의뢰서 생성 전 팝업에서 수집된 '유지보수 대상 홈페이지 URL'을 데이터베이스에 영구 저장하고, 조회 시 이를 복원하여 표시하는 기능의 구현 계획을 정의합니다.

## 1. 개요
현재 유지보수 대상 URL은 프론트엔드 상태(`S.maintUrl`)로는 관리되지만, DB에 저장되지 않아 페이지 새로고침 시 정보가 유실되는 문제가 있습니다. 이를 해결하기 위해 문서(Document) 레벨의 메타데이터로 저장합니다.

## 2. 상세 구현 단계

### STEP 1: 데이터베이스 스키마 확장 (SQL)
`g5_jaebong_documents` 테이블에 URL을 저장할 컬럼을 추가합니다.

```sql
ALTER TABLE `g5_jaebong_documents` 
ADD COLUMN `main_url` VARCHAR(500) DEFAULT NULL AFTER `edit_token`;
```

### STEP 2: 백엔드 동기화 로직 수정 (PHP)
`/api/docs/sync.php`에서 `main_url` 파라미터를 받아 업데이트하도록 수정합니다.

- **대상 파일**: `api/docs/sync.php`
- **수정 내용**: 
  - `PATCH` 요청의 body에서 `main_url` 추출
  - `UPDATE` 쿼리에 `main_url` 필드 추가

### STEP 3: 백엔드 조회 로직 수정 (PHP)
문서 조회 시 저장된 `main_url`을 함께 반환하도록 수정합니다.

- **대상 파일**: `api/docs/read.php`
- **수정 내용**: `SELECT` 절에 `main_url` 추가 및 반환 데이터에 포함

### STEP 4: 프론트엔드 API 통신 수정 (JS)
`syncDocument` 함수가 `mainUrl`을 전달할 수 있도록 확장합니다.

- **대상 파일**: `js/util/api.js`
- **수정 내용**: `syncDocument` 인자값에 `mainUrl` 추가 및 body에 포함

### STEP 5: 의뢰서 생성 시 저장 실행 (JS)
팝업에서 '시작' 버튼 클릭 시 즉시 DB 동기화를 수행합니다.

- **대상 파일**: `js/core/viewer.js`
- **수정 내용**: `showSharePopup()` 내 `UI.btnStartShare.onclick` 핸들러에서 `SyncAPI.syncDocument`를 먼저 호출한 뒤 화면 전환 진행

### STEP 6: 데이터 복원 로직 추가 (JS)
페이지 로딩 시 서버로부터 받은 `main_url`을 전역 상태에 로드합니다.

- **대상 파일**: `js/main.js`
- **수정 내용**: `SyncAPI.readDocument` 결과에서 `main_url`을 추출하여 `S.maintUrl`에 할당

## 3. 예외 처리 및 주의사항
- **길이 제한**: 입력된 URL이 500자(VARCHAR 500)를 초과하지 않도록 프론트엔드에서 캡처리하거나, DB 타입을 `TEXT`로 조정할지 검토 필요 (일반적으로 500자면 충분).
- **보안**: `addslashes()` 등을 통해 SQL Injection 방지 (기존 API 패턴 준수).
- **UX**: URL 저장 시 네트워크 지연이 발생할 수 있으므로, '시작' 클릭 직후 로딩바 상태에서 자연스럽게 처리가 완료되도록 연동.
