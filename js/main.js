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
                    S.updatedAt = currDoc.data.updated_at; // [추가] 마지막 수정일 동기화

                    // [신규] 저장된 메인 URL 복원
                    if (currDoc.data.main_url) {
                        S.maintUrl = currDoc.data.main_url;
                    }

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
        { el: 'tut-step1-area', title: '1/4 - 홈페이지 요청사항 생성하기', desc: '고치고 싶은 홈페이지 캡쳐 이미지를 불러오거나<br>기타 [🛠️ 홈페이지 다른 문제] 버튼을 클릭하여<br>요청사항을 대기열에 추가하세요' },
        { el: 'tut-step4-area', title: '2/4 - 요청사항 작성하기', desc: '목록(작성중)에 추가된 요청사항을 선택해<br>작성을 시작해주세요' },
        { el: ['step2Panel', 'step3Panel'], union: true, title: '3/4 - 요청사항 완성하기', desc: '요청사항 설명 도구를 통해 다양한 요청사항을 작성하고<br>하단의 [저장하기] 버튼을 통해 요청사항을 완성하세요.' },
        { el: ['tut-step4-area', 'editorBtns'], title: '4/4 - 유지보수 의뢰서 생성하기', desc: '요청사항 목록에 있는 모든 <b>완성 요청</b>이<br>한장의 의뢰서로 생성됩니다.<br><br>우상단의 [🔗 홈페이지 유지보수 의뢰서 생성하기]<br>버튼을 눌러 의뢰서를 생성해 보세요.' }
    ];

    function showTutorial(idx) {
        if (idx >= steps.length) {
            UI.tutOverlay.style.display = 'none';
            return;
        }

        const tutSpot2 = document.getElementById('tutSpot2');
        UI.tutOverlay.style.display = 'block';

        const step = steps[idx];
        const targets = Array.isArray(step.el) ? step.el : [step.el];

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
            const m1 = document.getElementById('mask1');
            const m2 = document.getElementById('mask2');
            if (!m1 || !m2) return;

            const r1 = UI.tutSpot.getBoundingClientRect();
            m1.setAttribute('x', r1.left);
            m1.setAttribute('y', r1.top);
            m1.setAttribute('width', r1.width);
            m1.setAttribute('height', r1.height);

            const r2 = tutSpot2.getBoundingClientRect();
            m2.setAttribute('x', r2.left);
            m2.setAttribute('y', r2.top);
            m2.setAttribute('width', r2.width);
            m2.setAttribute('height', r2.height);
        };

        const updateSpotStyles = () => {
            if (step.union) {
                let minT = Infinity, minL = Infinity, maxB = -Infinity, maxR = -Infinity;
                targets.forEach(elId => {
                    const el = document.getElementById(elId);
                    if (el) {
                        const r = el.getBoundingClientRect();
                        minT = Math.min(minT, r.top);
                        minL = Math.min(minL, r.left);
                        maxB = Math.max(maxB, r.bottom);
                        maxR = Math.max(maxR, r.right);
                    }
                });

                if (minT !== Infinity) {
                    const top = minT - 8, left = minL - 8, width = maxR - minL + 16, height = maxB - minT + 16;
                    UI.tutSpot.style.opacity = '1';
                    UI.tutSpot.style.top = top + 'px';
                    UI.tutSpot.style.left = left + 'px';
                    UI.tutSpot.style.width = width + 'px';
                    UI.tutSpot.style.height = height + 'px';

                    // 핵심: 보이지 않는 2번 박스도 1번 자리에 대기시켜서 전이 시 부드러운 분리 연출
                    tutSpot2.style.opacity = '0';
                    tutSpot2.style.top = top + 'px';
                    tutSpot2.style.left = left + 'px';
                    tutSpot2.style.width = width + 'px';
                    tutSpot2.style.height = height + 'px';
                }
            } else {
                targets.forEach((elId, i) => {
                    const target = document.getElementById(elId);
                    if (!target) return;
                    const rect = target.getBoundingClientRect();
                    const spot = i === 0 ? UI.tutSpot : tutSpot2;
                    spot.style.opacity = '1';
                    spot.style.width = (rect.width + 16) + 'px';
                    spot.style.height = (rect.height + 16) + 'px';
                    spot.style.top = (rect.top - 8) + 'px';
                    spot.style.left = (rect.left - 8) + 'px';
                });

                // 타겟이 1개일 때도 tutSpot2를 tutSpot1의 위치에 일치시켜두어 자연스러운 이동 준비
                if (targets.length === 1) {
                    tutSpot2.style.opacity = '0';
                    tutSpot2.style.top = UI.tutSpot.style.top;
                    tutSpot2.style.left = UI.tutSpot.style.left;
                    tutSpot2.style.width = UI.tutSpot.style.width;
                    tutSpot2.style.height = UI.tutSpot.style.height;
                }
            }
        };

        if (S.isTutorialOpening) {
            UI.tutSpot.style.transition = 'none';
            tutSpot2.style.transition = 'none';
            UI.tutCard.style.transition = 'none';
            updateSpotStyles();
            window._updateAllSpotsFunc();
            void UI.tutSpot.offsetWidth;
            UI.tutSpot.style.transition = '';
            tutSpot2.style.transition = '';
            UI.tutCard.style.transition = '';
            S.isTutorialOpening = false;
        } else {
            updateSpotStyles();
        }

        UI.tutStep.innerText = `STEP 0${idx + 1}`;
        UI.tutTitle.innerText = step.title;
        UI.tutDesc.innerHTML = step.desc;
        UI.tutNext.innerText = idx === steps.length - 1 ? '시작하기' : '다음';

        const cardLeft = window.innerWidth / 2 - 200;
        const cardTop = window.innerHeight / 2 - 140;

        UI.tutCard.style.left = cardLeft + 'px';
        UI.tutCard.style.top = cardTop + 'px';

        UI.tutPrev.style.display = 'flex';
        UI.tutPrev.disabled = idx === 0;

        // Skip 버튼은 첫 번째 단계에서만 노출 (Back 버튼 위치에 배정)
        if (idx === 0) {
            UI.tutSkip.style.display = 'block';
            UI.tutPrev.style.display = 'none'; // Back 버튼 숨기고 Skip 노출
        } else {
            UI.tutSkip.style.display = 'none';
            UI.tutPrev.style.display = 'flex';
        }

        GTM.push('tutorial_step', { tutorial_step: idx + 1, step_name: step.title });
    }

    // 0단계 인트로 및 전체 흐름 제어
    const urlParams = new URLSearchParams(window.location.search);
    const skipIntroParam = urlParams.get('skip_intro') === '1';

    if (localStorage.getItem('tutorialSeen') === 'true') {
        localStorage.removeItem('tutorialSeen'); // [추가] 기존 잔여 데이터가 있다면 정리 (Task 요청사항)
    }

    if (!skipIntroParam) {
        UI.introOverlay.style.display = 'flex';
        GTM.push('tutorial_intro_view');
    } else {
        UI.introOverlay.style.display = 'none'; // 명시적으로 숨김 처리
        UI.tutSkip.style.display = 'block';
    }

    UI.btnStartTutorial.onclick = () => {
        UI.introOverlay.style.display = 'none';
        S.tutIndex = 0;
        S.isTutorialOpening = true;
        UI.tutSkip.style.display = 'block';
        GTM.push('tutorial_begin');
        showTutorial(0);
    };

    UI.btnSkipTutorial.onclick = () => {
        UI.introOverlay.style.display = 'none';
        UI.tutSkip.style.display = 'block';
        GTM.push('tutorial_skip_intro');
    };

    let isTutAnimating = false;
    UI.tutNext.onclick = () => {
        if (isTutAnimating) return;
        isTutAnimating = true;
        setTimeout(() => { isTutAnimating = false; }, 600);

        const currentIdx = S.tutIndex ?? 0;
        const nextIdx = currentIdx + 1;
        S.tutIndex = nextIdx;
        if (nextIdx >= steps.length) {
            GTM.push('tutorial_complete');
        }
        showTutorial(nextIdx);
    };

    UI.tutPrev.onclick = () => {
        if (isTutAnimating) return;
        isTutAnimating = true;
        setTimeout(() => { isTutAnimating = false; }, 600);

        const currentIdx = S.tutIndex ?? 0;
        const prevIdx = Math.max(0, currentIdx - 1);
        S.tutIndex = prevIdx;
        GTM.push('tutorial_back', { tutorial_step: prevIdx + 1 });
        showTutorial(prevIdx);
    };

    UI.tutSkip.onclick = () => {
        UI.tutOverlay.style.display = 'none';
        GTM.push('tutorial_skip', { tutorial_step: (S.tutIndex || 0) + 1 });
    };

    UI.btnShowTutorial.onclick = () => {
        S.tutIndex = 0;
        S.isTutorialOpening = true;
        UI.tutSkip.style.display = 'block';
        GTM.push('tutorial_begin', { is_replayed: true });
        showTutorial(0);
    };

}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startup);
} else {
    startup();
}
