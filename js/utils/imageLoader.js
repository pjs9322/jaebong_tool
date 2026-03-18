/**
 * @file imageLoader.js
 * @description 이미지 불러오기(로컬파일, 클립보드, 화면캡쳐) 기능을 담당하는 유틸리티 모듈
 */
import { S, COLORS } from '../store/state.js';
import { UI } from '../store/elements.js';
import { renderQueue, clearEditingState, updateSaveBtnState } from '../core/history.js';
import { render, resetMemoPanel, updateAnnoListUI, generateQR } from '../core/canvas.js';
import { GTM } from '../util/gtm.js';

export function updateZoomMode() {
    if (!S.img) return;
    UI.cWrap.style.display = 'inline-block';
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
    img.crossOrigin = 'Anonymous'; // 외부 URL 이미지 처리를 위한 CORS 설정

    function finalizeLoad(finalImg, finalSrc) {
        const elapsed = S.importStartTime ? (Date.now() - S.importStartTime) : 0;
        GTM.push('page_import_success', { 
            source_type: S.importSource || 'unknown',
            elapsed_ms: elapsed
        });
        S.importStartTime = null;
        S.importSource = null;

        S.img = finalImg;
        S.w = finalImg.naturalWidth;
        S.h = finalImg.naturalHeight;
        S.baseImgSrc = finalSrc;
        UI.canvas.width = S.w;
        UI.canvas.height = S.h;
        S.isFitMode = true;
        updateZoomMode();
        updateSaveBtnState();
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

            // 신규 이미지 로드 시 입력값 및 카테고리 초기화
            UI.reqDesc.value = '';
            S.currentCategory = null;
            UI.catBtns.forEach(b => {
                b.classList.remove('active');
                b.classList.remove('invalid-target');
            });
            updateSaveBtnState();
        }
        render();
        if (UI.urlIn.value) generateQR(UI.urlIn.value);
        // GTM.push('image_import'); // page_import_success로 대체됨
        GTM.push('canvas_view');
    }

    img.onload = () => {
        try {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.naturalWidth;
            tempCanvas.height = img.naturalHeight;
            const ctx = tempCanvas.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            ctx.drawImage(img, 0, 0);

            let dataUrl = tempCanvas.toDataURL('image/jpeg', 0.9);
            const MAX_STR_LEN = 660000; // 약 500KB에 해당하는 Base64 길이

            // 용량이 500KB를 초과하는 경우 압축 시도
            if (dataUrl.length > MAX_STR_LEN) {
                let quality = 0.8;
                let currentWidth = tempCanvas.width;
                let currentHeight = tempCanvas.height;

                while (dataUrl.length > MAX_STR_LEN && quality > 0.3) {
                    if (quality <= 0.6 && (currentWidth > 1920 || currentHeight > 1920)) {
                        currentWidth = Math.round(currentWidth * 0.8);
                        currentHeight = Math.round(currentHeight * 0.8);
                        tempCanvas.width = currentWidth;
                        tempCanvas.height = currentHeight;
                        ctx.fillStyle = '#fff';
                        ctx.fillRect(0, 0, currentWidth, currentHeight);
                        ctx.drawImage(img, 0, 0, currentWidth, currentHeight);
                    }
                    dataUrl = tempCanvas.toDataURL('image/jpeg', quality);
                    quality -= 0.1;
                }

                const compImg = new Image();
                compImg.onload = () => finalizeLoad(compImg, dataUrl);
                compImg.src = dataUrl;
            } else {
                finalizeLoad(img, src.startsWith('http') ? src : dataUrl);
            }
        } catch (e) {
            console.warn('Canvas taint or compression failed, using original src:', e);
            finalizeLoad(img, src);
        }
    };
    img.src = src;
}

