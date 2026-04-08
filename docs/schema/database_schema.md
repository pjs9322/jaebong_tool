# Database Schema Definition

이 파일은 재봉툴 프로젝트의 데이터베이스 테이블 구조와 관계를 정의합니다.

<!-- 마리아 DB mysql 기반 환경 -->

## Tables

### 1. `g5_jaebong_documents`
의뢰서(문서)의 메타데이터와 소유권 정보를 저장하는 메인 테이블입니다.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | VARCHAR(50) | 문서 고유 ID (PK) |
| `owner_uuid` | VARCHAR(100) | 작성자 기기 고유 식별값 (UUID, INDEX) |
| `edit_token` | VARCHAR(100) | 수정 권한 확인을 위한 시크릿 토큰 |
| `main_url` | VARCHAR(500) | 유지보수 대상 홈페이지 메인 URL |
| `admin_memo` | TEXT | 관리자 대시보드 내부 메모 |
| `created_at` | DATETIME | 생성 일시 (Default: CURRENT_TIMESTAMP) |
| `updated_at` | DATETIME | 최종 수정 일시 (ON UPDATE CURRENT_TIMESTAMP) |

> **SQL 확인:** `DESCRIBE g5_jaebong_documents;`

---

### 2. `g5_jaebong_items`
의뢰서 내에 포함된 개별 요청 사항(카드) 데이터를 저장합니다. (현 분산 구조의 핵심)

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INT(11) | 자동 증가 PK |
| `document_id` | VARCHAR(50) | 소속된 문서 ID (INDEX) |
| `item_uuid` | VARCHAR(100) | 카드 고유 ID (UNIQUE) |
| `item_json` | MEDIUMTEXT | 카드의 데이터 (이미지/메모/좌표) |
| `is_completed` | TINYINT(1) | 검토 완료 여부 (Default: 0) |
| `sort_order` | INT(11) | 출력 순서 (Default: 0) |
| `created_at` | DATETIME | 생성 일시 (Default: CURRENT_TIMESTAMP) |
| `updated_at` | DATETIME | 수정 일시 (ON UPDATE CURRENT_TIMESTAMP) |

> **SQL 확인:** `DESCRIBE g5_jaebong_items;`

---

### 3. `g5_jaebong_images`
업로드된 모든 이미지 자산의 매핑 정보를 관리합니다. (UUID 기반 에셋 정규화)

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INT(11) | 자동 증가 PK |
| `image_uuid` | VARCHAR(100) | 이미지 참조 UUID |
| `document_id` | VARCHAR(50) | 관련 문서 ID (INDEX) |
| `url` | VARCHAR(255) | 이미지 서버 업로드 경로 |
| `is_deleted` | TINYINT(1) | 삭제 여부 (Default: 0, Soft Delete) |
| `deleted_at` | DATETIME | 삭제 일시 |
| `created_at` | DATETIME | 생성 일시 (Default: CURRENT_TIMESTAMP) |

> **SQL 확인:** `DESCRIBE g5_jaebong_images;`