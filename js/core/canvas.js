/**
 * @file canvas.js
 * @description 메인 캔버스 (워크 스페이스) 제어, 좌표계산, 드로잉, 박스 생성 및 메모 작성을 처리하는 코어 모듈
 */
import { S, COLORS } from '../store/state.js';
import { UI } from '../store/elements.js';
import { triggerAutoSave, updateSaveBtnState } from './history.js';

export function generateQR(url) {
    // QR 생성 로직 완전 제거 (Task 002 반영)
    return;
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
    updateAnnoListUI();
    if (autoSave) triggerAutoSave(); // (Task 001) 박스 그리기 및 메모 작성, 삭제 후 자동저장 시도
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
    updateAnnoListUI();
    render();
}

export function updateAnnoListUI() {
    UI.annoList.innerHTML = '';
    S.annos.forEach((a, i) => {
        const el = document.createElement('div');
        el.className = 'anno-item' + (S.activeAnnoId === a.id ? ' selected' : '');
        el.innerHTML = `<div class="anno-badge">${i + 1}</div><div class="anno-text">${a.text}</div>`;
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
    const sf = 1 / (S.zoom / 100);
    const br = 16 * sf;
    const fs = 15 * sf;
    const lw = 4 * sf;
    const boxColor = COLORS.box;
    S.annos.forEach((a, i) => {
        const active = S.activeAnnoId === a.id && !isExport;
        ctx.strokeStyle = active ? COLORS.draft : boxColor;
        ctx.lineWidth = lw;
        if (active) {
            ctx.fillStyle = 'rgba(59,130,246,0.1)';
            ctx.fillRect(a.rect.x, a.rect.y, a.rect.w, a.rect.h);
        }
        ctx.strokeRect(a.rect.x, a.rect.y, a.rect.w, a.rect.h);
        ctx.fillStyle = active ? COLORS.draft : boxColor;
        ctx.beginPath();
        ctx.arc(a.rect.x, a.rect.y, br, 0, Math.PI * 2);
        ctx.fill();
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
            UI.catBtns.forEach(b => {
                b.classList.remove('active');
                b.classList.remove('invalid-target');
            });
            btn.classList.add('active');
            S.currentCategory = btn.dataset.val;
            updateSaveBtnState();
        };
    });

    UI.urlIn.addEventListener('input', (e) => {
        // generateQR(e.target.value); // (Task 002)
        triggerAutoSave(); // URL 입력 시 자동저장 (Task 001)
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
        if (!S.img) return;
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
                if (hit) cursor = (hit === 'move' ? 'move' : hit + '-resize');
            }
        } else {
            const h = [...S.annos].reverse().find(a => p.x >= a.rect.x && p.x <= a.rect.x + a.rect.w && p.y >= a.rect.y && p.y <= a.rect.y + a.rect.h);
            if (h) cursor = 'pointer';
        }
        UI.canvas.style.cursor = cursor;
    };

    UI.canvas.onmousedown = (e) => {
        if (!S.img || S.state === 'MEMO_WAIT') return;
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
        if (S.activeAnnoId) {
            const a = S.annos.find(x => x.id === S.activeAnnoId);
            if (a) a.text = txt;
            S.activeAnnoId = null;
        } else {
            S.annos.push({ id: Date.now(), rect: { ...S.draftRect }, text: txt });
        }
        resetMemoPanel(false);
        updateAnnoListUI();
        render();
        triggerAutoSave(); // 메모 추가 확인 시 자동저장
    };

    UI.deleteMemoBtn.onclick = () => {
        if (confirm("삭제하시겠습니까?")) {
            S.annos = S.annos.filter(a => a.id !== S.activeAnnoId);
            S.activeAnnoId = null;
            resetMemoPanel(false);
            updateAnnoListUI();
            render();
            triggerAutoSave(); // 메모 삭제 시 자동저장
        }
    };

    UI.cancelMemoBtn.onclick = () => {
        if (S.activeAnnoId) S.activeAnnoId = null;
        resetMemoPanel(false);
        render();
    };
}