export function initImageLoader() {
    const checkUnsavedChanges = () => {
        const isEditing = S.editingHistoryId !== null;
        const hasDraft = (S.img && UI.cWrap.style.display !== 'none') || S.annos.length > 0 || UI.reqDesc.value !== '';
        if ((isEditing || hasDraft) && !confirm("저장하지 않은 내용은 사라집니다. 계속하시겠습니까?")) {
            return false;
        }
        return true;
    };

    // --- Capture & Load ---
    UI.btnScreenCapture.onclick = async () => {
        if (!checkUnsavedChanges()) return;
        S.importStartTime = Date.now();
        S.importSource = 'capture';
        if (S.lastImportFailed) {
            GTM.push('page_import_retry', { source_type: 'capture' });
        }
        S.lastImportFailed = false;
        GTM.push('page_import_start', { source_type: 'capture' });
        try {
            const displayMediaOptions = { video: true, audio: false };
            let controller = null;

            // Chrome 109+ : 캡쳐 탭 선택 후 현재 앱(재봉툴)으로 포커스 자동 복귀
            if ('CaptureController' in window) {
                controller = new CaptureController();
                displayMediaOptions.controller = controller;
            }

            const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

            if (controller && typeof controller.setFocusBehavior === 'function') {
                controller.setFocusBehavior('focus-capturing-application');
            }

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

    // --- Headless URL Capture ---
    const processCapture = async () => {
        if (!checkUnsavedChanges()) return;
        let targetUrl = UI.urlCaptureIn.value.trim();
        if (!targetUrl) return;

        S.importStartTime = Date.now();
        S.importSource = 'url';
        if (S.lastImportFailed) {
            GTM.push('page_import_retry', { source_type: 'url' });
        }
        S.lastImportFailed = false;
        GTM.push('page_import_start', { source_type: 'url', url_domain: targetUrl });

        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = 'https://' + targetUrl;
        }

        try {
            new URL(targetUrl);
        } catch (_) {
            alert('올바른 형식의 웹사이트 주소를 입력해주세요. (예: https://susunzip.com)');
            return;
        }

        // 로딩 팝업 표시 및 상태 순차 업데이트
        const messages = [
            "주소를 검색하는 중",
            "홈페이지를 찾는 중",
            "홈페이지의 높이를 확인하는 중",
            "홈페이지를 캡쳐하는 중"
        ];
        let msgIdx = 0;
        UI.captureStatusText.innerText = messages[msgIdx];
        UI.captureLayer.style.display = 'flex';

        const msgInterval = setInterval(() => {
            if (msgIdx < messages.length - 1) {
                msgIdx++;
                UI.captureStatusText.innerText = messages[msgIdx];
            }
        }, 3000); // 3초마다 메시지 전환

        const originalPlaceholder = UI.urlCaptureIn.placeholder;
        const originalBtnText = UI.btnUrlCapture ? UI.btnUrlCapture.innerText : '';

        UI.urlCaptureIn.value = '';
        UI.urlCaptureIn.disabled = true;
        if (UI.btnUrlCapture) {
            UI.btnUrlCapture.disabled = true;
            UI.btnUrlCapture.innerText = '캡처 중...';
        }

        try {
            const CAPTURE_SERVER_URL = 'https://jaebongapi.cafe24.com';
            const requestUrl = `${CAPTURE_SERVER_URL}/capture?url=${encodeURIComponent(targetUrl)}`;

            // 60초 타임아웃 설정 (서버 자원 보호 및 UX 개선)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);

            let response = await fetch(requestUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            let data = await response.json();

            if (data.status === 'success' && data.data?.screenshot?.url) {
                UI.urlIn.value = targetUrl;
                loadImage(data.data.screenshot.url);
                GTM.push('url_capture_complete', {
                    target_url: targetUrl
                });
            } else {
                const failReason = data.message || 'API failed';
                S.lastImportFailed = true;
                GTM.push('page_import_fail', {
                    source_type: 'url',
                    target_url: targetUrl,
                    fail_reason: failReason
                });
                throw new Error(failReason);
            }
        } catch (err) {
            console.error('Capture err:', err);
            if (err.name === 'AbortError') {
                S.lastImportFailed = true;
                GTM.push('page_import_fail', { source_type: 'url', fail_reason: 'timeout' });
                alert('캡처 시간이 너무 오래 소요되어 요청이 취소되었습니다. 잠시 후 다시 시도해주시거나, 페이지 주소를 확인해주세요.');
            } else {
                S.lastImportFailed = true;
                GTM.push('page_import_fail', { source_type: 'url', fail_reason: 'render_error' });
                alert('웹사이트 캡처에 완전히 실패했습니다. 사이트 로딩 속도가 너무 느리거나, 해당 홈페이지측에서 보안상 외부의 캡처 접근을 강력하게 차단해둔 상태일 수 있습니다.');
            }
        } finally {
            clearInterval(msgInterval);
            UI.captureLayer.style.display = 'none';
            UI.urlCaptureIn.placeholder = originalPlaceholder;
            UI.urlCaptureIn.disabled = false;
            if (UI.btnUrlCapture) {
                UI.btnUrlCapture.disabled = false;
                UI.btnUrlCapture.innerText = originalBtnText;
            }
        }
    };

    if (UI.urlCaptureIn) {
        UI.urlCaptureIn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') processCapture();
        });
    }
    if (UI.btnUrlCapture) {
        UI.btnUrlCapture.onclick = processCapture;
    }

    if (UI.btnZoom) UI.btnZoom.onclick = () => { S.isFitMode = !S.isFitMode; updateZoomMode(); };
    window.addEventListener('resize', () => { if (S.isFitMode) updateZoomMode(); });

    UI.btnOpenImg.onclick = () => {
        if (!checkUnsavedChanges()) return;
        UI.fileIn.click();
    };
    UI.fileIn.onchange = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        S.importStartTime = Date.now();
        S.importSource = 'upload';
        if (S.lastImportFailed) {
            GTM.push('page_import_retry', { source_type: 'upload' });
        }
        S.lastImportFailed = false;
        GTM.push('page_import_start', { source_type: 'upload' });
        const r = new FileReader();
        r.onload = (ev) => loadImage(ev.target.result);
        r.readAsDataURL(f);
        e.target.value = '';
    };
    window.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                if (!checkUnsavedChanges()) return;
                S.importStartTime = Date.now();
                S.importSource = 'paste';
                if (S.lastImportFailed) {
                    GTM.push('page_import_retry', { source_type: 'paste' });
                }
                S.lastImportFailed = false;
                GTM.push('page_import_start', { source_type: 'paste' });
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
