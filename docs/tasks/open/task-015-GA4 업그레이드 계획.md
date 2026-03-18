# 재봉툴 GA4 이벤트 설계서 1차안

## 문서 목적

본 문서는 재봉툴의 실제 사용 흐름을 데이터로 분석하기 위한 GA4 이벤트 설계 기준안이다. 본 설계의 목적은 단순 방문 수 집계가 아니라, 사용자가 재봉툴 안에서 어떤 과정을 거쳐 작업을 시작하고, 어디에서 이탈하며, 어떤 행동이 실제 성과로 이어지는지를 제품 관점에서 파악하는 데 있다. 따라서 본 문서는 마케팅 성과 측정보다 **프로덕트 사용 흐름 분석**에 초점을 둔다.

이 문서는 박준성 개발팀장이 재봉툴 프론트엔드 및 GTM/GA4 연동 구현 시 바로 참고할 수 있도록, 이벤트 구조, 파라미터, 구현 우선순위, 측정 목적까지 포함한 실무용 기준 문서로 작성되었다.

---

## 1. 배경 및 필요성

재봉툴은 일반적인 랜딩페이지가 아니라, 사용자가 직접 URL 또는 이미지를 불러오고, 캔버스에서 영역을 지정하고, 요청사항을 메모로 정리한 뒤, 최종적으로 링크 또는 PDF 형태의 유지보수 의뢰서를 생성·공유하는 **작업형 도구**이다.

따라서 일반적인 페이지뷰 중심 분석만으로는 제품의 사용성을 제대로 판단할 수 없다. 재봉툴은 다음과 같은 질문에 답할 수 있어야 한다.

* 사용자는 진입 후 실제로 페이지를 불러오는가
* URL 불러오기와 파일 업로드 중 어떤 시작 방식이 더 잘 작동하는가
* 메모 작성까지 도달하는 사용자는 얼마나 되는가
* 요청사항 리스트를 몇 개까지 만드는가
* 어디에서 시간을 가장 많이 쓰는가
* 링크 생성은 많이 하지만 실제 공유와 검토까지 이어지는가
* 공유 링크를 받은 검토자는 실제로 문서를 읽고 나가는가, 아니면 열어만 보고 이탈하는가

즉, 이번 GA4 설계의 핵심은 “방문자가 몇 명인가”가 아니라, **재봉툴이 실제 업무 도구로서 얼마나 사용되고 있는가**를 보는 것이다.

---

## 2. 분석 목표

본 설계는 아래 세 가지 목표를 기준으로 한다.

### 2.1 작성자 퍼널 분석

재봉툴 작성자가 작업공간에 진입한 뒤, 페이지를 불러오고, 요청사항을 만들고, 최종적으로 의뢰서를 생성·공유하기까지의 전체 흐름을 추적한다.

### 2.2 병목 구간 식별

페이지 불러오기 실패, 박스 지정 후 메모 미작성, 요청사항 저장 직전 이탈, 생성 후 다시 편집으로 복귀하는 비율 등, 사용자가 막히는 구간을 파악한다.

### 2.3 공유 이후 검토 행동 분석

생성된 링크가 실제로 열리는지, 검토자가 문서를 얼마나 읽는지, 단순 조회에 그치는지 아니면 실제 검토로 이어지는지를 확인한다.

---

## 3. 측정 범위

이번 1차안의 측정 범위는 다음 두 그룹으로 구분한다.

### 3.1 작성자 영역

* 작업공간 진입
* 튜토리얼 시작 / 완료 / 스킵
* 페이지 불러오기 시작 / 성공 / 실패 / 재시도
* 캔버스 진입 및 박스 생성
* 메모 작성 및 요청사항 저장
* 요청사항 수정 / 삭제
* 결과 생성 시작 / 완료 / 실패
* 공유 링크 생성 / 복사 / PDF 다운로드

### 3.2 검토자 영역

* 공유 링크 진입
* 의뢰서 열람 시작
* 스크롤 및 체류
* 검토 완료 행동
* 이탈

---

## 4. 구현 원칙

### 4.1 기본 원칙

재봉툴의 핵심 행동은 대부분 일반적인 클릭 이벤트보다 복잡한 업무 흐름에 가깝기 때문에, GA4 자동 수집에 의존하지 않고 **프론트엔드에서 dataLayer.push 기반 커스텀 이벤트를 명시적으로 발생시키는 구조**를 기본 원칙으로 한다.

### 4.2 이벤트명 규칙

이벤트명은 `jt_` 접두어를 사용하여 재봉툴 전용 이벤트임을 명확히 구분한다.

예시:

