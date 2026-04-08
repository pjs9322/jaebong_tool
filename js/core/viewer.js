/**
 * @file viewer.js
 * @description 편집된 리스트를 열람 모드(Viewer)로 확인할 때 필요한 상태 칩 변경, URL 변경 및 채팅 UI 기능을 제공하는 모듈
 */
import { S, ASSET_LABELS, IMG_ICON } from '../store/state.js';
import { UI } from '../store/elements.js';
import { GTM } from '../util/gtm.js';
import { SyncAPI } from '../util/api.js';

function updateMetaTitle(text) {
    if (UI.topMessage) UI.topMessage.innerText = text;
    document.title = text;
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", text);
}


export function applyPermissionUI() {
    const hasEditRights = !!S.editToken || !!S.hasEditRights;
    const actionSidebar = document.querySelector('.view-action-sidebar');

    if (S.isViewerMode) {
        // [구조 개편] 외부 공유 URL(?id=) 접속 시에는 소유자 여부와 관계없이 열람 전용 UI를 제공합니다.
        // 모든 편집 및 공유 링크 관리 기능은 /jaebong/ 루트(공유 이전 상태)에서만 노출됩니다.
        if (actionSidebar) actionSidebar.style.display = 'none';
        if (UI.topMessage) {
            updateMetaTitle("“홈페이지 수정사항을 정리하여 보내드립니다. 검토 부탁드립니다.”");
        }

        const landingCreateBtn = document.getElementById('btnLandingCreate');
        if (landingCreateBtn) {
            landingCreateBtn.style.display = 'flex';
            landingCreateBtn.innerText = "홈페이지 유지보수 의뢰서 생성해보기";
        }
    } else if (hasEditRights) {
        // --- 내부 워크스페이스(루트)에서의 작성자 UI 설정 ---
        if (UI.topMessage) UI.topMessage.style.display = 'none';

        const actionTitle = document.querySelector('.side-action-title');
        if (actionTitle) {
            actionTitle.innerText = "공유링크를 복사하여 의뢰서를 업체에게 전달해 보세요.";
            actionTitle.style.padding = '16px 20px';
            actionTitle.style.borderRadius = '12px';
            actionTitle.style.fontWeight = '700';
            actionTitle.style.color = 'var(--text)';
            actionTitle.style.lineHeight = '1.6';
            actionTitle.style.textAlign = 'center';
            actionTitle.style.wordBreak = 'keep-all';
        }

        if (UI.viewerBtns) UI.viewerBtns.style.display = 'flex';
        const landingCreateBtn = document.getElementById('btnLandingCreate');
        if (landingCreateBtn) landingCreateBtn.style.display = 'none';

        if (actionSidebar) actionSidebar.style.display = window.innerWidth > 768 ? 'flex' : 'none';

    } else {
        // --- 게스트(편집권한 없음) UI 설정 (주로 폴백용) ---
        if (UI.topMessage) {
            updateMetaTitle("“홈페이지 수정사항을 정리하여 보내드립니다. 검토 부탁드립니다.”");
        }

        if (UI.viewerBtns) UI.viewerBtns.style.display = 'flex';
        const landingCreateBtn = document.getElementById('btnLandingCreate');
        if (landingCreateBtn) {
            landingCreateBtn.style.display = 'flex';
            landingCreateBtn.innerText = "홈페이지 유지보수 의뢰서 생성해보기";
        }

        if (actionSidebar) actionSidebar.style.display = 'none';
    }
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
            // 작성자 모드일 때는 팝업 노출 후 로딩 진행
            showSharePopup();
        }
    };

    function showSharePopup() {
        const h = S.history;
        const incCount = h.filter(x => x.isCompleted === false).length;
        const compCount = h.filter(x => x.isAsset === false && (x.isCompleted === undefined || x.isCompleted === true)).length;
        const assetCount = h.filter(x => x.isAsset === true && (x.isCompleted === undefined || x.isCompleted === true)).length;
        const totalCount = compCount + assetCount;

        if (UI.cntIncomplete) UI.cntIncomplete.innerText = incCount;
        if (UI.cntComplete) UI.cntComplete.innerText = compCount;
        if (UI.cntAsset) UI.cntAsset.innerText = assetCount;
        if (UI.cntTotal) UI.cntTotal.innerText = totalCount;

        // [추가] URL 유효성 검사 로직 (js/core/history.js 벤치마킹)
        const isValidUrl = (url) => {
            if (!url) return false;
            try {
                const trimUrl = url.trim();
                if (trimUrl.includes('://')) {
                    return /^(https?:\/\/)[^\s]+\.[^\s]+$/.test(trimUrl);
                }
                return /^[^\s]+\.[^\s]+$/.test(trimUrl);
            } catch (e) { return false; }
        };

        if (UI.maintUrlIn) {
            UI.maintUrlIn.value = S.maintUrl || '';
            UI.maintUrlIn.classList.remove('invalid'); // 초기화

            const validate = () => {
                const val = UI.maintUrlIn.value.trim();
                const isUrlValid = isValidUrl(val);

                // 시각적 피드백 (벤치마킹: invalid 클래스 토글)
                if (val && !isUrlValid) {
                    UI.maintUrlIn.classList.add('invalid');
                } else {
                    UI.maintUrlIn.classList.remove('invalid');
                }

                if (UI.btnStartShare) {
                    // 유효한 URL이 입력되어야만 시작 버튼 활성화
                    UI.btnStartShare.disabled = !isUrlValid;
                }
            };

            UI.maintUrlIn.oninput = validate;
            validate(); // 초기 호출 (기존 URL이 있다면 버튼 활성화)
        }

        if (UI.btnStartShare) {
            UI.btnStartShare.onclick = async () => {
                S.maintUrl = UI.maintUrlIn.value.trim();

                // [신규] 의뢰서 생성 시작 시점에 DB에 메인 URL 저장 (동기화)
                if (S.docId && S.editToken) {
                    // 비동기로 호출하되, 로딩 화면 전환은 즉시 실행 (백그라운드 처리)
                    SyncAPI.syncDocument(S.docId, S.editToken, JSON.stringify(S.history), S.maintUrl);
                }

                if (UI.sharePopupLayer) UI.sharePopupLayer.classList.remove('active');
                showLoadingAndSwitch();
            };
        }

        if (UI.sharePopupLayer) UI.sharePopupLayer.classList.add('active');
    }

    function switchToViewerLayer() {
        // [개선] 외부 ?id= URL로의 강제 리다이렉트를 제거하고, 내부 레이어 전환 방식을 사용합니다.
        // 이를 통해 편집 모드와 공유 모드(결과 확인) 간의 빠른 전환이 가능하며, URL은 /jaebong/으로 유지됩니다.
        UI.editorLayer.classList.remove('active');
        if (UI.loadingLayer) UI.loadingLayer.classList.remove('active');
        UI.viewerLayer.classList.add('active');
        UI.editorBtns.style.display = 'none';

        if (!S.isViewerMode) {
            GTM.push('share_preview_view', {
                doc_id: S.docId,
                request_count_total: S.history.length
            });
        }

        applyPermissionUI();
        renderViewerContent();
    }

    // 초기 로딩 시 URL 파라미터 체크 후 소유자가 ?id 파라미터로 공유모드 진입 뷰를 새로고침 한거라면
    // 편집 데이터 로딩 직후 화면을 뷰어 모드로 덮어씌움
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('id') && !S.isViewerMode) {
        setTimeout(() => {
            switchToViewerLayer();
        }, 100);
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
        if (S.isViewerMode) {
            // 외부 공유 ?id= URL인 경우 루트 에디터로 리다이렉트
            window.location.replace('/jaebong/?skip_intro=1');
        } else {
            // 내부 에디터 모드인 경우 레이어만 전환
            UI.viewerLayer.classList.remove('active');
            UI.editorLayer.classList.add('active');
            UI.editorBtns.style.display = 'flex';
            if (UI.topMessage) UI.topMessage.style.display = 'block';
            GTM.push('edit_return_from_preview');
        }
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
            addSystemChat(`${String(S.history.indexOf(item) + 1).padStart(2, '0')}번 항목의 상태가 [${statusMap[val]}]로 변경되었습니다.`);
        }
    };

    // 💡 URL 직접 수정 핸들러
    window.updateItemUrl = (el, id) => {
        const newUrl = el.value.trim();
        const item = S.history.find(h => h.id === id);
        if (item && item.url !== newUrl) {
            item.url = newUrl;
            addSystemChat(`${String(S.history.indexOf(item) + 1).padStart(2, '0')}번 항목의 URL이 수정되었습니다.`);
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
    const d = S.updatedAt ? new Date(S.updatedAt.replace(/-/g, '/')) : new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    UI.viewDate.innerText = `${yyyy}. ${mm}. ${dd}.`;

    // 완성된 항목 필터링 (레거시 호환성을 위해 undefined이거나 false가 아닌 모든 건 출력)
    const completedHistory = S.history.filter(h => h.isCompleted !== false);

    // [개선] 팝업에서 수집된 홈페이지 URL 및 전체 요청사항 통계 요약 (검은색 실선 디자인)
    if (S.maintUrl) {
        if (UI.viewMaintUrlBold) UI.viewMaintUrlBold.innerText = S.maintUrl;
        if (UI.viewTotalCountBold) UI.viewTotalCountBold.innerText = completedHistory.length;
        if (UI.viewMaintInfo) UI.viewMaintInfo.style.display = 'flex';
    } else {
        if (UI.viewMaintInfo) UI.viewMaintInfo.style.display = 'none';
    }

    UI.viewContentArea.innerHTML = '';
    const catMap = { text: '📝 내용 수정', layout: '📐 항목 추가', func: '🛠️ 기능 수정', image: '✨ 기능 개발', asset: '🛠️ 홈페이지 다른 문제' };

    if (completedHistory.length === 0) {
        UI.viewContentArea.innerHTML = '<div style="color:#aaa; text-align:center; padding:80px 20px; font-size:14px;">완성된 의뢰 내역이 없습니다.<br><span style="font-size:12px; margin-top:10px; display:block; color:#ccc;">(에디터에서 요청사항을 저장해 주세요)</span></div>';
        return;
    }

    completedHistory.forEach((h, reqIdx) => {
        const div = document.createElement('div');
        div.className = 'view-content-row';

        if (h.isAsset) {
            const assetList = (h.assets || []).map(a => `
                <div style="display:flex; align-items:center; gap:6px; font-size:13px; color:#444; margin-bottom:6px;">
                    <span style="width:6px; height:6px; border-radius:50%; background:var(--action-pink);"></span>
                    ${ASSET_LABELS[a] || a}
                </div>
            `).join('');

            div.innerHTML = `
                <div class="view-info-col" style="flex:1;">
                    <div class="view-item-header">
                        <span class="view-cat-badge">
                            요청사항 ${String(reqIdx + 1).padStart(2, '0')}. 홈페이지 다른 문제
                        </span>
                    </div>

                    <div class="view-url-container" style="cursor:pointer; background:#f8fafc; border:1px solid #e2e8f0; padding:12px 16px; border-radius:10px; display:flex; align-items:center; gap:8px; margin-top:20px;" 
                         onclick="navigator.clipboard.writeText('${h.url}').then(()=>alert('URL이 복사되었습니다.'))">
                        <span style="font-size:18px;">🔗</span>
                        <span style="font-weight:700; color:#1e293b;">${h.url || "URL 정보 없음"}</span>
                    </div>
                    <div class="view-asset-items" style="background:#fff; border-radius:14px; padding:20px; margin: 20px 0; border:1px solid #f1f5f9; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
                         <div style="font-size:11px; font-weight:800; color:#94a3b8; margin-bottom:15px; text-transform:uppercase; letter-spacing:1px; display:flex; align-items:center; gap:6px;">
                             <span style="width:4px; height:4px; background:#94a3b8; border-radius:50%;"></span> 선택된 요청 내역
                         </div>
                        ${assetList || '<div style="color:#cbd5e1">선택된 항목 없음</div>'}
                    </div>
                    <div class="view-add-req" style="background:#fff1f2; padding:20px; border-radius:12px; border:1px solid #fecdd3; font-size:14px; line-height:1.6; color:#334155;">
                        <strong style="color:#e11d48; display:block; margin-bottom:8px; font-size:13px;">💡 요청사항 추가설명:</strong>
                        <div style="white-space:pre-wrap;">${h.desc || "상세 설명이 없습니다."}</div>
                    </div>
                </div>
            `;
        } else {
            const memos = h.annos.map((a, memoIdx) => {
                const imgIcon = a.img ? `<span class="memo-img-btn" data-src="${a.img}" style="cursor:pointer; color:#8b5cf6; margin-left:6px; display:inline-flex; align-items:center; gap:4px;">${IMG_ICON}<span style="font-size:11px; font-weight:normal;">첨부이미지 크게보기</span></span>` : '';
                return `<div class="view-memo-item"><div class="view-memo-num">[${String(memoIdx + 1).padStart(2, '0')}]</div><div class="view-memo-text">${a.text}${imgIcon}</div></div>`;
            }).join('');

            div.innerHTML = `
                <div class="view-info-col">
                    <div class="view-item-header">
                        <span class="view-cat-badge">요청사항 ${String(reqIdx + 1).padStart(2, '0')}${h.category && catMap[h.category] ? `. ${catMap[h.category]}` : ''}</span>
                    </div>
                    <div class="view-memo-box">
                        <div style="font-size:12px; font-weight:800; color:#888; margin-bottom:10px;">요청사항 메모</div>
                        ${memos || '<div style="color:#aaa">등록된 메모가 없습니다.</div>'}
                    </div>
                </div>
                ${h.thumb ? `<div class="view-img-col"><img src="${h.thumb}" class="view-clickable-img"></div>` : ''}
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
                img.addEventListener('click', () => openImageModal(h, reqIdx));
            }
        }

        // 개별 메모 이미지 클릭 이벤트 바인딩
        div.querySelectorAll('.memo-img-btn').forEach((btn, memoIdx) => {
            btn.onclick = (e) => {
                const src = e.target.dataset.src || e.target.closest('.memo-img-btn').dataset.src;
                if (window.innerWidth >= 768) {
                    const a = h.annos[memoIdx];
                    openMemoImageModal(src, reqIdx + 1, memoIdx + 1, a.text);
                } else {
                    openImageModal({ full: src, annos: [] });
                }
            };
        });
    });
}

export function openImageModal(h, reqIdx) {
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
        sheet.style.display = (window.innerWidth < 768 && hasAnnos) ? 'flex' : 'none';
    }

    modalImg.onload = () => {
        const nw = modalImg.naturalWidth;
        const nh = modalImg.naturalHeight;
        const cw = modalImg.clientWidth;
        const ch = modalImg.clientHeight;

        const scaleX = cw / nw;
        const scaleY = ch / nh;

        h.annos.forEach((a, memoIdx) => {
            const rect = document.createElement('div');
            rect.className = 'viewer-anno-rect';
            rect.dataset.num = String(memoIdx + 1).padStart(2, '0');
            rect.style.left = (a.rect.x * scaleX) + 'px';
            rect.style.top = (a.rect.y * scaleY) + 'px';
            rect.style.width = (a.rect.w * scaleX) + 'px';
            rect.style.height = (a.rect.h * scaleY) + 'px';
            if (a.img) rect.classList.add('is-purple');

            const memoContent = a.img ? 
                (`<div style="font-weight:900; color:#8b5cf6; margin-bottom:5px;">요청사항 ${String(reqIdx + 1).padStart(2, '0')} 수정 요청</div>` +
                 `<div style="font-size:14px; color:#333; line-height:1.5; white-space:pre-wrap; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; text-overflow:ellipsis;">${a.text}</div>` +
                 `<div class="view-memo-img-wrapper cropped"><img src="${a.img}" class="view-memo-img" style="cursor:zoom-in;"></div>` +
                 `<div style="font-size:11px; color:#aaa; margin-top:10px; text-align:right;">(클릭하여 상세 보기)</div>`) :
                (`<div style="font-weight:900; color:var(--action-pink); margin-bottom:5px;">요청사항 ${String(reqIdx + 1).padStart(2, '0')} 수정 요청</div>` +
                 `<div style="font-size:14px; color:#333; line-height:1.5; white-space:pre-wrap;">${a.text}</div>`);

            if (window.innerWidth >= 768) {
                // Desktop Hover
                rect.onmouseenter = (e) => {
                    tooltip.innerHTML = memoContent;
                    tooltip.style.display = 'block';

                    // [추가] 툴팁 내부 이미지 클릭 이벤트 바인딩 (데스크톱)
                    const tooltipImg = tooltip.querySelector('.view-memo-img');
                    if (tooltipImg) {
                        tooltipImg.style.pointerEvents = 'auto'; // 툴팁 자체가 none이라도 이미지는 클릭 가능하게 하려면...
                        tooltipImg.onclick = () => openMemoImageModal(a.img);
                        // 💡 주의: 툴팁에 pointer-events: none이 걸려있으면 클릭이 안됨. 
                        // 하지만 데스크톱에서는 rect.onclick으로 이미 처리했으므로 중복일 수 있음.
                    }

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

                // [추가] 데스크톱에서 이미지가 있는 항목은 클릭 시 크게보기
                if (a.img) {
                    rect.style.cursor = 'zoom-in';
                    rect.onclick = (e) => {
                        e.stopPropagation();
                        openMemoImageModal(a.img, reqIdx + 1, memoIdx + 1, a.text);
                    };
                }
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
        if (ev.target === modal || ev.target === closeBtn || ev.target === modalImg || ev.target === overlay || ev.target.classList.contains('viewer-modal-container')) {
            hideModal();
        }
    };
    modal.addEventListener('click', modalClick);
}

/**
 * 메모 첨부 이미지 크게보기 (보조 팝업)
 */
export function openMemoImageModal(src, reqNum, memoNum, text) {
    const modal = UI.memoImageModal;
    const modalImg = UI.memoModalImg;
    const closeBtn = UI.closeMemoImageModal;
    const header = UI.memoModalHeader;

    if (!modal || !modalImg) return;

    if (header) {
        header.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                <span style="font-weight:900; color:var(--action-pink);">요청사항 ${String(reqNum).padStart(2, '0')}</span>
                <span style="width:1px; height:10px; background:#ccc;"></span>
                <span style="font-weight:700; color:#8b5cf6;">메모 ${String(memoNum).padStart(2, '0')}</span>
            </div>
            <div class="view-memo-text" style="color:#444; white-space:pre-wrap; font-size:14px; word-break:break-all; line-height:1.5; max-height:4.5em; overflow-y:auto; padding-right:4px;">${text}</div>
        `;
    }

    modalImg.src = src;
    modal.style.display = 'flex';
    modal.style.opacity = '0';
    modal.style.transition = 'opacity 0.3s ease';
    
    if (header) {
        header.style.display = 'flex';
        header.style.opacity = '0';
    }

    requestAnimationFrame(() => {
        modal.style.opacity = '1';
        if (header) header.style.opacity = '1';
    });

    const hideMemoModal = () => {
        modal.style.opacity = '0';
        if (header) header.style.opacity = '0';

        setTimeout(() => {
            modal.style.display = 'none';
            if (header) header.style.display = 'none';
            modalImg.src = '';
        }, 300);
        window.removeEventListener('keydown', handleEsc);
    };

    const handleEsc = (e) => {
        if (e.key === 'Escape') hideMemoModal();
    };
    window.addEventListener('keydown', handleEsc);

    closeBtn.onclick = (e) => {
        e.stopPropagation();
        hideMemoModal();
    };

    modal.onclick = (e) => {
        if (e.target === modal || e.target === modalImg || e.target.classList.contains('viewer-modal-container')) {
            hideMemoModal();
        }
    };
}

export function addSystemChat(msg) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.innerHTML = `<div class="chat-meta">System • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div><div class="chat-text" style="background:#f3f4f6; color:#555; font-style:italic;">${msg}</div>`;
    UI.chatList.appendChild(bubble);
    UI.chatList.scrollTop = UI.chatList.scrollHeight;
}
