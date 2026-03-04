/**
 * @file canvas.js
 * @description 메인 캔버스 (워크 스페이스) 제어, 좌표계산, 드로잉, 박스 생성 및 메모 작성을 처리하는 코어 모듈
 */
import { S, COLORS } from '../store/state.js';
import { UI } from '../store/elements.js';

export function generateQR(url) {
    UI.qrHidden.innerHTML = '';
    if (!url || !url.trim()) {
        UI.qrVis.style.display = 'none';
        S.qrImage = null;
        return;
    }
    // QRCode is provided by external script
    new QRCode(UI.qrHidden, { width: 200, height: 200, text: url });
    setTimeout(() => {
        const img = UI.qrHidden.querySelector('img');
        if (img) {
            UI.qrVis.innerHTML = '';
            UI.qrVis.appendChild(img.cloneNode());
            UI.qrVis.style.display = 'block';
            S.qrImage = img;
        }
    }, 100);
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
    if (!S.img) return;
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
    if (isExport && S.qrImage) {
        const QSz = 180;
        const Pad = 20;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = "white";
        ctx.fillRect(S.w - QSz - Pad - 5, Pad - 5, QSz + 10, QSz + 10);
        ctx.drawImage(S.qrImage, S.w - QSz - Pad, Pad, QSz, QSz);
    }
}

export function initCanvas() {
    UI.catBtns.forEach(btn => {
        btn.onclick = () => {
            UI.catBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            S.currentCategory = btn.dataset.val;
        };
    });

    UI.urlIn.addEventListener('input', (e) => generateQR(e.target.value));

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
    };

    UI.deleteMemoBtn.onclick = () => {
        if (confirm("삭제하시겠습니까?")) {
            S.annos = S.annos.filter(a => a.id !== S.activeAnnoId);
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