* `jt_workspace_view`
* `jt_page_import_start`
* `jt_request_item_save`
* `jt_share_link_generate_complete`

단, GA4 추천 이벤트 중 의미가 명확한 것은 표준명을 유지한다.

예시:

* `tutorial_begin`
* `tutorial_complete`
* `share`

### 4.3 파라미터 설계 원칙

파라미터는 “분석에 실제로 사용할 값” 위주로 최소한만 우선 설계한다. 수집은 많이 하되, 1차 등록은 핵심 파라미터 중심으로 진행한다.

---

## 5. 핵심 퍼널 정의

### 5.1 작성자 핵심 퍼널

1. `jt_workspace_view`
2. `jt_page_import_success`
3. `jt_request_item_save`
4. `jt_share_link_generate_complete`
5. `jt_share_link_copy` 또는 `share`

이 퍼널을 통해 “도구에 들어온 사용자 중 실제로 작업 결과를 외부에 전달할 정도로 완료한 비율”을 파악할 수 있다.

### 5.2 검토자 핵심 퍼널

1. `jt_shared_page_view`
2. `jt_review_start`
3. `jt_review_complete`

이 퍼널을 통해 “공유 링크가 단순 조회에 그치는지, 실제 검토로 이어지는지”를 파악할 수 있다.

---

## 6. 이벤트 설계 상세

### 6.1 작업공간 / 진입 이벤트

#### `jt_workspace_view`

작업공간 첫 진입 시 발생한다.

**목적**
재봉툴 진입 수와 이후 행동 전환율의 시작점을 잡는다.

**권장 파라미터**

* `workspace_id`
* `user_role` = `creator`
* `entry_type` = `direct` / `return_visit`
* `is_returning_user` = `true` / `false`

#### `jt_workspace_resume`

기존 작업공간을 이어서 다시 열었을 때 발생한다.

**목적**
초회 사용과 재방문 사용을 구분하고, 재사용률을 본다.

#### `jt_workspace_reset`

의뢰서 초기화 클릭 시 발생한다.

**목적**
중도 포기 성향, 잘못된 진입 또는 초기화 빈도를 파악한다.

---

### 6.2 튜토리얼 이벤트

#### `tutorial_begin`

튜토리얼 시작 시 발생한다.

#### `jt_tutorial_step_view`

튜토리얼 단계 노출 시 발생한다.

**권장 파라미터**

* `tutorial_step`
* `step_name`

#### `jt_tutorial_step_complete`

사용자가 해당 단계의 안내를 수행했을 때 발생한다.

#### `tutorial_complete`

튜토리얼을 끝까지 완료했을 때 발생한다.

#### `jt_tutorial_skip`

튜토리얼 Skip 클릭 시 발생한다.

**목적**
튜토리얼이 실제로 사용 성공률에 기여하는지 비교한다.

**권장 파라미터**

* `tutorial_step`
* `elapsed_ms`

---

### 6.3 페이지 불러오기 이벤트

#### `jt_page_import_start`

페이지 불러오기 시작 시 발생한다.

**권장 파라미터**

* `workspace_id`
* `source_type` = `url` / `upload` / `paste`
* `url_domain` (가능한 경우)

#### `jt_page_import_success`

페이지 불러오기 성공 시 발생한다.

**목적**
재봉툴의 핵심 첫 행동 성공률을 측정한다.

**권장 파라미터**

* `workspace_id`
* `source_type`
* `url_domain`
* `elapsed_ms`
* `page_height_bucket`

#### `jt_page_import_fail`

페이지 불러오기 실패 시 발생한다.

**목적**
기술적 병목 및 사용자 이탈 원인 파악.

**권장 파라미터**

* `workspace_id`
* `source_type`
* `url_domain`
* `elapsed_ms`
* `fail_reason` = `timeout` / `blocked` / `invalid_url` / `render_error`

#### `jt_page_import_retry`

불러오기 재시도 시 발생한다.

**목적**
실패 후 재도전 비율을 측정한다.

---

### 6.4 캔버스 상호작용 이벤트

#### `jt_canvas_view`

캔버스가 실제로 사용자에게 노출되었을 때 발생한다.

#### `jt_box_draw_start`

사용자가 수정 영역 박스를 그리기 시작할 때 발생한다.

#### `jt_box_draw_complete`

박스 생성 완료 시 발생한다.

**권장 파라미터**

* `workspace_id`
* `box_id`
* `box_count_total`
* `box_area_ratio`
* `elapsed_ms_from_canvas_view`

#### `jt_box_resize`

생성한 박스를 리사이즈할 때 발생한다.

#### `jt_box_delete`

