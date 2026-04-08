/**
 * @file viewer-main.js
 * @description 단순 열람/공유용 뷰어 모듈
 */
import { S } from './store/state.js';
import { UI, initUI } from './store/elements.js';
import { SyncAPI } from './util/api.js';
import { renderViewerContent, applyPermissionUI } from './core/viewer.js';
import { GTM } from './util/gtm.js';

async function startup() {
    S.isViewerMode = true;

    // UI 요소 초기화
    initUI();

    // 기기 식별자(UUID) 획득 및 설정
    let myUuid = localStorage.getItem('jaebong_uuid');
    if (!myUuid) {
        myUuid = crypto.randomUUID();
        localStorage.setItem('jaebong_uuid', myUuid);
    }
    S.myUuid = myUuid;

    const urlParams = new URLSearchParams(window.location.search);
    const currentId = urlParams.get('id');

    if (!currentId) {
        alert('잘못된 접근입니다.');
        window.location.href = '/jaebong/';
        return;
    }

    const res = await SyncAPI.readDocument(currentId);
    if (!res.success) {
        alert('문서를 찾을 수 없거나 서버 통신에 실패했습니다.');
        window.location.href = '/jaebong/';
        return;
    }

    try {
        const payload = JSON.parse(res.data.history_json || '{"history":[]}');
        S.history = Array.isArray(payload) ? payload : (payload.history || []);
        S.updatedAt = res.data.updated_at; // DB에 저장된 마지막 수정시간 저장

        // [신규] 저장된 메인 URL 복원 (viewMaintInfo 표시용)
        if (res.data.main_url) {
            S.maintUrl = res.data.main_url;
        }
    } catch (e) {
        S.history = [];
    }

    // 문서 로딩 성공 시 뷰어 진입 이벤트 발생
    GTM.push('shared_page_view', {
        request_count_total: S.history.length
    });

    // 뷰어 계층 팝업 렌더링 (공통 엔진 사용)
    applyPermissionUI();
    renderViewerContent();

    // [구조 개편] 공유 모드(?id=)에서는 편집 권한 관련 버튼 로직을 제거합니다.
    // 모든 관리 기능은 /jaebong/ 워크스페이스 내부에서만 수행됩니다.

    // 검토 완료(하단 도달) 및 스크롤 깊이 추적 로직
    let reviewStarted = false;
    let milestones = { 25: false, 50: false, 75: false };
    let reviewCompleted = false;

    window.addEventListener('scroll', () => {
        // 첫 상호작용 (첫 스크롤) 시 시작 이벤트 발생
        if (!reviewStarted && window.scrollY > 0) {
            reviewStarted = true;
            GTM.push('review_start');
        }

        const scrollPos = window.innerHeight + window.scrollY;
        const totalHeight = document.body.offsetHeight;
        const scrollPct = Math.round((scrollPos / totalHeight) * 100);

        // 마일스톤 체크 (25%, 50%, 75% 도달 시 1회만 발생)
        [25, 50, 75].forEach(ms => {
            if (!milestones[ms] && scrollPct >= ms) {
                milestones[ms] = true;
                GTM.push('review_scroll', { scroll_depth: ms });
            }
        });

        if (reviewCompleted) return;
        if (scrollPos >= totalHeight - 50) {
            reviewCompleted = true;
            GTM.push('review_complete');
        }
    }, { passive: true });
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startup);
} else {
    startup();
}
