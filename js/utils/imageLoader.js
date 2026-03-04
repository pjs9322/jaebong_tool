/**
 * @file imageLoader.js
 * @description 이미지 불러오기(로컬파일, 클립보드, 화면캡쳐) 기능을 담당하는 유틸리티 모듈
 */
import { S, COLORS } from '../store/state.js';
import { UI } from '../store/elements.js';
import { renderQueue, clearEditingState } from '../core/history.js';
import { render, resetMemoPanel, updateAnnoListUI, generateQR } from '../core/canvas.js';

export function updateZoomMode() {
    if (!S.img) return;
    if (S.isFitMode) {
        UI.cWrap.style.width = '100%';
        UI.cWrap.style.height = 'auto';
        const cw = UI.scrollContainer.clientWidth - 80;
        S.zoom = (cw / S.w) * 100;
    } else {
        UI.cWrap.style.width = S.w + 'px';
        UI.cWrap.style.height = S.h + 'px';
        S.zoom = 100;
    }
    render();
}

export function loadImage(src, onLoadCallback) {
    const img = new Image();
    img.onload = () => {
        S.img = img;
        S.w = img.naturalWidth;
        S.h = img.naturalHeight;
        S.baseImgSrc = src;
        UI.canvas.width = S.w;
        UI.canvas.height = S.h;
        S.isFitMode = false;
        updateZoomMode();
        UI.saveReqBtn.disabled = false;
        if (onLoadCallback) {
            onLoadCallback();
        } else {
            S.annos = [];
            S.draftRect = null;
            S.state = 'IDLE';
            S.activeAnnoId = null;
            clearEditingState();
            resetMemoPanel(false);
            updateAnnoListUI();
        }
        render();
        if (UI.urlIn.value) generateQR(UI.urlIn.value);
    };
    img.src = src;
}

export function initImageLoader() {
    // --- Capture & Load ---
    UI.btnScreenCapture.onclick = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();
            video.onloadedmetadata = () => {
                setTimeout(() => {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0);
                    stream.getTracks().forEach(track => track.stop());
                    loadImage(canvas.toDataURL('image/png'));
                }, 300);
            };
        } catch (err) {
            console.warn(err);
        }
    };

    UI.btnZoom.onclick = () => { S.isFitMode = !S.isFitMode; updateZoomMode(); };
    window.addEventListener('resize', () => { if (S.isFitMode) updateZoomMode(); });

    UI.btnOpenImg.onclick = () => UI.fileIn.click();
    UI.fileIn.onchange = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = (ev) => loadImage(ev.target.result);
        r.readAsDataURL(f);
        e.target.value = '';
    };
    window.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const f = items[i].getAsFile();
                const r = new FileReader();
                r.onload = (ev) => loadImage(ev.target.result);
                r.readAsDataURL(f);
                e.preventDefault();
                break;
            }
        }
    });
}