생성한 박스를 삭제할 때 발생한다.

#### `jt_box_reselect`

기존 박스를 클릭해 다시 선택할 때 발생한다.

**목적**
캔버스 조작이 얼마나 직관적인지, 박스 선택 실수가 많은지 판단한다.

---

### 6.5 메모 / 요청사항 이벤트

#### `jt_memo_create_start`

메모 입력을 시작했을 때 발생한다.

#### `jt_memo_create_complete`

메모 작성 완료 시 발생한다.

**권장 파라미터**

* `workspace_id`
* `request_item_id`
* `memo_length`
* `memo_image_count`
* `elapsed_ms`

#### `jt_memo_edit`

메모 수정 시 발생한다.

#### `jt_memo_delete`

메모 삭제 시 발생한다.

#### `jt_request_item_add`

요청사항 항목이 새로 추가될 때 발생한다.

#### `jt_request_item_save`

요청사항 저장 완료 시 발생한다.

**권장 파라미터**

* `workspace_id`
* `request_item_id`
* `category` = `content_edit` / `item_add` / `function_edit` / `function_dev`
* `request_count_total`
* `memo_count_total`
* `box_linked_count`
* `elapsed_ms`

#### `jt_request_item_edit`

저장된 요청사항 수정 시 발생한다.

#### `jt_request_item_delete`

저장된 요청사항 삭제 시 발생한다.

**목적**
실제 요청사항 작성 생산성, 수정 반복 여부, 카테고리별 사용량을 파악한다.

---

### 6.6 결과 생성 이벤트

#### `jt_generate_start`

의뢰서 생성 시작 시 발생한다.

#### `jt_generate_success`

의뢰서 생성 성공 시 발생한다.

**권장 파라미터**

* `workspace_id`
* `request_count_total`
* `memo_count_total`
* `box_count_total`
* `elapsed_ms_total`

#### `jt_generate_fail`

의뢰서 생성 실패 시 발생한다.

**권장 파라미터**

* `workspace_id`
* `fail_reason`
* `elapsed_ms_total`

#### `jt_result_view`

결과 화면 진입 시 발생한다.

#### `jt_edit_return_from_result`

결과 확인 후 다시 편집 모드로 돌아갈 때 발생한다.

**목적**
결과물 만족도 대리 지표로 사용한다. 생성 후 바로 편집으로 돌아가는 비율이 높다면 결과 화면 또는 결과 품질 개선이 필요하다는 신호일 수 있다.

---

### 6.7 공유 / PDF 이벤트

#### `jt_share_link_generate_start`

공유 링크 생성 시작 시 발생한다.

#### `jt_share_link_generate_complete`

공유 링크 생성 완료 시 발생한다.

**권장 파라미터**

* `workspace_id`
* `share_link_id`
* `request_count_total`
* `elapsed_ms`

#### `share`

공유 액션 발생 시 표준 이벤트로 사용한다.

**권장 파라미터**

* `method` = `copy` / `kakao` / `email` / `manual`
* `share_link_id`

#### `jt_share_link_copy`

공유 링크 복사 시 발생한다.

#### `jt_pdf_download`

PDF 다운로드 시 발생한다.

**목적**
링크 생성과 실제 공유, PDF 저장 행동의 차이를 구분한다.

---

### 6.8 검토자 이벤트

#### `jt_shared_page_view`

공유 링크를 통해 문서에 진입했을 때 발생한다.

**권장 파라미터**

* `share_link_id`
* `workspace_id`
* `user_role` = `reviewer`
* `viewer_type` = `first_viewer` / `repeat_viewer`

#### `jt_review_start`

검토자가 의뢰서 읽기를 시작했을 때 발생한다.

#### `jt_review_scroll`

검토 페이지에서 의미 있는 스크롤 기준 도달 시 발생한다.

**권장 파라미터**

* `scroll_depth`

#### `jt_review_complete`

검토 완료로 볼 수 있는 행동 시 발생한다.

예시 기준:

* 문서 하단 도달
* 특정 CTA 클릭
* 일정 시간 이상 체류 + 스크롤 기준 충족

#### `jt_review_exit`

공유 페이지 이탈 시 발생한다.

**권장 파라미터**

* `engaged_time_ms`
* `reviewed_request_count`

**목적**
공유 이후 실제 검토 행동을 파악한다.

---

## 7. 공통 파라미터 정의

1차안에서 우선 표준화할 핵심 파라미터는 아래와 같다.

