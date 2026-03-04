/**
 * @file history.js
 * @description 캔버스에서 작업한 내역을 '요청사항 리스트' (History)에 저장, 수정, 삭제 및 관리하는 상태 코어 모듈
 */
import { S } from '../store/state.js';
import { UI } from '../store/elements.js';
import { loadImage } from '../utils/imageLoader.js';
import { render, resetMemoPanel, updateAnnoListUI, generateQR } from './canvas.js';

export function clearEditingState() {
    S.editingHistoryId = null;
    UI.saveReqBtn.innerText = "리스트 추가하기 ➝";
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
            ${h.thumb ? `<img src="${h.thumb}">` : ''}
        `;
        d.querySelectorAll('button')[0].onclick = () => { // 수정
            const isEditing = S.editingHistoryId !== null;
            const hasDraft = (S.img && UI.cWrap.style.display !== 'none') || S.annos.length > 0 || UI.reqDesc.value !== '';
            if ((isEditing || hasDraft) && !confirm("저장하지 않은 내용은 사라집니다. 계속하시겠습니까?")) return;

            resetMemoPanel(false);

            document.querySelectorAll('.req-card.editing').forEach(card => card.classList.remove('editing'));
            d.classList.add('editing');
            S.editingHistoryId = h.id;

            const setupEditState = () => {
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
                UI.saveReqBtn.disabled = false;
            };

            if (h.baseImgSrc) {
                loadImage(h.baseImgSrc, setupEditState);
            } else {
                S.img = null;
                S.baseImgSrc = null;
                UI.cWrap.style.display = 'none';
                UI.ctx.clearRect(0, 0, S.w, S.h);
                setupEditState();
            }
        };
        d.querySelectorAll('button')[1].onclick = () => {
            if (!confirm("정말 요청사항을 삭제하시겠습니까?")) return;
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
    UI.reqDesc.oninput = () => {
        if (UI.cWrap.style.display == 'none') {
            S.img = null;
            S.baseImgSrc = null;
        }
        if (S.img || UI.reqDesc.value != '') {
            UI.saveReqBtn.disabled = false;
        } else {
            UI.saveReqBtn.disabled = true;
        }
    };

    UI.saveReqBtn.onclick = () => {
        if (S.state === 'MEMO_WAIT' || S.state === 'EDITING') {
            if (!confirm("작성 중인 메모가 완료되지 않았습니다. 메모를 제외하고 이대로 리스트에 추가하시겠습니까?")) return;
            resetMemoPanel(false);
            render();
        }
        if (S.annos.length === 0 && !confirm("메모 없이 저장하시겠습니까?")) return;

        let full = null;
        let thumb = null;
        if (S.img && UI.cWrap.style.display !== 'none') {
            render(true);
            full = UI.canvas.toDataURL('image/jpeg', 0.8);
            thumb = UI.canvas.toDataURL('image/jpeg', 0.2);
        }

        const data = {
            id: Date.now(),
            date: new Date().toLocaleTimeString(),
            thumb, full,
            baseImgSrc: (S.img && UI.cWrap.style.display !== 'none') ? S.baseImgSrc : null,
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

        UI.cWrap.style.display = 'none';
        UI.saveReqBtn.disabled = true;

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
        if (confirm("수정을 취소하시겠습니까?")) {
            clearEditingState();
            S.img = null;
            S.baseImgSrc = null;
            UI.cWrap.style.display = 'none';
            UI.ctx.clearRect(0, 0, S.w, S.h);
            UI.urlIn.value = '';
            UI.reqDesc.value = '';
            S.annos = [];
            updateAnnoListUI();
            UI.saveReqBtn.disabled = true;
        }
    };
}
