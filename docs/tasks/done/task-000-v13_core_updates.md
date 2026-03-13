# Task: v13 코어 업데이트 및 리팩토링

## Goal
- 기존 발생하던 좀비 데이터 렌더링, PDF-Web UI 불일치, 저장되지 않은 작업 유실 등의 버그 수정 및 UX 개선
- Vanilla JS FSM 패턴 기반의 프론트엔드 모듈 아키텍처 정립

## Research & 쟁점
- 텍스트 메모 전용 저장 시 이전 클립보드 이미지(`S.baseImgSrc`)가 남는 이슈
- PDF 렌더링(`html2canvas`, `jsPDF`) 속성과 `viewer` CSS의 비동기적 디자인 파편화
- FSM(`S.state`) 전환 과정에서 `MEMO_WAIT` 상태 중 리스트 추가 시 초기화 로직 누락 방지 필요

## Plan
1. `history.js`: 텍스트 메모 작성 시점 및 수정 버튼 동작 시 상태 초기화 로직에 `S.baseImgSrc = null;` 등을 추가하여 가드 강화
2. `imageLoader.js` / `history.js`: 타 작업 전환 시 전역 `confirm` 경고 로직 추가
3. `pdfExport.js`: 내보내기 템플릿 마크업을 `viewer.css`의 스타일링 객체로 일치화
4. `main.js`: `localStorage.tutorialSeen` 값 체크 로직으로 튜토리얼 중복 노출 차단

## Result (완료)
- 위 계획대로 업데이트 진행하여 모든 패치 완료.
- Garbage Data나 Zombie Image 완전 차단 보장됨.
