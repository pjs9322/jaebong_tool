/**
 * @file viewer-main.js
 * @description 단순 열람/공유용 뷰어 모듈
 */
import { S } from './store/state.js';
import { SyncAPI } from './util/api.js';

async function startup() {
    S.isViewerMode = true;

    // 기기 식별자(UUID) 획득 및 설정
    let myUuid = localStorage.getItem('jaebong_uuid');
    if (!myUuid) {
        myUuid = crypto.randomUUID();
        localStorage.setItem('jaebong_uuid', myUuid);
    }
    S.myUuid = myUuid;

    const urlParams = new URLSearchParams(window.location.search);
    const currentId = urlParams.get('id');

    if (!currentId) {
        alert('잘못된 접근입니다.');
        window.location.href = '/jaebong/';
        return;
    }

    const res = await SyncAPI.readDocument(currentId);
    if (!res.success) {
        alert('문서를 찾을 수 없거나 서버 통신에 실패했습니다.');
        window.location.href = '/jaebong/';
        return;
    }

    try {
        const payload = JSON.parse(res.data.history_json || '{"history":[]}');
        S.history = Array.isArray(payload) ? payload : (payload.history || []);
    } catch (e) {
        S.history = [];
    }

    // 소유자 권한 확인 후 버튼 노출
    const isOwner = res.data.owner_uuid === S.myUuid;
    const viewerBtns = document.getElementById('viewerBtns');
    if (isOwner) {
        if (viewerBtns) viewerBtns.style.display = 'flex';

        const backBtn = document.getElementById('backToEditBtn');
        const copyBtn = document.getElementById('btnCopyLinkViewer');

        if (backBtn) {
            backBtn.onclick = () => {
                window.location.href = '/jaebong/'; // 파라미터 제외하고 접근하여 에디터 진입
            };
        }

        if (copyBtn) {
            copyBtn.onclick = () => {
                const baseUrl = window.location.origin + window.location.pathname;
                const urlToCopy = baseUrl.endsWith('/') ? `${baseUrl}?id=${currentId}` : `${baseUrl}/?id=${currentId}`;
                navigator.clipboard.writeText(urlToCopy).then(() => {
                    alert('공유 링크가 클립보드에 복사되었습니다!\n(' + urlToCopy + ')');
                }).catch(err => {
                    alert('링크 복사에 실패했습니다. 수동으로 복사해주세요.\n' + urlToCopy);
                });
            };
        }
    } else {
        if (viewerBtns) viewerBtns.style.display = 'none';
    }

    // 뷰어 계층 팝업 렌더링
    renderViewerContent();
}

function renderViewerContent() {
    const viewDateEl = document.getElementById('viewDate');
    const contentAreaEl = document.getElementById('viewContentArea');
    
    if (viewDateEl) viewDateEl.innerText = new Date().toLocaleDateString();
    if (!contentAreaEl) return;
    contentAreaEl.innerHTML = '';
    
    const catMap = { text: '📝 내용 수정', layout: '📐 항목 추가', func: '🛠️ 기능 수정', image: '✨ 기능 개발' };

    if (S.history.length === 0) {
        contentAreaEl.innerHTML = '<div style="color:#aaa; text-align:center; padding:50px;">저장된 의뢰 내역이 없습니다.</div>';
        return;
    }

    S.history.forEach((h, i) => {
        const memos = h.annos.map((a, idx) => `<div class="view-memo-item"><div class="view-memo-num">[${idx + 1}]</div><div>${a.text}</div></div>`).join('');

        const div = document.createElement('div');
        div.className = 'view-content-row';
        div.innerHTML = `
            <div class="view-info-col">
                <div class="view-item-header">
                    <span class="view-cat-badge">#${i + 1}. ${catMap[h.category]}</span>
                </div>
                <div class="view-url-container">
                    <span>🔗</span>
                    <input type="text" class="view-url-input" value="${h.url}" readonly style="cursor:default;" placeholder="추가된 URL이 없습니다">
                </div>
                <div class="view-memo-box">
                    <div style="font-size:12px; font-weight:800; color:#888; margin-bottom:10px;">상세 메모</div>
                    ${memos || '<div style="color:#aaa">등록된 메모가 없습니다.</div>'}
                </div>
                <div class="view-add-req"><strong>💡 추가 요청사항:</strong><br>${h.desc || "없음"}</div>
            </div>
            ${h.full ? `<div class="view-img-col"><img src="${h.full}"></div>` : ''}
        `;
        contentAreaEl.appendChild(div);
    });

    // Attach click events for PC popup
    const imgElements = contentAreaEl.querySelectorAll('.view-img-col img');
    imgElements.forEach(img => {
        if (window.innerWidth >= 768) {
            img.style.cursor = 'zoom-in';
            img.style.transition = 'opacity 0.2s';
            img.onmouseover = () => img.style.opacity = '0.9';
            img.onmouseout = () => img.style.opacity = '1';
        }
        
        img.addEventListener('click', (e) => {
            if (window.innerWidth >= 768) {
                const modal = document.getElementById('imageModalViewer');
                const modalImg = document.getElementById('viewerModalImg');
                const closeBtn = document.getElementById('closeViewerModal');
                
                if (modal && modalImg) {
                    modalImg.src = e.target.src;
                    modal.style.display = 'flex';
                    
                    const hideModal = () => {
                        modal.style.display = 'none';
                        modal.removeEventListener('click', modalClick);
                    };

                    const modalClick = (ev) => {
                        // Close if clicked outside the image or on the close button
                        if (ev.target === modal || ev.target === closeBtn) {
                            hideModal();
                        }
                    };

                    modal.addEventListener('click', modalClick);
                }
            }
        });
    });
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startup);
} else {
    startup();
}
