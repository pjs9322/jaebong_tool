/**
 * @file imageLoader.js
 * @description 이미지 불러오기(로컬파일, 클립보드, 화면캡쳐) 기능을 담당하는 유틸리티 모듈
 */
import { S, COLORS } from '../store/state.js';
import { UI } from '../store/elements.js';
import { renderQueue, clearEditingState, updateSaveBtnState, addHistoryDirect, enterEditMode } from '../core/history.js';
import { render, resetMemoPanel, updateAnnoListUI, generateQR, updateFooterVisibility, updateZoomUI } from '../core/canvas.js';

import { GTM } from '../util/gtm.js';

export function updateZoomMode() {
    if (!S.img) return;
    UI.cWrap.style.display = 'inline-block';
    
    // [개선] 레이아웃이 완전히 렌더링되지 않았을 경우를 위한 안정 장치
    const calculateScale = () => {
        const sc = UI.scrollContainer;
        const cw = sc.clientWidth;
        if (cw <= 0) {
            setTimeout(updateZoomMode, 50);
            return;
        }

        const style = window.getComputedStyle(sc);
        const padding = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
        const targetW = Math.max(100, cw - padding);
        S.fitScale = targetW / S.w;
        
        if (S.isFitMode) {
            S.zoom = 100; // 화면맞춤일 때는 그대로 100% (기존 줌은 무시)
        } else {
            // 하한선/상한선 보정 (사용자 수동 조작 시)
            S.zoom = Math.max(50, Math.min(200, S.zoom));
        }
        updateZoomUI();
    };

    calculateScale();
}



