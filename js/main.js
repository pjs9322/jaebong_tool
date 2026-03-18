/**
 * @file main.js
 * @description 어플리케이션의 시작점(Entry Point). 각 모듈별 초기화 함수 수행 및 튜토리얼 오버레이 로직 제어.
 */
import { S } from './store/state.js';
import { UI, initUI } from './store/elements.js';
import { initImageLoader } from './utils/imageLoader.js';
import { initCanvas } from './core/canvas.js';
import { initHistory } from './core/history.js';
import { initPdfExport } from './services/pdfExport.js';
import { initViewer } from './core/viewer.js';
import { renderQueue } from './core/history.js';
import { SyncAPI } from './util/api.js';
import { GTM } from './util/gtm.js';

async function startup() {
    // 1. UI Elements 
    initUI();

    // 2. Initialize modules
    initImageLoader();
    initCanvas();
    initHistory();
    // initPdfExport(); // PDF 비활성화 (Task 008)
    initViewer();

    // 3. 기기 식별 및 SyncAPI 연동 (Task 001)
    let myUuid = localStorage.getItem('jaebong_uuid');
    if (!myUuid) {
        myUuid = crypto.randomUUID();
        localStorage.setItem('jaebong_uuid', myUuid);
        // 시크릿 모드/탭 닫기 유실에 대한 UI 경고 고지 (Task 001)
        alert('⚠️ 주의: 시크릿 모드에서 탭을 닫으면 작업 이력이 유실될 수 있습니다.\n기기 식별자 기반으로 자동 저장되므로 일반 탭 사용을 권장합니다.');
    }
    S.myUuid = myUuid;

    // GA4 user_id 설정 (GTM을 통해 처리할 수도 있으나, 기존 config 유지를 위해 수동 호출 병행 가능)
    if (typeof gtag !== 'undefined') {
        gtag('config', 'G-YBE8TSJ406', { 'user_id': myUuid });
    }

    // [루트 신규/재접속 모드 - 파라미터 없음]
    const initRes = await SyncAPI.initDocument(S.myUuid);
    if (initRes.success) {
        const newDocId = initRes.data.id;
        S.docId = newDocId;
        S.editToken = initRes.data.edit_token;
        console.log('[Init] Editor Mode - Created/Loaded. docId:', S.docId, ', editToken:', S.editToken);
        S.isViewerMode = false;
        const isReturning = !initRes.data.is_new;

        GTM.push('workspace_view', {
            is_returning_user: isReturning,
            entry_type: isReturning ? 'return_visit' : 'direct'
        });

        if (!initRes.data.is_new) {
            const currDoc = await SyncAPI.readDocument(newDocId);
            if (currDoc.success) {
                try {
                    const payload = JSON.parse(currDoc.data.history_json || '{"history":[]}');
                    S.history = Array.isArray(payload) ? payload : (payload.history || []);
                    if (S.history.length > 0) {
                        GTM.push('workspace_resume', { request_count_total: S.history.length });
                    }
                } catch (e) { }
                renderQueue();
            }
        }
    } else {
        alert('초기 통신에 실패했습니다.');
    }

    // --- 튜토리얼 로직 ---
    const steps = [
        { el: 'tut-step1-area', title: '이미지 불러오기', desc: '웹사이트의 URL을 직접 입력하거나<br>이미지 파일을 업로드하세요.' },
        { el: 'step2Panel', title: '화면 수정 표시', desc: '불러온 이미지 위에서 마우스를 드래그해<br>수정할 영역을 박스로 표시하세요.' },
        { el: 'step3Panel', title: '상세 메모 작성', desc: '박스에 대한 상세 내용을 적고<br>리스트에 저장하세요.' },
        { el: ['tut-step4-area', 'editorBtns'], title: '리스트 확인 및 웹링크 생성', desc: '생성한 요청사항 리스트를 검토하고<br>웹 링크를 생성하여 공유하세요.' }
    ];

    function showTutorial(idx) {
        if (idx >= steps.length) {
            UI.tutOverlay.style.display = 'none';
            localStorage.setItem('tutorialSeen', 'true');
            return;
        }

        const tutSpot2 = document.getElementById('tutSpot2');

        if (idx === 0) {
            UI.tutSpot.style.transition = 'none';
            tutSpot2.style.transition = 'none';
            UI.tutCard.style.transition = 'none';
        }

        UI.tutOverlay.style.display = 'block';

        const step = steps[idx];
        const targets = Array.isArray(step.el) ? step.el : [step.el];

        // 애니메이션 루프 관리를 위한 전역 변수 (필요 시 startup 바깥으로 이동 가능하나 여기서는 함수 클로저 활용)
        if (!window._tutLoopStarted) {
            window._tutLoopStarted = true;
            const loop = () => {
                if (UI.tutOverlay.style.display === 'block') {
                    if (window._updateAllSpotsFunc) window._updateAllSpotsFunc();
                }
                requestAnimationFrame(loop);
            };
            requestAnimationFrame(loop);
        }

        window._updateAllSpotsFunc = () => {
            const rects = [];
            targets.forEach((elId, i) => {
                const target = document.getElementById(elId);
                if (!target) return;
                const rect = target.getBoundingClientRect();
                const spot = i === 0 ? UI.tutSpot : tutSpot2;

                spot.style.opacity = '1';
                spot.style.width = rect.width + 'px';
                spot.style.height = rect.height + 'px';
                spot.style.top = rect.top + 'px';
                spot.style.left = rect.left + 'px';
            });

            // 마스크 구멍 계산
            const spot1Rect = UI.tutSpot.getBoundingClientRect();
            if (UI.tutSpot.style.opacity !== '0') rects.push(spot1Rect);
            
            if (tutSpot2.style.opacity !== '0' && targets.length > 1) {
                const spot2Rect = tutSpot2.getBoundingClientRect();
                rects.push(spot2Rect);
            }

            if (targets.length === 1) {
                const rect = UI.tutSpot.getBoundingClientRect();
                tutSpot2.style.width = rect.width + 'px';
                tutSpot2.style.height = rect.height + 'px';
                tutSpot2.style.top = rect.top + 'px';
                tutSpot2.style.left = rect.left + 'px';
                tutSpot2.style.opacity = '0';
            }

            let path = `polygon(0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%`;
            rects.forEach(r => {
                const R = 12; const M = 3.5;
                const pts = [
                    `${r.left + R}px ${r.top}px`, `${r.right - R}px ${r.top}px`,
                    `${r.right - M}px ${r.top + M}px`, `${r.right}px ${r.top + R}px`,
                    `${r.right}px ${r.bottom - R}px`, `${r.right - M}px ${r.bottom - M}px`,
                    `${r.right - R}px ${r.bottom}px`, `${r.left + R}px ${r.bottom}px`,
                    `${r.left + M}px ${r.bottom - M}px`, `${r.left}px ${r.bottom - R}px`,
                    `${r.left}px ${r.top + R}px`, `${r.left + M}px ${r.top + M}px`,
                    `${r.left + R}px ${r.top}px`
                ];
                path += `, ${pts.join(', ')}`;
            });
            path += `)`;
            UI.tutBg.style.clipPath = path;
        };

        // 초기 위치 즉시 반영
        window._updateAllSpotsFunc();

        UI.tutStep.innerText = `STEP 0${idx + 1}`;
        UI.tutTitle.innerText = step.title;
        UI.tutDesc.innerHTML = step.desc;
        UI.tutNext.innerText = idx === steps.length - 1 ? '시작하기' : '다음';

        let cardTop, cardLeft;
        cardLeft = window.innerWidth / 2 - 160;
        cardTop = window.innerHeight / 2 - 100;

        UI.tutCard.style.left = cardLeft + 'px';
        UI.tutCard.style.top = cardTop + 'px';

        if (idx === 0) {
            void UI.tutSpot.offsetWidth;
            UI.tutSpot.style.transition = '';
            tutSpot2.style.transition = '';
            UI.tutCard.style.transition = '';
        }

        GTM.push('tutorial_step', {
            tutorial_step: idx + 1,
            step_name: step.title
        });
    }

    if (localStorage.getItem('tutorialSeen') !== 'true') {
        UI.tutSkip.style.display = 'none'; // 처음 진입 시 스킵 불가
        GTM.push('tutorial_begin');
        setTimeout(() => showTutorial(0), 500);
    } else {
        UI.tutSkip.style.display = 'block'; // 이미 본 유저는 활성화 상태 세팅
    }
    let isTutAnimating = false;
    UI.tutNext.onclick = () => {
        if (isTutAnimating) return; // 애니메이션 중 클릭 방지

        isTutAnimating = true;
        setTimeout(() => { isTutAnimating = false; }, 600); // CSS 트랜지션 시간(0.5s) 고려

        const currentIdx = S.tutIndex ?? 0;
        const nextIdx = currentIdx + 1;
        S.tutIndex = nextIdx;
        if (nextIdx >= steps.length) {
            GTM.push('tutorial_complete');
        }
        showTutorial(nextIdx);
    };
    UI.tutSkip.onclick = () => {
        UI.tutOverlay.style.display = 'none';
        localStorage.setItem('tutorialSeen', 'true');
        GTM.push('tutorial_skip', { tutorial_step: S.tutIndex + 1 });
    };
    UI.btnShowTutorial.onclick = () => {
        S.tutIndex = 0;
        UI.tutSkip.style.display = 'block'; // 버튼을 통해 다시 꺼낼 때는 스킵 활성화
        GTM.push('tutorial_begin', { is_replayed: true });
        showTutorial(0);
    };

}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startup);
} else {
    startup();
}
