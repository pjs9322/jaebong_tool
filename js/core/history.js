/**
 * @file history.js
 * @description 캔버스에서 작업한 내역을 '요청사항 리스트' (History)에 저장, 수정, 삭제 및 관리하는 상태 코어 모듈
 */
import { S, IMG_ICON } from '../store/state.js';
import { UI } from '../store/elements.js';
import { loadImage } from '../utils/imageLoader.js';
import { render, resetMemoPanel, updateAnnoListUI, generateQR, enterAssetMode, exitAssetMode } from './canvas.js';
import { SyncAPI } from '../util/api.js';
import { GTM } from '../util/gtm.js';

const ASSET_LABELS = {
    domain: '도메인', hosting: '호스팅', server: '서버', ssl: 'SSL 인증서',
    migration: '사이트 이전', db: 'DB 이전', backup: '백업/복구',
    'site-access': '사이트 접속 불가', 'admin-access': '관리자 분실', 'account-lost': '계정/비번 분실'
};

export async function syncHistoryToServer() {
    if (!S.docId || !S.editToken) return;
    const payload = {
        history: S.history,
        draft: {
            annos: S.annos,
            url: UI.urlIn.value,
            desc: UI.reqDesc.value,
            baseImgSrc: (S.img && UI.cWrap.style.display !== 'none') ? S.baseImgSrc : null
        }
    };
    const historyJson = JSON.stringify(payload);
    console.log('[Sync] syncHistoryToServer called:', historyJson);
    const res = await SyncAPI.syncDocument(S.docId, S.editToken, historyJson);
    console.log('[Sync] sync result:', res);
    if (res && res.success) {
        console.log('클라우드 서버 동기화 완료:', res.updated_at);
    } else {
        console.error('클라우드 서버 동기화 실패:', res);
    }
    return res;
}

export function clearEditingState() {
    if (S.isAssetMode) {
        exitAssetMode();
    }
    S.editingHistoryId = null;
    UI.saveReqBtn.innerText = "← 리스트 추가하기";
    UI.saveReqBtn.style.background = "var(--action-pink)";
    UI.cancelEditBtn.style.display = 'none';
    UI.catBtns.forEach(btn => btn.classList.remove('invalid-target'));
    if (S.isAssetMode) {
        S.isAssetMode = false;
        S.selectedAssets.clear();
        UI.assetItems.forEach(i => i.classList.remove('selected'));
        UI.assetModeOverlay.style.display = 'none';
        resetMemoPanel(false);
    }
    renderQueue();
}

export function updateSaveBtnState() {
    let hasContent = false;
    if (S.isAssetMode) {
        hasContent = S.selectedAssets.size > 0;
    } else {
        hasContent = (S.img && UI.cWrap.style.display !== 'none') || UI.reqDesc.value.trim() !== '';
    }
    UI.saveReqBtn.disabled = !hasContent;
}

