/**
 * @file canvas.js
 * @description 메인 캔버스 (워크 스페이스) 제어, 좌표계산, 드로잉, 박스 생성 및 메모 작성을 처리하는 코어 모듈
 */
import { S, COLORS, IMG_ICON } from '../store/state.js';
import { UI } from '../store/elements.js';
import { updateSaveBtnState } from './history.js';
import { GTM } from '../util/gtm.js';

export function generateQR(url) {
    // QR 생성 로직 완전 제거 (Task 002 반영)
    return;
}

export function enterAssetMode() {
    S.isAssetMode = true;
    S.img = null;
    S.baseImgSrc = null;
    S.annos = [];
    S.selectedAssets.clear();
    UI.assetItems.forEach(i => i.classList.remove('selected'));

    UI.cWrap.style.display = 'block';
    UI.cWrap.style.width = '100%';
    UI.cWrap.style.height = '100%';
    UI.cWrap.style.maxWidth = 'none';
    UI.cWrap.style.minHeight = '0';
    UI.cWrap.style.margin = '0';
    UI.cWrap.style.boxShadow = 'none';
    UI.scrollContainer.style.padding = '0';
    
    if (UI.canvasControls) UI.canvasControls.style.display = 'flex';
    UI.urlIn.value = ''; // 신규 자산 요청 시 초기화
    
    UI.canvas.style.display = 'none';
    UI.assetModeOverlay.style.display = 'flex'; // 중앙 정렬을 위해 flex 사용
    UI.minimapContainer.style.display = 'none';
    UI.btnAttachMemoImg.style.display = 'none'; // 자산 모드 숨김
    UI.annoList.style.display = 'none';           // 자산 모드 숨김

    UI.guideText.innerHTML = `🏠 <b>자산 관련 요청 모드</b><br>필요한 항목을 선택하고 아래에<br>상세 내용을 입력해 주세요.`;
    
    UI.reqDesc.value = '';
    UI.reqDesc.placeholder = `선택한 자산(도메인, 호스팅 등)에 대한 상세 상황을 입력해 주세요.
예시) 도메인 만료일이 다가옵니다, 호스팅 서버 이전이 필요합니다, 계정 정보를 분실했습니다.`;

    render();
}

export function exitAssetMode() {
    S.isAssetMode = false;
    S.selectedAssets.clear();
    UI.assetItems.forEach(i => i.classList.remove('selected'));
    UI.assetModeOverlay.style.display = 'none';
    UI.canvas.style.display = 'block';
    UI.btnAttachMemoImg.style.display = 'block';
    UI.annoList.style.display = 'block';
    
    // 스타일 초기화 (이미지 로드 시 재설정됨)
    UI.cWrap.style.width = '';
    UI.cWrap.style.maxWidth = '';
    UI.cWrap.style.height = '';
    UI.cWrap.style.minHeight = '';
    UI.cWrap.style.margin = '';
    UI.cWrap.style.boxShadow = '';
    UI.scrollContainer.style.padding = '';
    
    if (UI.canvasControls) UI.canvasControls.style.display = 'none';
    UI.urlIn.value = ''; // 일반 모드 복귀 시 초기화

    if (!S.img) {
        UI.cWrap.style.display = 'none';
    }
    UI.guideText.innerHTML = `<b>캔버스</b>에서 수정하고 싶은 부분을<br>마우스로 드래그하여 박스를 그려주세요.<br><br>
                        <span style="font-size:11px; color:var(--action-pink);">(박스를 클릭하면 다시 수정할 수 있습니다)</span>`;
    UI.reqDesc.value = ''; // 작성 내용 파기
    UI.reqDesc.placeholder = `이 페이지에 대한 전체적인 참고사항을 입력하세요.
예시) 이미지는 추후 전달드리겠습니다, 이미지 직접 수급 부탁드립니다, www.susunzip.com 해당 레퍼런스 참고하여 디자인 리뉴얼 부탁드립니다.`;
    resetMemoPanel(false);
}

