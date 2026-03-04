/**
 * @file viewer.js
 * @description 편집된 리스트를 열람 모드(Viewer)로 확인할 때 필요한 상태 칩 변경, URL 변경 및 채팅 UI 기능을 제공하는 모듈
 */
import { S } from '../store/state.js';
import { UI } from '../store/elements.js';

export function initViewer() {
    UI.shareBtn.onclick = () => {
        UI.editorLayer.classList.remove('active');
        UI.viewerLayer.classList.add('active');
        UI.editorBtns.style.display = 'none';
        UI.viewerBtns.style.display = 'flex';
        renderViewerContent();
    };

    UI.backToEditBtn.onclick = () => {
        UI.viewerLayer.classList.remove('active');
        UI.editorLayer.classList.add('active');
        UI.viewerBtns.style.display = 'none';
        UI.editorBtns.style.display = 'flex';
    };

    window.updateItemStatus = (el, id) => {
        const val = el.value;
        el.className = `item-status-select ${val}`;
        const item = S.history.find(h => h.id === id);
        if (item) {
            item.status = val;
            const statusMap = { request: '검토요청', review: '검토중', complete: '검토완료' };
            addSystemChat(`${S.history.indexOf(item) + 1}번 항목의 상태가 [${statusMap[val]}]로 변경되었습니다.`);
        }
    };

    // 💡 URL 직접 수정 핸들러
    window.updateItemUrl = (el, id) => {
        const newUrl = el.value.trim();
        const item = S.history.find(h => h.id === id);
        if (item && item.url !== newUrl) {
            item.url = newUrl;
            addSystemChat(`${S.history.indexOf(item) + 1}번 항목의 URL이 수정되었습니다.`);
        }
    };

    function renderViewerContent() {
        UI.viewDate.innerText = new Date().toLocaleDateString();
        UI.viewContentArea.innerHTML = '';
        const catMap = { text: '📝 내용 수정', layout: '📐 항목 추가', func: '🛠️ 기능 수정', image: '✨ 기능 개발' };

        if (S.history.length === 0) {
            UI.viewContentArea.innerHTML = '<div style="color:#aaa; text-align:center; padding:50px;">저장된 의뢰 내역이 없습니다.</div>';
            return;
        }

        S.history.forEach((h, i) => {
            const memos = h.annos.map((a, idx) => `<div class="view-memo-item"><div class="view-memo-num">[${idx + 1}]</div><div>${a.text}</div></div>`).join('');

            const statusHtml = `
                <select onchange="updateItemStatus(this, ${h.id})" class="item-status-select ${h.status}">
                    <option value="request" ${h.status === 'request' ? 'selected' : ''}>🟡 검토요청</option>
                    <option value="review" ${h.status === 'review' ? 'selected' : ''}>🔵 검토중</option>
                    <option value="complete" ${h.status === 'complete' ? 'selected' : ''}>🟢 검토완료</option>
                </select>
            `;

            const div = document.createElement('div');
            div.className = 'view-content-row';
            div.innerHTML = `
                <div class="view-info-col">
                    <div class="view-item-header">
                        <span class="view-cat-badge">#${i + 1}. ${catMap[h.category].split(' ')[1]}</span>
                        ${statusHtml} 
                    </div>
                    <div class="view-url-container">
                        <span>🔗</span>
                        <input type="text" class="view-url-input" value="${h.url}" placeholder="대상 URL을 입력하세요" 
                               onblur="updateItemUrl(this, ${h.id})" 
                               onkeydown="if(event.key==='Enter') this.blur()">
                    </div>
                    <div class="view-memo-box">
                        <div style="font-size:12px; font-weight:800; color:#888; margin-bottom:10px;">상세 메모</div>
                        ${memos || '<div style="color:#aaa">등록된 메모가 없습니다.</div>'}
                    </div>
                    <div class="view-add-req"><strong>💡 추가 요청사항:</strong><br>${h.desc || "없음"}</div>
                </div>
                ${h.full ? `<div class="view-img-col"><img src="${h.full}"></div>` : ''}
            `;
            UI.viewContentArea.appendChild(div);
        });
    }

    function addSystemChat(msg) {
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.innerHTML = `<div class="chat-meta">System • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div><div class="chat-text" style="background:#f3f4f6; color:#555; font-style:italic;">${msg}</div>`;
        UI.chatList.appendChild(bubble);
        UI.chatList.scrollTop = UI.chatList.scrollHeight;
    }

    UI.chatInput.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            UI.btnSendChat.click();
        }
    };

    UI.btnSendChat.onclick = () => {
        const text = UI.chatInput.value.trim();
        if (!text) return;
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble mine';
        bubble.innerHTML = `<div class="chat-meta">나 (Client) • ${now}</div><div class="chat-text">${text}</div>`;
        UI.chatList.appendChild(bubble);
        UI.chatInput.value = '';
        UI.chatList.scrollTop = UI.chatList.scrollHeight;

        setTimeout(() => {
            const reply = document.createElement('div');
            reply.className = 'chat-bubble';
            reply.innerHTML = `<div class="chat-meta">작업자 (Manager) • ${now}</div><div class="chat-text">메시지 확인했습니다. 검토 후 답변 드릴게요!</div>`;
            UI.chatList.appendChild(reply);
            UI.chatList.scrollTop = UI.chatList.scrollHeight;
        }, 1200);
    };
}
