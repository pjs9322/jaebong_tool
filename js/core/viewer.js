/**
 * @file viewer.js
 * @description 편집된 리스트를 열람 모드(Viewer)로 확인할 때 필요한 상태 칩 변경, URL 변경 및 채팅 UI 기능을 제공하는 모듈
 */
import { S } from '../store/state.js';
import { UI } from '../store/elements.js';

function updateMetaTitle(text) {
    if (UI.topMessage) UI.topMessage.innerText = text;
    document.title = text;
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", text);
}

export function initViewer() {
    UI.shareBtn.onclick = () => {
        if (typeof gtag !== 'undefined' && !S.isViewerMode) {
            gtag('event', 'link_shared', {
                event_category: 'Share'
            });
        }

        if (S.isViewerMode) {
            // 뷰어 모드(조회 권한만 있음)일 때는 로딩 없이 즉시 전환
            switchToViewerLayer();
        } else {
            // 작성자 모드일 때는 로딩 레이어 표시
            showLoadingAndSwitch();
        }
    };

    function switchToViewerLayer() {
        UI.editorLayer.classList.remove('active');
        if (UI.loadingLayer) UI.loadingLayer.classList.remove('active');
        UI.viewerLayer.classList.add('active');
        UI.editorBtns.style.display = 'none';

        if (S.isViewerMode) {
            updateMetaTitle("“홈페이지 수정사항을 정리하여 보내드립니다. 검토 부탁드립니다.”");
            UI.viewerBtns.style.display = 'none';
        } else {
            updateMetaTitle("“공유링크를 복사하여 의뢰서를 업체에게 전달해 보세요.”");
            UI.viewerBtns.style.display = 'flex';
            
            // 공유 모드 진입 시 URL에 id 파라미터를 추가하여 새로고침 시 뷰어 모드로 유지될 수 있게 함
            if (S.docId) {
                const baseUrl = window.location.origin + window.location.pathname;
                const newUrl = baseUrl.endsWith('/') ? `${baseUrl}?id=${S.docId}` : `${baseUrl}/?id=${S.docId}`;
                window.history.replaceState({ docId: S.docId }, document.title, newUrl);
            }
        }

        renderViewerContent();
    }
    
    // 초기 로딩 시 URL 파라미터 체크 후 소유자가 ?id 파라미터로 공유모드 진입 뷰를 새로고침 한거라면
    // 편집 데이터 로딩 직후 화면을 뷰어 모드로 덮어씌움
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('id') && !S.isViewerMode) {
        setTimeout(() => switchToViewerLayer(), 100);
    }

    function showLoadingAndSwitch() {
        // 편집 모드를 즉시 숨기지 않고 둔 상태에서 loadingLayer를 띄웁니다.
        UI.loadingLayer.classList.add('active');
        UI.editorBtns.style.display = 'none';

        startLoadingAnimation(() => {
            switchToViewerLayer();
        });
    }

    function startLoadingAnimation(onComplete) {
        const pctEl = document.getElementById('loadPct');
        const btnEl = document.getElementById('btnCompleteLoad');

        // --- 가비지 데이터(이전 상태) 초기화 ---
        if (pctEl) {
            pctEl.classList.remove('done');
            pctEl.textContent = '0%';
        }
        if (btnEl) {
            btnEl.disabled = true;
            btnEl.onclick = null;
        }

        ['s0', 's1', 's2', 's3'].forEach((id, idx) => {
            const row = document.getElementById(id);
            if (row) {
                row.className = idx === 0 ? 'step-row active' : 'step-row idle';
                row.querySelector('.step-icon').textContent = idx === 0 ? '⋯' : '·';
                row.querySelector('.step-tag').textContent = idx === 0 ? 'IN PROGRESS' : 'WAITING';
            }
        });

        const arcFill = document.querySelector('.arc-fill');
        if (arcFill) {
            arcFill.style.animation = 'none';
            void arcFill.offsetWidth; // trigger reflow
            arcFill.style.animation = 'arc-grow 3.8s cubic-bezier(.4, 0, .2, 1) forwards';
        }
        // ------------------------------------

        // 퍼센트 카운터 로직
        const targets = [0, 55, 78, 91, 100];
        const timings = [0, 1000, 1800, 2600, 3800];

        targets.forEach((t, i) => {
            const prev = targets[i - 1] ?? 0;
            if (i === 0) return;
            const delay = timings[i - 1];
            const dur = timings[i] - timings[i - 1];

            setTimeout(() => {
                const start = Date.now();
                const tick = setInterval(() => {
                    const p = Math.min(1, (Date.now() - start) / dur);
                    const val = Math.round(prev + (t - prev) * p);
                    if (pctEl && !pctEl.classList.contains('done')) pctEl.textContent = val + '%';
                    if (p >= 1) clearInterval(tick);
                }, 30);
            }, delay);
        });

        // 스텝 로직
        const stepData = [
            { el: 's0', next: 's1' },
            { el: 's1', next: 's2' },
            { el: 's2', next: 's3' },
            { el: 's3', next: null },
        ];

        function advanceStep(i) {
            if (i >= stepData.length) return;
            const d = stepData[i];
            const cur = document.getElementById(d.el);
            if (cur) {
                cur.className = 'step-row done';
                cur.querySelector('.step-icon').textContent = '✓';
                cur.querySelector('.step-tag').textContent = 'DONE';
            }
            if (d.next) {
                const nxt = document.getElementById(d.next);
                if (nxt) {
                    nxt.className = 'step-row active';
                    nxt.querySelector('.step-icon').textContent = '⋯';
                    nxt.querySelector('.step-tag').textContent = 'IN PROGRESS';
                }
            }
        }

        const stepTimers = [800, 1800, 2800, 3800].map((t, i) => setTimeout(() => advanceStep(i), t));

        // 전체 애니메이션 종료 후 처리 (4초 후 대기)
        setTimeout(() => {
            stepTimers.forEach(clearTimeout);

            if (pctEl) {
                pctEl.textContent = '✔';
                pctEl.classList.add('done');
            }

            if (btnEl) {
                btnEl.disabled = false;
                btnEl.onclick = () => {
                    btnEl.disabled = true;
                    onComplete();
                };
            } else {
                onComplete();
            }
        }, 4000);
    }

    UI.backToEditBtn.onclick = () => {
        UI.viewerLayer.classList.remove('active');
        UI.editorLayer.classList.add('active');
        UI.viewerBtns.style.display = 'none';
        UI.editorBtns.style.display = 'flex';
        updateMetaTitle("“홈페이지 유지보수 의뢰서를 생성해보세요.”");
        
        // 에디터 모드로 돌아갈 때 URL 파라미터(id) 제거
        const baseUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({ docId: S.docId }, document.title, baseUrl);
    };

    const copyBtn = document.getElementById('btnCopyLinkViewer');
    if (copyBtn) {
        copyBtn.onclick = () => {
            const baseUrl = window.location.origin + window.location.pathname;
            const urlToCopy = baseUrl.endsWith('/') ? `${baseUrl}?id=${S.docId}` : `${baseUrl}/?id=${S.docId}`;
            navigator.clipboard.writeText(urlToCopy).then(() => {
                alert('공유 링크가 클립보드에 복사되었습니다!\n(' + urlToCopy + ')');
            }).catch(err => {
                alert('링크 복사에 실패했습니다. 수동으로 복사해주세요.\n' + urlToCopy);
                console.error('Copy link failed:', err);
            });
        };
    }

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

            // 공유 링크 내 상태 변경 드롭다운 숨김 처리 (Task 009)
            const statusHtml = '';
            const statusHtml_bak = `
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
                        <span class="view-cat-badge">#${i + 1}. ${catMap[h.category]}</span>
                        ${statusHtml}
                    </div>
                    <div class="view-url-container">
                        <span>🔗</span>
                        <input type="text" class="view-url-input" value="${h.url}" placeholder="수정할 페이지의 위치(URL)를 입력하세요" 
                               onblur="updateItemUrl(this, ${h.id})" 
                               onkeydown="if(event.key==='Enter') this.blur()"
                               ${S.isViewerMode ? 'readonly style="cursor:default;"' : ''}>
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