export function renderQueue() {
    UI.reqList.innerHTML = '';
    UI.queueCount.innerText = S.history.length + '건';

    if (S.history.length === 0) {
        UI.reqList.innerHTML = '<div style="text-align:center; padding:30px 10px; color:#9ca3af; font-size:12px;">등록된 요청사항이 없습니다.</div>';
        UI.exportBtn.disabled = true;
        UI.shareBtn.disabled = true;
        return;
    }

    UI.exportBtn.disabled = false;
    UI.shareBtn.disabled = false;

    S.history.slice().reverse().forEach((h, i) => {
        const d = document.createElement('div');
        d.className = 'req-card' + (S.editingHistoryId === h.id ? ' editing' : '');
        const catMap = { text: '📝 내용 수정', layout: '📐 항목 추가', func: '🛠️ 기능 수정', image: '✨ 기능 개발', asset: '🏠 자산 관련' };
        
        if (h.isAsset) {
            const assetList = (h.assets || []).map(a => `<div style="display:flex; align-items:center; gap:4px; font-size:11px; color:#666;"><span style="width:4px; height:4px; border-radius:50%; background:var(--action-pink);"></span>${ASSET_LABELS[a] || a}</div>`).join('');
            d.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-size:11px; color:#aaa; margin-bottom:6px;">
                    <span>#${S.history.length - i} • ${h.date}</span>
                    <div style="display:flex; gap:4px;"><button class="btn-std" style="padding:2px 6px; font-size:10px;">수정</button><button class="btn-std" style="padding:2px 6px; font-size:10px; color:var(--danger);">삭제</button></div>
                </div>
                <div style="display:flex; gap:6px; margin-bottom:8px;">
                    <span class="tag" style="border-color:var(--action-pink); color:var(--action-pink); background:#fff5f9;">${catMap[h.category]}</span>
                </div>
                <div style="background:#f9fafb; border-radius:8px; padding:10px; margin-bottom:8px; border:1px solid #f3f4f6;">
                    ${assetList}
                </div>
                ${h.desc ? `<div style="font-size:12px; color:#555; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; text-overflow:ellipsis; word-break:break-all;">${h.desc}</div>` : ''}
            `;
        } else {
            d.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-size:11px; color:#aaa; margin-bottom:6px;">
                    <span>#${S.history.length - i} • ${h.date}</span>
                    <div style="display:flex; gap:4px;"><button class="btn-std" style="padding:2px 6px; font-size:10px;">수정</button><button class="btn-std" style="padding:2px 6px; font-size:10px; color:var(--danger);">삭제</button></div>
                </div>
                <div style="display:flex; gap:6px; margin-bottom:8px;">
                    <span class="tag">${catMap[h.category]}</span>
                    ${h.annos.length > 0 ? `<span class="tag" style="background:#fff; border:1px solid #ddd;">메모 ${h.annos.length}개</span>` : ''}
                    ${h.annos.some(a => a.img) ? `<span class="tag" style="background:#fff; border:1px solid #8b5cf6; color:#8b5cf6; display:inline-flex; align-items:center; gap:2px;">${IMG_ICON} 사진</span>` : ''}
                </div>
                ${h.thumb ? `<img src="${h.thumb}" style="margin-bottom:8px;">` : ''}
                ${h.desc ? `<div style="font-size:12px; color:#555; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; text-overflow:ellipsis; word-break:break-all;">${h.desc}</div>` : ''}
            `;
        }
        d.querySelectorAll('button')[0].onclick = () => { // 수정
            const isEditing = S.editingHistoryId !== null;
            const hasDraft = (S.img && UI.cWrap.style.display !== 'none') || S.annos.length > 0 || UI.reqDesc.value !== '';
            if ((isEditing || hasDraft) && !confirm("저장하지 않은 내용은 사라집니다. 계속하시겠습니까?")) return;

            resetMemoPanel(false);
            S.activeAnnoId = null; // 이전 선택 상태 초기화

            document.querySelectorAll('.req-card.editing').forEach(card => card.classList.remove('editing'));
            d.classList.add('editing');
            S.editingHistoryId = h.id;

            const setupEditState = () => {
                S.annos = JSON.parse(JSON.stringify(h.annos));
                UI.urlIn.value = h.url;
                UI.reqDesc.value = h.desc;
                S.currentCategory = h.category;
                UI.catBtns.forEach(b => {
                    b.classList.toggle('active', b.dataset.val === h.category);
                    b.classList.remove('invalid-target');
                });
                // generateQR(h.url); // QR 기능 삭제 (Task 002)
                updateAnnoListUI();
                render();
                UI.saveReqBtn.innerText = "수정 완료 (덮어쓰기)";
                UI.saveReqBtn.style.background = "#10b981";
                UI.cancelEditBtn.style.display = 'block';
                updateSaveBtnState();
            };

            if (h.isAsset) {
                enterAssetMode();
                S.selectedAssets = new Set(h.assets || []);
                UI.assetItems.forEach(i => {
                    i.classList.toggle('selected', S.selectedAssets.has(i.dataset.key));
                });
                
                UI.urlIn.value = h.url || '';
                UI.reqDesc.value = h.desc || '';
                S.currentCategory = 'asset';
                UI.catBtns.forEach(b => b.classList.toggle('active', b.dataset.val === 'asset'));
                
                UI.saveReqBtn.innerText = "수정 완료 (덮어쓰기)";
                UI.saveReqBtn.style.background = "#10b981";
                UI.cancelEditBtn.style.display = 'block';
                
                updateSaveBtnState();
            } else {
                if (S.isAssetMode) exitAssetMode(); // 자산 모드였다면 해제

                if (h.baseImgSrc) {
                    loadImage(h.baseImgSrc, setupEditState);
                } else {
                    S.img = null;
                    S.baseImgSrc = null;
                    UI.cWrap.style.display = 'none';
                    UI.ctx.clearRect(0, 0, S.w, S.h);
                    setupEditState();
                }
            }
        };
        d.querySelectorAll('button')[1].onclick = async () => {
            if (!confirm("정말 요청사항을 삭제하시겠습니까?")) return;
            S.history = S.history.filter(x => x.id !== h.id);
            if (S.editingHistoryId === h.id) clearEditingState();
            renderQueue();
            GTM.push('request_item_delete', { request_item_id: h.id });
            await syncHistoryToServer(); // 삭제 시에는 딜레이 없이 즉시 서버 동기화 (Task 001)
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
        updateSaveBtnState();
    };

    UI.saveReqBtn.onclick = async () => {
        if (!S.currentCategory) {
            UI.catBtns.forEach(btn => {
                if (btn.id !== 'catAssetBtn') btn.classList.add('invalid-target');
            });
            alert("요청사항 유형(카테고리)을 선택해 주세요.");
            return;
        }

        if (S.state === 'MEMO_WAIT' || S.state === 'EDITING') {
            if (!confirm("작성 중인 메모가 완료되지 않았습니다. 메모를 제외하고 이대로 리스트에 추가하시겠습니까?")) return;
            resetMemoPanel(false);
            render();
        }
        const hasImage = S.img && UI.cWrap.style.display !== 'none';

        if (S.annos.length === 0 && !S.isAssetMode) {
            const confirmMsg = !hasImage ? "이미지와 메모 없이 저장하시겠습니까?" : "메모 없이 저장하시겠습니까?";
            if (!confirm(confirmMsg)) return;
        }

        let full = null;
        let thumb = null;
        if (S.img && UI.cWrap.style.display !== 'none') {
            render(true);
            full = UI.canvas.toDataURL('image/jpeg', 0.8);
            thumb = UI.canvas.toDataURL('image/jpeg', 0.2);
        }

        UI.saveReqBtn.innerText = "저장 중...";
        UI.saveReqBtn.disabled = true;

        let baseImgSrc = (S.img && UI.cWrap.style.display !== 'none') ? S.baseImgSrc : null;

        // Base64 문자열을 추출하여 서버에 업로드하고, URL로 치환 (502 에러 방지용)
        const uploadBase64 = async (b64) => {
            if (!b64 || !b64.startsWith('data:image')) return b64;
            try {
                const mimeMatch = b64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
                const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
                const ext = mime.split('/')[1] === 'png' ? 'png' : (mime.split('/')[1] === 'webp' ? 'webp' : 'jpg');

                const res = await fetch(b64);
                const blob = await res.blob();

                // Blob 객체는 FormData에 추가할 때 파일명(확장자)이 없어 upload.php에서 거부당합니다.
                // 따라서 강제로 File 객체로 캐스팅하여 확장자를 붙여줍니다.
                const file = new File([blob], `canvas_${Date.now()}.${ext}`, { type: mime });

                const upRes = await SyncAPI.uploadImage(file, S.docId);

                if (!upRes.success) {
                    console.error('Image upload rejected by server:', upRes.message);
                    alert(`이미지 업로드에 실패했습니다 (${upRes.message}). 해상도를 줄이거나 관리자에게 문의하세요.`);
                    // 서버가 죽는 502 에러를 막기 위해, 업로드 실패 시 원본 거대 base64를 반환하지 않고 null 처리합니다.
                    return null;
                }
                return upRes.url;
            } catch (e) {
                console.error('Image upload exception:', e);
                return null;
            }
        };

        full = await uploadBase64(full);
        thumb = full; // Omit separate thumb upload to save storage. Use full image for thumbnails via CSS.
        baseImgSrc = await uploadBase64(baseImgSrc);

        // Upload memo images
        for (let a of S.annos) {
            if (a.img && a.img.startsWith('data:image')) {
                a.img = await uploadBase64(a.img);
            }
        }

        const data = {
            id: Date.now(),
            date: new Date().toLocaleTimeString(),
            thumb, full,
            baseImgSrc,
            annos: S.isAssetMode ? [] : JSON.parse(JSON.stringify(S.annos)),
            url: UI.urlIn.value,
            desc: UI.reqDesc.value,
            category: S.currentCategory,
            isAsset: S.isAssetMode,
            assets: S.isAssetMode ? Array.from(S.selectedAssets) : [],
            status: 'request'
        };

        if (S.editingHistoryId) {
            const idx = S.history.findIndex(x => x.id === S.editingHistoryId);
            if (idx !== -1) S.history[idx] = data;
            alert("수정 완료되었습니다.");
            GTM.push('request_item_edit', { request_item_id: S.editingHistoryId });
        } else {
            S.history.push(data);
            alert("저장되었습니다.");

            GTM.push('request_item_save', {
                category: S.currentCategory,
                request_count_total: S.history.length,
                memo_count_total: S.annos.length,
                is_asset: S.isAssetMode
            });
        }

        clearEditingState();
        S.img = null;
        S.baseImgSrc = null;
        S.activeAnnoId = null; // 가비지 데이터(선택 아이디) 초기화
        S.draftRect = null;    // 가비지 데이터(드래그 영역) 초기화
        resetMemoPanel(false); // 메모 패널 닫기 및 UI 정리

        UI.cWrap.style.display = 'none';
        if (UI.ctx) UI.ctx.clearRect(0, 0, S.w, S.h);

        S.annos = [];
        updateAnnoListUI();
        UI.reqDesc.value = '';
        UI.urlIn.value = '';

        // 카테고리 초기화
        S.currentCategory = null;
        UI.catBtns.forEach(b => b.classList.remove('active'));

        render();
        UI.exportBtn.disabled = false;
        UI.shareBtn.disabled = false;
        renderQueue();

        // 사용자가 명시적으로 [리스트 추가]를 눌렀으므로 타이머 없이 즉시 클라우드에 강제 동기화 (Task 001)
        if (S.docId && S.editToken) {
            UI.saveReqBtn.innerText = "서버 동기화 중...";
            await syncHistoryToServer();
        }
        UI.saveReqBtn.innerText = "← 리스트 추가하기";
        updateSaveBtnState();
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

            // 카테고리 초기화
            S.currentCategory = null;
            UI.catBtns.forEach(b => b.classList.remove('active'));

            updateAnnoListUI();
            updateSaveBtnState();
            render();
        }
    };

    UI.btnResetAll.onclick = async () => {
        if (!confirm("모든 요청사항이 제거됩니다. 계속하시겠습니까?")) return;

        S.history = [];
        clearEditingState();
        S.img = null;
        S.baseImgSrc = null;
        UI.cWrap.style.display = 'none';
        UI.ctx.clearRect(0, 0, S.w, S.h);
        UI.urlIn.value = '';
        UI.reqDesc.value = '';
        S.annos = [];
        resetMemoPanel(false);

        // 카테고리 초기화
        S.currentCategory = null;
        UI.catBtns.forEach(b => b.classList.remove('active'));

        updateAnnoListUI();
        updateSaveBtnState();
        render();

        renderQueue(); // will disable share/export btn properly

        // 서버 동기화 처리
        if (S.docId && S.editToken) {
            console.log('[Sync] Resetting all progress on server...');
            GTM.push('workspace_reset');
            await syncHistoryToServer();
        }
    };
}
