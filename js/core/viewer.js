/**
 * @file viewer.js
 * @description 편집된 리스트를 열람 모드(Viewer)로 확인할 때 필요한 상태 칩 변경, URL 변경 및 채팅 UI 기능을 제공하는 모듈
 */
import { S, IMG_ICON } from '../store/state.js';
import { UI } from '../store/elements.js';
import { GTM } from '../util/gtm.js';

export const ASSET_LABELS = {
    domain: '도메인', hosting: '호스팅', server: '서버', ssl: 'SSL 인증서',
    migration: '사이트 이전', db: 'DB 이전', backup: '백업/복구',
    'site-access': '사이트 접속 불가', 'admin-access': '관리자 분실', 'account-lost': '계정/비번 분실'
};

function updateMetaTitle(text) {
    if (UI.topMessage) UI.topMessage.innerText = text;
    document.title = text;
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", text);
}

export function initViewer() {
    UI.shareBtn.onclick = () => {
        if (!S.isViewerMode) {
            GTM.push('share_link_generate_start');
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

            GTM.push('share_link_generate_complete', {
                request_count_total: S.history.length
            });
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
            GTM.push('generate_success', {
                request_count_total: S.history.length
            });
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

    if (UI.chatInput) {
        UI.chatInput.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                UI.btnSendChat.click();
            }
        };
    }

    if (UI.btnSendChat) {
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
}

export function renderViewerContent() {
    UI.viewDate.innerText = new Date().toLocaleDateString();
    UI.viewContentArea.innerHTML = '';
    const catMap = { text: '📝 내용 수정', layout: '📐 항목 추가', func: '🛠️ 기능 수정', image: '✨ 기능 개발', asset: '🏠 자산 관련' };

    if (S.history.length === 0) {
        UI.viewContentArea.innerHTML = '<div style="color:#aaa; text-align:center; padding:50px;">저장된 의뢰 내역이 없습니다.</div>';
        return;
    }

    S.history.forEach((h, i) => {
        const div = document.createElement('div');
        div.className = 'view-content-row';

        if (h.isAsset) {
            const assetList = (h.assets || []).map(a => `<div style="display:flex; align-items:center; gap:6px; font-size:13px; color:#444; margin-bottom:4px;"><span style="width:5px; height:5px; border-radius:50%; background:var(--action-pink);"></span>${ASSET_LABELS[a] || a}</div>`).join('');
            div.innerHTML = `
                <div class="view-info-col" style="flex:1;">
                    <div class="view-item-header">
                        <span class="view-cat-badge" style="border-color:var(--action-pink); color:var(--action-pink); background:#fff5f9;">#${i + 1}. ${catMap[h.category] || '자산 관련'}</span>
                    </div>
                    <div class="view-url-container">
                        <span>🔗</span>
                        <input type="text" class="view-url-input" value="${h.url || ""}" readonly style="cursor:default;" placeholder="추가된 URL이 없습니다">
                    </div>
                    <div class="view-asset-items" style="background:#f9fafb; border-radius:12px; padding:16px; margin: 16px 0; border:1px solid #f3f4f6;">
                         <div style="font-size:11px; font-weight:800; color:#aaa; margin-bottom:12px; text-transform:uppercase; letter-spacing:0.5px;">선택된 자산 항목</div>
                        ${assetList || '<div style="color:#aaa">선택된 항목 없음</div>'}
                    </div>
                    <div class="view-add-req"><strong>📋 상세 요청내용:</strong><br>${h.desc || "없음"}</div>
                </div>
            `;
        } else {
            const memos = h.annos.map((a, idx) => {
                const imgIcon = a.img ? `<span class="memo-img-btn" data-src="${a.img}" style="cursor:pointer; color:#8b5cf6; margin-left:6px; font-weight:800; display:inline-flex; align-items:center;">${IMG_ICON}</span>` : '';
                return `<div class="view-memo-item"><div class="view-memo-num">[${idx + 1}]</div><div>${a.text}${imgIcon}</div></div>`;
            }).join('');

            div.innerHTML = `
                <div class="view-info-col">
                    <div class="view-item-header">
                        <span class="view-cat-badge">#${i + 1}. ${catMap[h.category]}</span>
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
                    <div class="view-add-req"><strong>💡 참고사항:</strong><br>${h.desc || "없음"}</div>
                </div>
                ${h.full ? `<div class="view-img-col"><img src="${h.full}" class="view-clickable-img"></div>` : ''}
            `;
        }
        UI.viewContentArea.appendChild(div);

        // 이미지 클릭 이벤트 바인딩
        if (h.full) {
            const img = div.querySelector('.view-clickable-img');
            if (img) {
                if (window.innerWidth >= 768) {
                    img.style.cursor = 'zoom-in';
                    img.style.transition = 'opacity 0.2s';
                    img.onmouseover = () => img.style.opacity = '0.9';
                    img.onmouseout = () => img.style.opacity = '1';
                } else {
                    img.style.cursor = 'pointer';
                }
                img.addEventListener('click', () => openImageModal(h));
            }
        }

        // 개별 메모 이미지 클릭 이벤트 바인딩
        div.querySelectorAll('.memo-img-btn').forEach(btn => {
            btn.onclick = (e) => {
                const src = e.target.dataset.src;
                openImageModal({ full: src, annos: [] });
            };
        });
    });
}

export function openImageModal(h) {
    const modal = UI.imageModalViewer;
    const modalImg = UI.viewerModalImg;
    const closeBtn = UI.closeViewerModal;
    const overlay = UI.viewerAnnoOverlay;
    const tooltip = UI.viewerMemoTooltip;
    const sheet = UI.viewerMobileBottomSheet;

    if (!modal || !modalImg) return;

    modalImg.src = h.full;
    modal.style.display = 'flex';
    overlay.innerHTML = '';
    if (tooltip) tooltip.style.display = 'none';
    if (sheet) {
        sheet.classList.remove('active');
        if (UI.viewerSheetContent) UI.viewerSheetContent.innerHTML = '';
        const hasAnnos = h.annos && h.annos.length > 0;
        sheet.style.display = (window.innerWidth < 768 && hasAnnos) ? 'block' : 'none';
    }

    modalImg.onload = () => {
        const nw = modalImg.naturalWidth;
        const nh = modalImg.naturalHeight;
        const cw = modalImg.clientWidth;
        const ch = modalImg.clientHeight;

        const scaleX = cw / nw;
        const scaleY = ch / nh;

        h.annos.forEach((a, i) => {
            const rect = document.createElement('div');
            rect.className = 'viewer-anno-rect';
            rect.dataset.num = i + 1;
            rect.style.left = (a.rect.x * scaleX) + 'px';
            rect.style.top = (a.rect.y * scaleY) + 'px';
            rect.style.width = (a.rect.w * scaleX) + 'px';
            rect.style.height = (a.rect.h * scaleY) + 'px';
            if (a.img) rect.classList.add('is-purple');

            // 숫자 배지 영역을 피하기 위해 좌상단 모서리 도려냄 (새 배지 크기 기준)
            const cutout = Math.ceil(19 * scaleX); 
            rect.style.clipPath = `polygon(${cutout}px 0, 100% 0, 100% 100%, 0 100%, 0 ${cutout}px)`;

            const memoContent = `
                <div style="font-weight:900; color:${a.img ? '#8b5cf6' : 'var(--action-pink)'}; margin-bottom:5px;">#${i + 1} 수정 요청</div>
                <div style="font-size:14px; color:#333; line-height:1.6;">${a.text}</div>
                ${a.img ? `<img src="${a.img}" style="width:100%; border-radius:6px; margin-top:10px;">` : ''}
            `;

            if (window.innerWidth >= 768) {
                // Desktop Hover
                rect.onmouseenter = (e) => {
                    tooltip.innerHTML = memoContent;
                    tooltip.style.display = 'block';

                    const updateTooltipPos = (ev) => {
                        const tw = tooltip.offsetWidth;
                        const th = tooltip.offsetHeight;
                        let x = ev.clientX + 8;
                        let y = ev.clientY + 8;

                        if (x + tw > window.innerWidth) x = ev.clientX - tw - 8;
                        if (y + th > window.innerHeight) y = ev.clientY - th - 8;

                        tooltip.style.left = x + 'px';
                        tooltip.style.top = y + 'px';
                    };
                    updateTooltipPos(e);
                    rect.onmousemove = updateTooltipPos;
                };

                rect.onmouseleave = () => {
                    tooltip.style.display = 'none';
                    rect.onmousemove = null;
                };
            } else {
                // Mobile Touch
                rect.onclick = (e) => {
                    e.stopPropagation();
                    if (UI.viewerSheetContent) {
                        UI.viewerSheetContent.innerHTML = memoContent;
                        sheet.classList.add('active');
                    }
                    // Highlight active rect
                    overlay.querySelectorAll('.viewer-anno-rect').forEach(r => r.classList.remove('active'));
                    rect.classList.add('active');
                };
            }

            overlay.appendChild(rect);
        });
    };

    const hideModal = () => {
        modal.style.display = 'none';
        modal.removeEventListener('click', modalClick);
        if (sheet) sheet.classList.remove('active');
    };

    if (UI.btnCloseSheet) {
        UI.btnCloseSheet.onclick = (e) => {
            e.stopPropagation();
            sheet.classList.remove('active');
        };
    }

    const modalClick = (ev) => {
        if (ev.target === modal || ev.target === closeBtn || ev.target === modalImg || ev.target === overlay) {
            hideModal();
        }
    };
    modal.addEventListener('click', modalClick);
}

export function addSystemChat(msg) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.innerHTML = `<div class="chat-meta">System • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div><div class="chat-text" style="background:#f3f4f6; color:#555; font-style:italic;">${msg}</div>`;
    UI.chatList.appendChild(bubble);
    UI.chatList.scrollTop = UI.chatList.scrollHeight;
}
