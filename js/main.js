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

    // GA4 user_id 설정 (비로그인 계정 식별)
    if (typeof gtag !== 'undefined') {
        gtag('config', 'G-WEDM8MYGQC', { 'user_id': myUuid });
    }
    
    // [루트 신규/재접속 모드 - 파라미터 없음]
    const initRes = await SyncAPI.initDocument(S.myUuid);
    if (initRes.success) {
        const newDocId = initRes.data.id;
        S.docId = newDocId;
        S.editToken = initRes.data.edit_token;
        console.log('[Init] Editor Mode - Created/Loaded. docId:', S.docId, ', editToken:', S.editToken);
        S.isViewerMode = false;

        if (initRes.data.is_new) {
            // 완전히 새 문서가 생성된 시점
            if (typeof gtag !== 'undefined') {
                gtag('event', 'document_create', {
                    event_category: 'Document',
                    event_label: newDocId
                });
            }
        } else {
            const currDoc = await SyncAPI.readDocument(newDocId);
            if (currDoc.success) {
                try {
                    const payload = JSON.parse(currDoc.data.history_json || '{"history":[]}');
                    S.history = Array.isArray(payload) ? payload : (payload.history || []);
                } catch (e) { }
                renderQueue();
            }
        }
    } else {
        alert('초기 통신에 실패했습니다.');
    }

    // --- 튜토리얼 로직 ---
    const steps = [
        { el: 'step1Panel', title: '이미지 불러오기', desc: '웹사이트의 URL을 직접 입력하거나<br>이미지 파일을 업로드하세요.' },
        { el: 'step2Panel', title: '화면 수정 표시', desc: '불러온 이미지 위에서 마우스를 드래그해<br>수정할 영역을 박스로 표시하세요.' },
        { el: 'step3Panel', title: '상세 메모 작성', desc: '박스에 대한 상세 내용을 적고<br>리스트에 저장하세요.' }
    ];

    function showTutorial(idx) {
        if (idx >= steps.length) {
            UI.tutOverlay.style.display = 'none';
            localStorage.setItem('tutorialSeen', 'true');
            return;
        }
        
        // 반복 호출 시 초기 단계에서 이전 위치로부터 날아오는 애니메이션 방지
        if (idx === 0) {
            UI.tutSpot.style.transition = 'none';
            UI.tutCard.style.transition = 'none';
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

        // DOM 요소의 위치가 반영된 후 트랜지션 복구를 위해 리플로우 강제 발생
        if (idx === 0) {
            void UI.tutSpot.offsetWidth;
            void UI.tutCard.offsetWidth;
            UI.tutSpot.style.transition = '';
            UI.tutCard.style.transition = '';
        }
    }

    if (localStorage.getItem('tutorialSeen') !== 'true') {
        UI.tutSkip.style.display = 'none'; // 처음 진입 시 스킵 불가
        setTimeout(() => showTutorial(0), 500);
    } else {
        UI.tutSkip.style.display = 'block'; // 이미 본 유저는 활성화 상태 세팅
    }
    UI.tutNext.onclick = () => showTutorial(++S.tutIndex);
    UI.tutSkip.onclick = () => {
        UI.tutOverlay.style.display = 'none';
        localStorage.setItem('tutorialSeen', 'true');
    };
    UI.btnShowTutorial.onclick = () => {
        S.tutIndex = 0;
        UI.tutSkip.style.display = 'block'; // 버튼을 통해 다시 꺼낼 때는 스킵 활성화
        showTutorial(0);
    };

}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startup);
} else {
    startup();
}
