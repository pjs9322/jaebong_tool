# Task 004: 커스텀 실행 취소 (Undo / Redo) 기능 개발

## Goal
Canvas 요소 내 `undo`, `redo`를 지원하는 이력관리 시스템(스냅샷 배열)을 구현해, 단축키나 버튼 조작으로 쉽게 작업 내역을 되돌립니다.

## Plan
- 사용자 액션 발생 시 직렬화된 이전 상태를 저장소 큐(`undoStack`, `redoStack`)로 PUSH.
- `Ctrl + Z`, `Cmd + Z` 이벤트 단축키 리스너를 결합.

## Result
(작업 대기 중)