export function resetMemoPanel(autoSave) {
    if (autoSave && S.activeAnnoId) {
        const a = S.annos.find(x => x.id === S.activeAnnoId);
        if (a) a.text = UI.memoInput.value.trim();
    }
    S.state = 'IDLE';
    S.draftRect = null;
    UI.memoPanel.classList.remove('active');
    UI.guideText.style.display = 'block';
    UI.memoInput.value = '';
    S.memoImg = null;
    UI.memoImgPreview.src = '';
    UI.memoImgPreviewArea.style.display = 'none';
    updateAnnoListUI();
}

export function openEditPanel(id) {
    S.activeAnnoId = id;
    const anno = S.annos.find(a => a.id === id);
    UI.guideText.style.display = 'none';
    UI.memoPanel.classList.add('active');
    UI.memoPanelTitle.innerText = "메모 수정";
    UI.confirmMemoBtn.innerText = "수정 완료";
    UI.deleteMemoBtn.style.display = 'block';
    UI.memoInput.value = anno.text;
    if (anno.img) {
        S.memoImg = anno.img;
        UI.memoImgPreview.src = anno.img;
        UI.memoImgPreviewArea.style.display = 'block';
    } else {
        S.memoImg = null;
        UI.memoImgPreview.src = '';
        UI.memoImgPreviewArea.style.display = 'none';
    }
    GTM.push('memo_edit', { request_item_id: id });
    updateAnnoListUI();
    render();
}

export function updateAnnoListUI() {
    UI.annoList.innerHTML = '';
    S.annos.forEach((a, i) => {
        const el = document.createElement('div');
        el.className = 'anno-item' + (S.activeAnnoId === a.id ? ' selected' : '');
        const imgIcon = a.img ? `<span style="color:#8b5cf6; margin-left:6px; display:inline-flex; align-items:center;">${IMG_ICON}</span>` : '';
        el.innerHTML = `<div class="anno-badge">${i + 1}</div><div class="anno-text">${a.text}${imgIcon}</div>`;
        el.onclick = () => { resetMemoPanel(true); openEditPanel(a.id); };
        UI.annoList.appendChild(el);
    });
}

export function render(isExport = false) {
    if (!S.img) {
        if (typeof renderMinimap === 'function') renderMinimap();
        return;
    }
    const ctx = UI.ctx;
    ctx.clearRect(0, 0, S.w, S.h);
    ctx.drawImage(S.img, 0, 0);
    const sf = isExport ? 1 : 1 / (S.zoom / 100);
    const br = 18 * sf; // 반지름 18px로 상향
    const fs = 14 * sf; // 폰트 크기도 14px로 상향
    const lw = 2 * sf;
    const boxColor = COLORS.box;
    // 1st Pass: Draw all rectangle borders ONLY
    S.annos.forEach((a, i) => {
        const active = S.activeAnnoId === a.id && !isExport;
        ctx.strokeStyle = active ? COLORS.draft : (a.img ? COLORS.purple : boxColor);
        ctx.lineWidth = lw;
        
        if (active) {
            ctx.fillStyle = 'rgba(59,130,246,0.1)';
            ctx.fillRect(a.rect.x, a.rect.y, a.rect.w, a.rect.h);
        }

        // 선이 배지(원) 영역에 침범하지 않도록 경로를 끊어서 그림
        ctx.beginPath();
        // 상단 선 (왼쪽에서 br만큼 떨어진 지점부터 오른쪽 끝까지)
        ctx.moveTo(a.rect.x + br, a.rect.y);
        ctx.lineTo(a.rect.x + a.rect.w, a.rect.y);
        // 우측 선
        ctx.lineTo(a.rect.x + a.rect.w, a.rect.y + a.rect.h);
        // 하단 선
        ctx.lineTo(a.rect.x, a.rect.y + a.rect.h);
        // 좌측 선 (하단에서 위로 올라오되, 상단에서 br만큼 떨어진 지점까지만)
        ctx.lineTo(a.rect.x, a.rect.y + br);
        ctx.stroke();
    });

    // 2nd Pass: Draw all point badges (Circles + Numbers) on top of all lines
    S.annos.forEach((a, i) => {
        const active = S.activeAnnoId === a.id && !isExport;
        
        // 원 배지 그리기
        ctx.fillStyle = active ? COLORS.draft : (a.img ? COLORS.purple : boxColor);
        ctx.beginPath();
        ctx.arc(a.rect.x, a.rect.y, br, 0, Math.PI * 2);
        ctx.fill();
        
        // 배지 테두리 (선택 시 강조)
        if (active) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2 * sf;
            ctx.stroke();
        }

        // 숫자 텍스트
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${fs}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(i + 1, a.rect.x, a.rect.y + (1 * sf));
    });

    if (S.draftRect && !isExport) {
        ctx.strokeStyle = COLORS.draft;
        ctx.lineWidth = lw;
        ctx.setLineDash([8 * sf, 8 * sf]);
        ctx.beginPath();
        ctx.strokeRect(S.draftRect.x, S.draftRect.y, S.draftRect.w, S.draftRect.h);
        ctx.setLineDash([]);
    }
    // QR 코드 그리기 렌더 파트 삭제 (Task 002)
    renderMinimap();
}