* `workspace_id` : 작업공간 식별자
* `share_link_id` : 공유 링크 식별자
* `user_role` : `creator` / `reviewer`
* `entry_type` : `direct` / `return_visit` / `shared_link`
* `source_type` : `url` / `upload` / `paste`
* `request_item_id` : 요청사항 항목 식별자
* `category` : 요청사항 카테고리
* `request_count_total` : 현재까지 저장된 요청사항 수
* `memo_count_total` : 전체 메모 수
* `box_count_total` : 전체 박스 수
* `elapsed_ms` : 특정 액션 소요 시간
* `elapsed_ms_total` : 전체 생성 소요 시간
* `fail_reason` : 실패 사유
* `viewer_type` : `first_viewer` / `repeat_viewer`
* `reviewed_request_count` : 검토자가 실제로 읽은 항목 수
* `scroll_depth` : 공유 문서 열람 깊이

---

## 8. GA4 Custom Dimensions / Metrics 등록 권장안

### 8.1 Custom Dimensions

다음 항목은 차원으로 등록하는 것을 권장한다.

* `workspace_id`
* `share_link_id`
* `user_role`
* `entry_type`
* `source_type`
* `category`
* `fail_reason`
* `viewer_type`

### 8.2 Custom Metrics

다음 항목은 측정항목으로 등록하는 것을 권장한다.

* `elapsed_ms`
* `elapsed_ms_total`
* `request_count_total`
* `memo_count_total`
* `box_count_total`
* `reviewed_request_count`
* `scroll_depth`

---

## 9. Key Event 지정 권장안

1차안에서는 아래 이벤트를 Key Event로 우선 관리하는 것을 권장한다.

* `jt_page_import_success`
* `jt_request_item_save`
* `jt_generate_success`
* `jt_share_link_generate_complete`
* `share`
* `jt_pdf_download`
* `jt_review_complete`

이벤트를 Key Event로 지정하면, 단순 발생 수가 아니라 “재봉툴에서 중요하게 보는 성과 행동”으로 일관되게 관리할 수 있다.

---

## 10. 우선 구현 순서

모든 이벤트를 한 번에 구현하지 말고, 아래 순서로 진행하는 것을 권장한다.

### 1차 필수 구현

* `jt_workspace_view`
* `tutorial_begin`
* `tutorial_complete`
* `jt_page_import_start`
* `jt_page_import_success`
* `jt_page_import_fail`
* `jt_request_item_save`
* `jt_request_item_edit`
* `jt_generate_success`
* `jt_share_link_generate_complete`
* `jt_shared_page_view`

### 2차 확장 구현

* `jt_box_draw_complete`
* `jt_memo_create_complete`
* `jt_share_link_copy`
* `jt_pdf_download`
* `jt_review_start`
* `jt_review_complete`
* `jt_edit_return_from_result`

### 3차 정밀 분석 구현

* `jt_box_resize`
* `jt_box_delete`
* `jt_memo_edit`
* `jt_review_scroll`
* `jt_workspace_resume`
* `jt_page_import_retry`

---

## 11. GTM / dataLayer 구현 예시

재봉툴 프론트엔드에서는 핵심 액션마다 아래와 같은 형태로 `dataLayer.push()`를 호출하는 방식이 적합하다.

```javascript
window.dataLayer = window.dataLayer || [];
window.dataLayer.push({
  event: 'jt_request_item_save',
  workspace_id: 'ws_123',
  request_item_id: 'req_3',
  category: 'content_edit',
  request_count_total: 3,
  memo_count_total: 5,
  box_count_total: 4,
  elapsed_ms: 18450
});
```

GTM에서는 위 `event` 값을 기준으로 Custom Event Trigger를 만들고, 해당 값을 GA4 Event Tag로 전송하면 된다.

---

## 12. 권장 리포트 / 탐색 구조

### 12.1 퍼널 탐색

작성자 핵심 퍼널:

* 작업공간 진입
* 페이지 불러오기 성공
* 요청사항 저장
* 의뢰서 생성 완료
* 공유 링크 생성 완료

검토자 퍼널:

* 공유 링크 진입
* 검토 시작
* 검토 완료

### 12.2 소스 유형 비교

`source_type` 별로 아래를 비교한다.

* 페이지 불러오기 성공률
* 요청사항 저장률
* 생성 완료율
* 공유 링크 생성률
* 평균 소요 시간

### 12.3 생산성 분석

* 요청사항 1개 저장 평균 시간
* 메모 생성 평균 시간
* 요청사항 수정 횟수
* 결과 생성까지 총 소요 시간

### 12.4 결과물 활용도 분석

* 생성 후 결과 보기 비율
* PDF 다운로드율
* 공유 링크 복사율
* 생성 후 편집 복귀율

### 12.5 공유 후 검토 품질 분석

