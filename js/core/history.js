/**
 * @file history.js
 * @description 캔버스에서 작업한 내역을 '요청사항 리스트' (History)에 저장, 수정, 삭제 및 관리하는 상태 코어 모듈
 */
import { S } from '../store/state.js';
import { UI } from '../store/elements.js';
import { loadImage } from '../utils/imageLoader.js';
import { render, updateAnnoListUI, generateQR } from './canvas.js';

export function clearEditingState() {
    S.editingHistoryId = null;
    UI.saveReqBtn.innerText = "목록에 추가하기 ➝";
    UI.saveReqBtn.style.background = "var(--action-pink)";
    UI.cancelEditBtn.style.display = 'none';
    renderQueue();
}

export function renderQueue() {
    UI.reqList.innerHTML = '';
    UI.queueCount.innerText = S.history.length;
    S.history.slice().reverse().forEach((h, i) => {
        const d = document.createElement('div');
        d.className = 'req-card' + (S.editingHistoryId === h.id ? ' editing' : '');
        const catMap = { text: '📝 내용 수정', layout: '📐 항목 추가', func: '🛠️ 기능 수정', image: '✨ 기능 개발' };
        d.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-size:11px; color:#aaa; margin-bottom:6px;">
                <span>#${S.history.length - i} • ${h.date}</span>
                <div style="display:flex; gap:4px;"><button class="btn-std" style="padding:2px 6px; font-size:10px;">수정</button><button class="btn-std" style="padding:2px 6px; font-size:10px; color:var(--danger);">삭제</button></div>
            </div>
            <div style="display:flex; gap:6px; margin-bottom:8px;"><span class="tag">${catMap[h.category]}</span><span class="tag" style="background:#fff; border:1px solid #ddd;">메모 ${h.annos.length}개</span></div>
            <img src="${h.thumb}">
        `;
        d.querySelectorAll('button')[0].onclick = () => { // 수정
            if (S.img && !confirm("현재 작업을 덮어쓰고 수정하시겠습니까?")) return;
            S.editingHistoryId = h.id;
            loadImage(h.baseImgSrc, () => {
                S.annos = JSON.parse(JSON.stringify(h.annos));
                UI.urlIn.value = h.url;
                UI.reqDesc.value = h.desc;
                S.currentCategory = h.category;
                UI.catBtns.forEach(b => b.classList.toggle('active', b.dataset.val === h.category));
                generateQR(h.url);
                updateAnnoListUI();
                render();
                UI.saveReqBtn.innerText = "수정 완료 (덮어쓰기)";
                UI.saveReqBtn.style.background = "#10b981";
                UI.cancelEditBtn.style.display = 'block';
            });
        };
        d.querySelectorAll('button')[1].onclick = () => {
            S.history = S.history.filter(x => x.id !== h.id);
            if (S.editingHistoryId === h.id) clearEditingState();
            renderQueue();
            if (S.history.length === 0) {
                UI.exportBtn.disabled = true;
                UI.shareBtn.disabled = true;
            }
        };
        UI.reqList.appendChild(d);
    });
}

export function initHistory() {
    UI.saveReqBtn.onclick = () => {
        if (S.state === 'MEMO_WAIT' || S.state === 'EDITING') {
            alert("메모를 먼저 저장하세요.");
            return;
        }
        if (S.annos.length === 0 && !confirm("메모 없이 저장하시겠습니까?")) return;
        render(true);
        const full = UI.canvas.toDataURL('image/jpeg', 0.8);
        const thumb = UI.canvas.toDataURL('image/jpeg', 0.2);
        const data = {
            id: Date.now(),
            date: new Date().toLocaleTimeString(),
            thumb, full,
            baseImgSrc: S.baseImgSrc,
            annos: JSON.parse(JSON.stringify(S.annos)),
            url: UI.urlIn.value,
            desc: UI.reqDesc.value,
            category: S.currentCategory
        };

        if (S.editingHistoryId) {
            const idx = S.history.findIndex(x => x.id === S.editingHistoryId);
            if (idx !== -1) S.history[idx] = data;
            alert("수정 완료되었습니다.");
        } else {
            S.history.push(data);
            alert("저장되었습니다.");
        }
        clearEditingState();
        S.annos = [];
        updateAnnoListUI();
        UI.reqDesc.value = '';
        render();
        UI.exportBtn.disabled = false;
        UI.shareBtn.disabled = false;
        renderQueue();
    };

    UI.cancelEditBtn.onclick = () => {
        if (confirm("취소하시겠습니까?")) {
            clearEditingState();
            S.img = null;
            UI.ctx.clearRect(0, 0, S.w, S.h);
            UI.urlIn.value = '';
            UI.reqDesc.value = '';
            S.annos = [];
            updateAnnoListUI();
            UI.saveReqBtn.disabled = true;
        }
    };
}