export function loadImage(src, onLoadCallback) {
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // 외부 URL 이미지 처리를 위한 CORS 설정

    async function finalizeLoad(finalImg, finalSrc) {
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
            // 신규 로드 시 히스토리에 미완성 상태로 즉시 추가 (Rule 022)
            const newItem = await addHistoryDirect({
                full: finalSrc,
                baseImgSrc: finalSrc,
                isCompleted: false // 최초 생성은 무조건 미완성
            });

            // 생성된 항목으로 즉시 편집 모드 진입
            enterEditMode(newItem);
        }
        render();
        updateFooterVisibility();
        if (UI.urlIn.value) generateQR(UI.urlIn.value);
        GTM.push('canvas_view');
    }

    img.onload = () => {
        try {
            // 모든 이미지를 캔버스 기준 가로 해상도(1920px)로 무조건 통일 보정
            // 이를 통해 아주 작은 이미지나 모바일 캡처본(390px), 혹은 초대형 이미지더라도
            // 메모 그리드의 선 두께나 폰트 화질 비율이 완벽하게 일정하게 유지됩니다.
            let targetWidth = 1920;
            let scale = targetWidth / img.naturalWidth;
            let targetHeight = Math.round(img.naturalHeight * scale);

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = targetWidth;
            tempCanvas.height = targetHeight;
            const ctx = tempCanvas.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, targetWidth, targetHeight);

            // 품질 손실을 최소화하기 위해 imageSmoothing 활성화
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

            let dataUrl = tempCanvas.toDataURL('image/jpeg', 0.9);

            // [수정] 원본이 이미 서버 URL인 경우, 보정 작업은 하되 S.baseImgSrc로는 원본 URL을 유지함
            const finalBaseSrc = (src.startsWith('/jaebong/uploads/') || src.startsWith('http')) ? src : dataUrl;

            const compImg = new Image();
            compImg.onload = () => finalizeLoad(compImg, finalBaseSrc);
            compImg.src = dataUrl;
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
        UI.captureStatusText.innerText = "페이지 접속 중…";
        UI.captureLayer.classList.add('active'); // active 클래스 추가 (smooth transition)
        const captureStartTime = Date.now();

        const originalPlaceholder = UI.urlCaptureIn.placeholder;
        const originalBtnText = UI.btnUrlCapture ? UI.btnUrlCapture.innerText : '';

        UI.urlCaptureIn.value = '';
        UI.urlCaptureIn.disabled = true;
        if (UI.btnUrlCapture) {
            UI.btnUrlCapture.disabled = true;
            UI.btnUrlCapture.innerText = '캡처 중...';
        }

        let abortReason = 'TIMEOUT';
        let timeoutId = null;
        let onCancelCapture = null;

        try {
            const CAPTURE_SERVER_URL = 'https://jaebongapi.cafe24.com';
            const requestUrl = `${CAPTURE_SERVER_URL}/capture?url=${encodeURIComponent(targetUrl)}`;

            // 60초 타임아웃 및 사용자 취소 동기화 설정
            const controller = new AbortController();
            timeoutId = setTimeout(() => controller.abort(), 60000);

            onCancelCapture = () => {
                abortReason = 'USER_CANCELED';
                controller.abort();
            };

            if (UI.btnCancelCapture) {
                UI.btnCancelCapture.addEventListener('click', onCancelCapture, { once: true });
            }

            let response = await fetch(requestUrl, { signal: controller.signal });

            // SSE 스트림 읽기
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let captureComplete = false;
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                let boundary;
                while ((boundary = buffer.indexOf('\n\n')) >= 0) {
                    const eventText = buffer.slice(0, boundary);
                    buffer = buffer.slice(boundary + 2);

                    if (!eventText.trim()) continue;

                    const lines = eventText.split('\n');
                    let eventType = 'message';
                    let eventData = '';

                    for (const line of lines) {
                        if (line.startsWith('event: ')) {
                            eventType = line.substring(7).trim();
                        } else if (line.startsWith('data: ')) {
                            eventData = line.substring(6).trim();
                        }
                    }

                    if (eventData) {
                        try {
                            const parsed = JSON.parse(eventData);
                            if (eventType === 'progress') {
                                UI.captureStatusText.innerText = parsed.message;
                            } else if (eventType === 'success') {
                                if (parsed.screenshot?.url) {
                                    UI.urlIn.value = targetUrl;
                                    loadImage(parsed.screenshot.url);
                                    GTM.push('url_capture_complete', { target_url: targetUrl });
                                    captureComplete = true;
                                }
                            } else if (eventType === 'error') {
                                throw new Error(parsed.message || 'API stream error');
                            }
                        } catch (parseErr) {
                            if (eventType === 'error') throw parseErr;
                            console.warn('SSE Parse warning:', parseErr);
                        }
                    }
                }
            }

            if (!captureComplete) {
                throw new Error('스트림이 정상적으로 종료되지 않았습니다.');
            }
        } catch (err) {
            console.error('Capture err:', err);
            if (err.name === 'AbortError') {
                S.lastImportFailed = true;
                if (abortReason === 'USER_CANCELED') {
                    GTM.push('page_import_cancel', { source_type: 'url' });
                    // 사용자 강제 취소의 경우, 백엔드 연결도 끊어지며 API 측에서 캡처 자원을 즉시 회수합니다.
                    console.log('Capture cancelled by user.');
                } else {
                    GTM.push('page_import_fail', { source_type: 'url', fail_reason: 'timeout' });
                    alert('캡처 시간이 너무 오래 소요되어 요청이 취소되었습니다. 잠시 후 다시 시도해주시거나, 페이지 주소를 확인해주세요.');
                }
            } else {
                S.lastImportFailed = true;
                GTM.push('page_import_fail', { source_type: 'url', fail_reason: 'render_error' });
                alert('웹사이트 캡처에 실패했습니다. 사이트 로딩 속도가 너무 느리거나, 홈페이지에서 보안상 외부의 캡처 접근을 차단하였을 수 있습니다.\n\n오류: ' + err.message);
            }
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
            if (UI.btnCancelCapture && onCancelCapture) {
                UI.btnCancelCapture.removeEventListener('click', onCancelCapture);
            }
            const elapsed = Date.now() - captureStartTime;
            const minTime = 600; // 최소 노출 시간 600ms
            const delay = Math.max(0, minTime - elapsed);

            setTimeout(() => {
                UI.captureLayer.classList.remove('active');
            }, delay);
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
        UI.fileIn.click();
    };

    /**
     * 파일을 분석하여 해상도 보정(1920px) 후 즉시 History 리스트에 추가하는 공통 내부 함수
     */
    async function processFileAndAddHistory(f, customDesc) {
        if (UI.captureStatusText) UI.captureStatusText.innerText = `이미지 처리 중...`;
        if (UI.captureLayer) UI.captureLayer.classList.add('active');
        const processingStartTime = Date.now();

        try {
            const dataUrl = await new Promise((resolve, reject) => {
                const r = new FileReader();
                r.onload = async (ev) => {
                    const img = new Image();
                    img.onload = () => {
                        const targetWidth = 1920;
                        const scale = targetWidth / img.naturalWidth;
                        const targetHeight = Math.round(img.naturalHeight * scale);
                        const tempCanvas = document.createElement('canvas');
                        tempCanvas.width = targetWidth; tempCanvas.height = targetHeight;
                        const ctx = tempCanvas.getContext('2d');
                        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, targetWidth, targetHeight);
                        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                        resolve(tempCanvas.toDataURL('image/jpeg', 0.9));
                    };
                    img.onerror = reject;
                    img.src = ev.target.result;
                };
                r.onerror = reject;
                r.readAsDataURL(f);
            });

            await addHistoryDirect({
                full: dataUrl,
                baseImgSrc: dataUrl,
                category: '',
                desc: customDesc || ''
            });
            GTM.push('page_import_success', { source_type: S.importSource || 'unknown', elapsed_ms: Date.now() - S.importStartTime });
        } catch (err) {
            console.error("이미지 처리 오류:", err);
            GTM.push('page_import_fail', { source_type: S.importSource || 'unknown', fail_reason: 'process_error' });
            alert("이미지 처리 중 오류가 발생했습니다.");
        } finally {
            const elapsed = Date.now() - processingStartTime;
            const minTime = 600;
            const delay = Math.max(0, minTime - elapsed);

            setTimeout(() => {
                if (UI.captureLayer) UI.captureLayer.classList.remove('active');
            }, delay);
        }
    }

    UI.fileIn.onchange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        S.importStartTime = Date.now();
        S.importSource = 'upload';
        GTM.push('page_import_start', { source_type: 'upload' });

        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            if (UI.captureStatusText && files.length > 1) {
                UI.captureStatusText.innerText = `이미지 처리 중 (${i + 1}/${files.length})`;
            }
            await processFileAndAddHistory(f);
        }
        
        /* 
        if (files.length > 0) {
            alert(`${files.length}장의 이미지가 요청사항 리스트에 추가되었습니다.`);
        }
        */
        e.target.value = '';
    };

    window.addEventListener('paste', async (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                S.importStartTime = Date.now();
                S.importSource = 'paste';
                GTM.push('page_import_start', { source_type: 'paste' });
                
                const f = items[i].getAsFile();
                await processFileAndAddHistory(f);
                
                e.preventDefault();
                break;
            }
        }
    });
}