* 공유 링크 조회 수
* 조회 대비 검토 시작률
* 검토 완료율
* 평균 체류 시간
* 평균 스크롤 깊이

---

## 13. 기대 효과

본 설계를 기반으로 GA4를 적용하면 재봉툴은 단순 방문 분석을 넘어, 다음과 같은 수준의 제품 분석이 가능해진다.

* 사용자가 실제로 도구를 끝까지 사용하는지 여부 파악
* 가장 큰 이탈 구간 식별
* URL 불러오기와 업로드 방식 중 어떤 진입 방식이 더 효율적인지 비교
* 요청사항 작성 UX의 생산성 측정
* 결과물 만족도 대리 지표 확보
* 공유 이후 실제 검토까지 이어지는지 확인

즉, 본 설계는 재봉툴을 “사람들이 들어오는 페이지”가 아니라, **실제로 업무가 수행되는 제품**으로 측정하기 위한 최소한의 분석 기반이다.

---

## 14. 최종 정리

이번 1차안의 본질은 명확하다.

재봉툴에서 중요한 것은 단순한 트래픽 수가 아니라,
**들어왔는가 → 불러왔는가 → 작성했는가 → 생성했는가 → 공유했는가 → 검토됐는가**의 흐름이다.

따라서 GA4 설계 역시 이 작업 흐름을 기준으로 구성되어야 하며, 각 단계에서 사용자의 성공, 실패, 소요 시간, 수정 행동을 측정할 수 있어야 한다.

본 문서는 그 기준을 개발 구현 가능한 수준으로 정리한 1차안이며, 구현 이후 실제 데이터가 쌓이면 2차 설계에서 이벤트 간소화 또는 세분화를 다시 검토할 수 있다.

---

## 15. 실제 구현 가능성 검토 및 매핑 (1차)

본 섹션은 현재 재봉툴의 기술 구조(`S` 객체 및 `SyncAPI`)를 바탕으로 즉시 수집 가능한 데이터와 이벤트를 정리한 것이다.

### 15.1 핵심 파라미터 (Parameters)

| 파라미터명 | 설명 (매핑 데이터) |
| :--- | :--- |
| `workspace_id` | 작업공간 및 문서 고유 식별자 (현재 `S.docId`와 동일) |
| `user_role` | 사용자 권한 (`creator`: 소유자/작성자, `reviewer`: 외부 검토자) |
| `user_uuid` | 기기 기반 고용 식별자 (`S.myUuid`) |
| `source_type` | 이미지 수급 방식 (`url`, `upload`, `paste`, `capture`) |
| `category` | 요청사항 카테고리 (`text`, `layout`, `func`, `dev`, `asset`) |
| `request_count_total` | 현재 누적된 총 요청사항 개수 (`S.history.length`) |
| `fail_reason` | 페이지 불러오기 실패 시 구체적 사유 (`timeout`, `invalid`, `error` 등) |
| `is_viewer_mode` | 현재 진입한 모드 상태 (`S.isViewerMode`) |

### 15.2 주요 이벤트 (Events)

| 이벤트명 | 설명 (발생 시점) |
| :--- | :--- |
| `jt_workspace_view` | 에디터 작업공간 최초 로드 완료 시 |
| `jt_workspace_reset` | 상단 '의뢰서 초기화' 버튼 클릭 시 |
| `tutorial_begin` | 서비스 튜토리얼 팝업 첫 노출 시 |
| `jt_tutorial_step` | 튜토리얼 단계별 이동 및 안내 노출 시 |
| `tutorial_complete` | 튜토리얼 마지막 단계까지 확인 완료 시 |
| `jt_tutorial_skip` | 튜토리얼 스킵(Skip) 버튼 클릭 시 |
| `jt_page_import_start` | URL 입력 캡처 또는 파일 업로드 시도 시작 시 |
| `jt_page_import_success` | 이미지 로드 및 캔버스 렌더링이 최종 성공한 시점 |
| `jt_page_import_fail` | 기술적 에러 또는 타임아웃으로 로드 실패 시 |
| `jt_request_item_save` | 요청사항 '리스트 추가하기' 또는 '수정 완료' 버튼 클릭 성공 시 |
| `jt_request_item_delete` | 저장된 요청사항 카드 삭제 시 |
| `jt_share_link_generate_complete` | 공유 로딩 애니메이션 종료 후 뷰어 레이어로 전환 완료 시 |
| `jt_shared_page_view` | 검토자가 공유된 링크를 통해 뷰어 모드 진입 시 |
| `jt_review_complete` | 뷰어 모드 하단 도달 또는 일정 시간 체류 확인 시 |
