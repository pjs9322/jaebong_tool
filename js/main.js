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

async function startup() {
    // 1. UI Elements 
    initUI();

    // 2. Initialize modules
    initImageLoader();
    initCanvas();
    initHistory();
    initPdfExport();
    initViewer();

    // 3. 기기 식별 및 SyncAPI 연동 (Task 001)
    let myUuid = localStorage.getItem('jaebong_uuid');
    if (!myUuid) {
        myUuid = crypto.randomUUID();
        localStorage.setItem('jaebong_uuid', myUuid);
    }
    S.myUuid = myUuid;

    const urlParams = new URLSearchParams(window.location.search);
    const currentId = urlParams.get('id');

    if (currentId) {
        // [공유 링크 또는 재입장 모드]
        const res = await SyncAPI.readDocument(currentId);
        if (!res.success) {
            alert('문서를 찾을 수 없거나 서버 통신에 실패했습니다.');
            window.location.href = '/jaebong/';
            return;
        }

        if (res.data.owner_uuid === S.myUuid) {
            // 본인 문서 (에디터 모드)
            const initRes = await SyncAPI.initDocument(S.myUuid);
            if (initRes.success && initRes.data.id === currentId) {
                S.docId = initRes.data.id;
                S.editToken = initRes.data.edit_token;
                S.isViewerMode = false;
                try {
                    const payload = JSON.parse(res.data.history_json || '{"history":[]}');
                    S.history = Array.isArray(payload) ? payload : (payload.history || []);
                    if (payload.draft && !Array.isArray(payload)) {
                        S.annos = payload.draft.annos || [];
                        UI.urlIn.value = payload.draft.url || '';
                        UI.reqDesc.value = payload.draft.desc || '';
                        if (payload.draft.baseImgSrc) {
                            S.baseImgSrc = payload.draft.baseImgSrc;
                            UI.cWrap.style.display = 'flex';
                        }
                    }
                } catch (e) { }
                renderQueue();
            } else {
                alert('문서 권한 검증에 실패했습니다.');
                window.location.href = '/jaebong/';
                return;
            }
        } else {
            // 타인 문서 (뷰어 전용)
            S.docId = currentId;
            S.isViewerMode = true;
            try {
                const payload = JSON.parse(res.data.history_json || '{"history":[]}');
                S.history = Array.isArray(payload) ? payload : (payload.history || []);
            } catch (e) { }
            // UI 상태 반영 (데이터 길이 보정)
            if (S.history.length > 0) {
                UI.exportBtn.disabled = false;
                UI.shareBtn.disabled = false;
            }
            // 뷰어 계층 팝업
            UI.shareBtn.click();
            UI.backToEditBtn.style.display = 'none'; // 돌아가기 강제 차단
            return; // 튜토리얼 스킵
        }
    } else {
        // [루트 신규/재접속 모드]
        const initRes = await SyncAPI.initDocument(S.myUuid);
        if (initRes.success) {
            const newDocId = initRes.data.id;
            window.history.replaceState(null, '', `?id=${newDocId}`);
            S.docId = newDocId;
            S.editToken = initRes.data.edit_token;
            S.isViewerMode = false;
            if (!initRes.data.is_new) {
                const currDoc = await SyncAPI.readDocument(newDocId);
                if (currDoc.success) {
                    try {
                        const payload = JSON.parse(currDoc.data.history_json || '{"history":[]}');
                        S.history = Array.isArray(payload) ? payload : (payload.history || []);
                        if (payload.draft && !Array.isArray(payload)) {
                            S.annos = payload.draft.annos || [];
                            UI.urlIn.value = payload.draft.url || '';
                            UI.reqDesc.value = payload.draft.desc || '';
                            if (payload.draft.baseImgSrc) {
                                S.baseImgSrc = payload.draft.baseImgSrc;
                                UI.cWrap.style.display = 'flex';
                                // Note: Image load would ideally happen here, but since UI interacts 
                                // it will be drawn when user triggers action or by manual calling loadImage
                            }
                        }
                    } catch (e) { }
                    if (S.history.length > 0) {
                        UI.exportBtn.disabled = false;
                        UI.shareBtn.disabled = false;
                        renderQueue();
                    }
                }
            }
        } else {
            alert('초기 통신에 실패했습니다.');
        }
    }

    // --- 튜토리얼 로직 ---
    const steps = [
        { el: 'step1Panel', title: '이미지 불러오기', desc: '작업할 웹사이트를 캡처하거나<br>이미지 파일을 업로드하세요.' },
        { el: 'step2Panel', title: '화면 수정 표시', desc: '불러온 이미지 위에서 마우스를 드래그해<br>수정할 영역을 박스로 표시하세요.' },
        { el: 'step3Panel', title: '상세 메모 작성', desc: '박스에 대한 상세 내용을 적고<br>리스트에 저장하세요.' }
    ];

    function showTutorial(idx) {
        if (idx >= steps.length) {
            UI.tutOverlay.style.display = 'none';
            localStorage.setItem('tutorialSeen', 'true');
            return;
        }
        UI.tutOverlay.style.display = 'block';

        const target = document.getElementById(steps[idx].el);
        const rect = target.getBoundingClientRect();

        UI.tutSpot.style.width = rect.width + 'px';
        UI.tutSpot.style.height = rect.height + 'px';
        UI.tutSpot.style.top = rect.top + 'px';
        UI.tutSpot.style.left = rect.left + 'px';

        UI.tutStep.innerText = `STEP 0${idx + 1}`;
        UI.tutTitle.innerText = steps[idx].title;
        UI.tutDesc.innerHTML = steps[idx].desc;
        UI.tutNext.innerText = idx === steps.length - 1 ? '시작하기' : '다음';

        const cardLeft = window.innerWidth / 2 - 160;
        const cardTop = window.innerHeight / 2 - 100;
        UI.tutCard.style.left = cardLeft + 'px';
        UI.tutCard.style.top = cardTop + 'px';
    }

    if (localStorage.getItem('tutorialSeen') !== 'true') {
        setTimeout(() => showTutorial(0), 500);
    }
    UI.tutNext.onclick = () => showTutorial(++S.tutIndex);

}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startup);
} else {
    startup();
}
