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

function startup() {
    // 1. UI Elements 
    initUI();

    // 2. Initialize modules
    initImageLoader();
    initCanvas();
    initHistory();
    initPdfExport();
    initViewer();

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
