/**
 * @file viewer-main.js
 * @description 단순 열람/공유용 뷰어 모듈
 */
import { S } from './store/state.js';
import { UI, initUI } from './store/elements.js';
import { SyncAPI } from './util/api.js';
import { renderViewerContent } from './core/viewer.js';
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
    } catch (e) {
        S.history = [];
    }

    // 문서 로딩 성공 시 뷰어 진입 이벤트 발생
    GTM.push('shared_page_view', {
        request_count_total: S.history.length
    });

    // 소유자 권한 확인 후 버튼 노출
    const isOwner = res.data.owner_uuid === S.myUuid;
    if (isOwner) {
        if (UI.viewerBtns) UI.viewerBtns.style.display = 'flex';

        if (UI.backToEditBtn) {
            UI.backToEditBtn.onclick = () => {
                GTM.push('edit_return_from_result');
                window.location.href = '/jaebong/'; // 파라미터 제외하고 접근하여 에디터 진입
            };
        }

        const copyBtn = document.getElementById('btnCopyLinkViewer');
        if (copyBtn) {
            copyBtn.onclick = () => {
                const baseUrl = window.location.origin + window.location.pathname;
                const urlToCopy = baseUrl.endsWith('/') ? `${baseUrl}?id=${currentId}` : `${baseUrl}/?id=${currentId}`;
                navigator.clipboard.writeText(urlToCopy).then(() => {
                    alert('공유 링크가 클립보드에 복사되었습니다!\n(' + urlToCopy + ')');
                    GTM.push('share', { share_method: 'copy', share_link_id: currentId });
                }).catch(err => {
                    alert('링크 복사에 실패했습니다. 수동으로 복사해주세요.\n' + urlToCopy);
                });
            };
        }
    } else {
        if (UI.viewerBtns) UI.viewerBtns.style.display = 'none';
    }

    // 뷰어 계층 팝업 렌더링 (공통 엔진 사용)
    renderViewerContent();

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