function renderMinimap() {
    if (!UI.minimapContainer) return;
    if (!S.img || UI.cWrap.style.display === 'none') {
        UI.minimapContainer.style.display = 'none';
        return;
    }

    UI.minimapContainer.style.display = 'block';

    const mCanvas = UI.minimapCanvas;
    const mCtx = UI.minimapCtx;
    const mViewport = UI.minimapViewport;
    const mi = UI.minimapInner;

    const mapWidth = 150;
    const ratio = S.h / S.w;
    const mapHeight = mapWidth * ratio;

    mCanvas.width = mapWidth;
    mCanvas.height = mapHeight;
    // 제거: UI.minimapContainer.style.height = mapHeight + 'px';
    // 컨테이너는 Flex에 의해 높이가 자동 결정됨

    mCtx.clearRect(0, 0, mapWidth, mapHeight);
    mCtx.drawImage(S.img, 0, 0, mapWidth, mapHeight);

    const scale = mapWidth / S.w;
    S.annos.forEach(a => {
        mCtx.fillStyle = 'rgba(239, 68, 68, 0.7)'; // Red box
        mCtx.fillRect(a.rect.x * scale, a.rect.y * scale, a.rect.w * scale, a.rect.h * scale);
    });

    const sc = UI.scrollContainer;
    const mc = UI.minimapContainer;

    const contentW = UI.cWrap.offsetWidth;
    const contentH = UI.cWrap.offsetHeight;

    // 메인 콘텐츠 뷰포트 비율 (박스 크기)
    const viewW = sc.clientWidth;
    const viewH = sc.clientHeight;
    const vScaleX = mapWidth / contentW;
    const vScaleY = mapHeight / contentH;

    // 미니맵 스크롤 동기화 (VSCode 동작 방식)
    const maxScrollY = Math.max(0, sc.scrollHeight - sc.clientHeight);
    const scrollPctY = maxScrollY > 0 ? (sc.scrollTop / maxScrollY) : 0;
    const maxMinimapScrollY = Math.max(0, mapHeight - mc.clientHeight);
    const innerTop = -(scrollPctY * maxMinimapScrollY);

    if (mi) {
        mi.style.transform = `translateY(${innerTop}px)`;
    }

    // Viewport width가 mapWidth를 초과해서 우측 보더가 잘리지 않도록 제한
    const finalViewW = Math.min(viewW * vScaleX, mapWidth);

    mViewport.style.width = finalViewW + 'px';
    mViewport.style.height = (viewH * vScaleY) + 'px';
    mViewport.style.left = (sc.scrollLeft * vScaleX) + 'px';
    mViewport.style.top = (sc.scrollTop * vScaleY) + 'px';
}

export function initCanvas() {
    UI.catBtns.forEach(btn => {
        btn.onclick = () => {
            const targetVal = btn.dataset.val;

            // 자산 모드 전환/복구 관련 정책 적용 (Task 014)
            if (targetVal === 'asset' && !S.isAssetMode) {
                // 일반 -> 자산 전환
                if (S.img || S.annos.length > 0 || UI.reqDesc.value.trim() !== '') {
                    if (!confirm("자산 관련 요청으로 전환하시겠습니까? 작성 중인 내용(이미지, 메모 포함)이 모두 파기됩니다.")) return;
                }
                enterAssetMode();
            } else if (targetVal !== 'asset' && S.isAssetMode) {
                // 자산 -> 일반 전환
                if (S.selectedAssets.size > 0 || UI.reqDesc.value.trim() !== '') {
                    if (!confirm("일반 요청으로 전환하시겠습니까? 선택한 자산 항목과 작성된 내용이 모두 파기됩니다.")) return;
                }
                exitAssetMode();
            }

            UI.catBtns.forEach(b => {
                b.classList.remove('active');
                b.classList.remove('invalid-target');
            });
            btn.classList.add('active');
            S.currentCategory = targetVal;
            updateSaveBtnState();
        };
    });

    // 자산 아이템 토글 (Task 014)
    if (UI.assetItems) {
        UI.assetItems.forEach(item => {
            item.onclick = () => {
                const key = item.dataset.key;
                if (S.selectedAssets.has(key)) {
                    S.selectedAssets.delete(key);
                    item.classList.remove('selected');
                } else {
                    S.selectedAssets.add(key);
                    item.classList.add('selected');
                }
                updateSaveBtnState();
            };
        }
    );
    }

    // --- 메모 이미지 첨부 로직 ---
    UI.btnAttachMemoImg.onclick = () => UI.memoFileIn.click();
    UI.memoFileIn.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            S.memoImg = ev.target.result;
            UI.memoImgPreview.src = S.memoImg;
            UI.memoImgPreviewArea.style.display = 'block';
        };
        reader.readAsDataURL(file);
        UI.memoFileIn.value = ''; // 재선택 가능하도록 초기화
    };
    UI.btnDelMemoImg.onclick = () => {
        S.memoImg = null;
        UI.memoImgPreview.src = '';
        UI.memoImgPreviewArea.style.display = 'none';
    };

    UI.urlIn.addEventListener('input', (e) => {
        // generateQR(e.target.value); // (Task 002)
    });

    // --- 미니맵 인터랙션 구현 ---
    if (UI.minimapContainer) {
        let isDraggingMap = false;

        UI.scrollContainer.addEventListener('scroll', () => {
            if (!isDraggingMap) renderMinimap();
        });

        const updateScrollFromMinimap = (e) => {
            const mc = UI.minimapContainer;
            const sc = UI.scrollContainer;

            const rect = mc.getBoundingClientRect();
            const yInContainer = e.clientY - rect.top;
            const xInContainer = e.clientX - rect.left;

            const mapWidth = UI.minimapCanvas.width;
            const mapHeight = UI.minimapCanvas.height;
            const contentW = UI.cWrap.offsetWidth;
            const contentH = UI.cWrap.offsetHeight;

            const viewW = sc.clientWidth;
            const viewH = sc.clientHeight;
            const vScaleX = mapWidth / contentW;
            const vScaleY = mapHeight / contentH;

            // 현재 innerTop 보정값 계산
            const maxScrollY = Math.max(0, sc.scrollHeight - sc.clientHeight);
            const maxMinimapScrollY = Math.max(0, mapHeight - mc.clientHeight);
            const scrollPctY = maxScrollY > 0 ? (sc.scrollTop / maxScrollY) : 0;
            const currentInnerTop = -(scrollPctY * maxMinimapScrollY);

            // Container 기준 클릭 Y를 Canvas 기준 Y로 매핑
            const yOnMap = yInContainer - currentInnerTop;

            sc.scrollTop = (yOnMap / vScaleY) - (viewH / 2);
            sc.scrollLeft = (xInContainer / vScaleX) - (viewW / 2);

            renderMinimap();
        };

        UI.minimapContainer.addEventListener('mousedown', (e) => {
            isDraggingMap = true;
            updateScrollFromMinimap(e);
        });

        window.addEventListener('mousemove', (e) => {
            if (isDraggingMap) updateScrollFromMinimap(e);
        });

        window.addEventListener('mouseup', () => {
            isDraggingMap = false;
        });
    }

    function getPos(e) {
        const r = UI.canvas.getBoundingClientRect();
        const sx = S.w / r.width;
        const sy = S.h / r.height;
        return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
    }

    function hitCheck(p, rect) {
        const tol = 12 * (100 / S.zoom);
        const xm = rect.x + rect.w / 2, ym = rect.y + rect.h / 2, xr = rect.x + rect.w, yb = rect.y + rect.h;
        if (Math.abs(p.x - rect.x) < tol && Math.abs(p.y - rect.y) < tol) return 'nw';
        if (Math.abs(p.x - xr) < tol && Math.abs(p.y - rect.y) < tol) return 'ne';
        if (Math.abs(p.x - rect.x) < tol && Math.abs(p.y - yb) < tol) return 'sw';
        if (Math.abs(p.x - xr) < tol && Math.abs(p.y - yb) < tol) return 'se';
        if (Math.abs(p.x - xm) < tol && Math.abs(p.y - rect.y) < tol) return 'n';
        if (Math.abs(p.x - xm) < tol && Math.abs(p.y - yb) < tol) return 's';
        if (Math.abs(p.x - rect.x) < tol && Math.abs(p.y - ym) < tol) return 'w';
        if (Math.abs(p.x - xr) < tol && Math.abs(p.y - ym) < tol) return 'e';
        if (p.x >= rect.x && p.x <= xr && p.y >= rect.y && p.y <= yb) return 'move';
        return null;
    }

    window.onmousemove = (e) => {
        if (!S.img || S.isAssetMode) return;
        const p = getPos(e);
        let cursor = 'crosshair';
        if (S.state === 'DRAWING') {
            const w = p.x - S.dragStart.x;
            const h = p.y - S.dragStart.y;
            S.draftRect = {
                x: w > 0 ? S.dragStart.x : p.x,
                y: h > 0 ? S.dragStart.y : p.y,
                w: Math.abs(w),
                h: Math.abs(h)
            };
            render();
            return;
        }
        if (S.state === 'EDITING' && S.action) {
            const anno = S.annos.find(a => a.id === S.activeAnnoId);
            if (!anno) return;
            const dx = p.x - S.dragStart.x;
            const dy = p.y - S.dragStart.y;
            if (S.action === 'move') {
                anno.rect.x += dx;
                anno.rect.y += dy;
            } else {
                let nx = anno.rect.x, ny = anno.rect.y, nw = anno.rect.w, nh = anno.rect.h;
                if (S.action.includes('e')) nw += dx;
                if (S.action.includes('w')) { nw -= dx; nx += dx; }
                if (S.action.includes('s')) nh += dy;
                if (S.action.includes('n')) { nh -= dy; ny += dy; }
                if (nw > 20) { anno.rect.x = nx; anno.rect.w = nw; }
                if (nh > 20) { anno.rect.y = ny; anno.rect.h = nh; }
            }
            S.dragStart = p;
            render();
            return;
        }
        if (S.activeAnnoId) {
            const a = S.annos.find(x => x.id === S.activeAnnoId);
            if (a) {
                const hit = hitCheck(p, a.rect);
                if (hit) cursor = (hit === 'move' ? 'pointer' : hit + '-resize');
            }
        } else {
            const h = [...S.annos].reverse().find(a => p.x >= a.rect.x && p.x <= a.rect.x + a.rect.w && p.y >= a.rect.y && p.y <= a.rect.y + a.rect.h);
            if (h) cursor = 'pointer';
        }
        UI.canvas.style.cursor = cursor;
    };

    UI.canvas.onmousedown = (e) => {
        if (!S.img || S.state === 'MEMO_WAIT' || S.isAssetMode) return;
        const p = getPos(e);
        if (S.activeAnnoId) {
            const a = S.annos.find(x => x.id === S.activeAnnoId);
            if (a) {
                const hit = hitCheck(p, a.rect);
                if (hit) {
                    S.state = 'EDITING';
                    S.action = hit;
                    S.dragStart = p;
                    return;
                }
            }
        }
        const clicked = [...S.annos].reverse().find(a => p.x >= a.rect.x && p.x <= a.rect.x + a.rect.w && p.y >= a.rect.y && p.y <= a.rect.y + a.rect.h);
        if (clicked) {
            resetMemoPanel(true);
            openEditPanel(clicked.id);
            S.state = 'EDITING';
            S.action = 'move';
            S.dragStart = p;
            return;
        }
        resetMemoPanel(true);
        S.activeAnnoId = null;
        S.state = 'DRAWING';
        S.dragStart = p;
        S.draftRect = { x: p.x, y: p.y, w: 0, h: 0 };
        GTM.push('box_draw_start');
        render();
    };

    window.onmouseup = (e) => {
        if (S.state === 'DRAWING') {
            if (S.draftRect && S.draftRect.w > 20 && S.draftRect.h > 20) {
                S.state = 'MEMO_WAIT';
                UI.guideText.style.display = 'none';
                UI.memoPanel.classList.add('active');
                UI.memoPanelTitle.innerText = "새 메모 작성";
                UI.confirmMemoBtn.innerText = "확인";
                UI.deleteMemoBtn.style.display = 'none';
                UI.memoInput.value = '';
                UI.memoInput.focus();
                GTM.push('box_draw_complete', { 
                    box_width: Math.round(S.draftRect.w),
                    box_height: Math.round(S.draftRect.h)
                });
                GTM.push('memo_create_start');
            } else {
                S.state = 'IDLE';
                S.draftRect = null;
            }
        } else if (S.state === 'EDITING') {
            S.state = 'IDLE';
            S.action = null;
        }
        render();
    };

    UI.confirmMemoBtn.onclick = () => {
        const txt = UI.memoInput.value.trim();
        if (!txt) {
            alert("메모를 입력하세요.");
            UI.memoInput.focus();
            return;
        }

        const isNew = !S.activeAnnoId;
        GTM.push('memo_create_complete', {
            memo_length: txt.length,
            has_image: !!S.memoImg,
            is_new: isNew
        });

        if (S.activeAnnoId) {
            const a = S.annos.find(x => x.id === S.activeAnnoId);
            if (a) {
                a.text = txt;
                a.img = S.memoImg;
            }
            S.activeAnnoId = null;
        } else {
            S.annos.push({ id: Date.now(), rect: { ...S.draftRect }, text: txt, img: S.memoImg });
        }
        resetMemoPanel(false);
        updateAnnoListUI();
        render();
    };

    UI.deleteMemoBtn.onclick = () => {
        if (confirm("삭제하시겠습니까?")) {
            S.annos = S.annos.filter(a => a.id !== S.activeAnnoId);
            GTM.push('memo_delete', { memo_id: S.activeAnnoId });
            S.activeAnnoId = null;
            resetMemoPanel(false);
            updateAnnoListUI();
            render();
        }
    };

    UI.cancelMemoBtn.onclick = () => {
        if (S.activeAnnoId) S.activeAnnoId = null;
        resetMemoPanel(false);
        render();
    };
}
