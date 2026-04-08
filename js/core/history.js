/**
 * @file history.js
 * @description 캔버스에서 작업한 내역을 '요청사항 리스트' (History)에 저장, 수정, 삭제 및 관리하는 상태 코어 모듈
 */
import { S, ASSET_LABELS, IMG_ICON } from '../store/state.js';
import { UI } from '../store/elements.js';
import { loadImage, updateZoomMode } from '../utils/imageLoader.js';
import { render, resetMemoPanel, updateAnnoListUI, generateQR, enterAssetMode, exitAssetMode, updateFooterVisibility, updateAssetSelectionUI } from './canvas.js';
import { SyncAPI } from '../util/api.js';
import { GTM } from '../util/gtm.js';
/**
 * 튜토리얼 스타일의 커스텀 확인 모달 표시
 */
function showConfirm(title, desc, onOk, onCancel) {
    if (!UI.confirmModal) {
        // Fallback to native confirm if UI not ready
        if (confirm(`${title}\n\n${desc}`)) { if (onOk) onOk(); }
        else { if (onCancel) onCancel(); }
        return;
    }
    UI.confirmModalTitle.innerText = title;
    UI.confirmModalDesc.innerHTML = desc;
    UI.confirmModal.style.display = 'flex';
    UI.btnConfirmOk.onclick = () => {
        UI.confirmModal.style.display = 'none';
        if (onOk) onOk();
    };
    UI.btnConfirmCancel.onclick = () => {
        UI.confirmModal.style.display = 'none';
        if (onCancel) onCancel();
    };
}

/**
 * Base64 문자열을 추출하여 서버에 업로드하고, URL로 치환 (502 에러 방지용)
 */
export const uploadBase64 = async (b64) => {
    if (!b64 || !b64.startsWith('data:image')) return b64;
    try {
        const mimeMatch = b64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const ext = mime.split('/')[1] === 'png' ? 'png' : (mime.split('/')[1] === 'webp' ? 'webp' : 'jpg');

        const res = await fetch(b64);
        const blob = await res.blob();

        const file = new File([blob], `canvas_${Date.now()}.${ext}`, { type: mime });
        const upRes = await SyncAPI.uploadImage(file, S.docId);

        if (!upRes.success) {
            console.error('Image upload rejected by server:', upRes.message);
            alert(`이미지 업로드에 실패했습니다 (${upRes.message}). 해상도를 줄이거나 관리자에게 문의하세요.`);
            return null;
        }
        return upRes.url;
    } catch (e) {
        console.error('Image upload exception:', e);
        return null;
    }
};

/**
 * 캔버스의 현재 상태 혹은 인자로 들어온 데이터를 기반으로 즉시 History 아이템을 추가합니다.
 * @param {Object} itemData { full, thumb, baseImgSrc, category, desc, annos, url }
 */
export async function addHistoryDirect(itemData) {
    let { full, thumb, baseImgSrc, category, desc, annos, url, isCompleted } = itemData;

    // [개선] 썸네일이 Base64인 경우 가로 300px로 축소 처리
    if (thumb && thumb.startsWith('data:image')) {
        thumb = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const tw = 600;
                const th = Math.round(img.naturalHeight * (tw / img.naturalWidth));
                const canvas = document.createElement('canvas');
                canvas.width = tw; canvas.height = th;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, tw, th);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = thumb;
        });
        thumb = await uploadBase64(thumb);
    }

    // 원본/기타 이미지 업로드
    if (full && full.startsWith('data:image')) full = await uploadBase64(full);
    if (baseImgSrc === itemData.full) baseImgSrc = full;
    if (baseImgSrc && baseImgSrc.startsWith('data:image')) baseImgSrc = await uploadBase64(baseImgSrc);

    // 메모 사진들 업로드
    if (annos && Array.isArray(annos)) {
        for (let a of annos) {
            if (a.img && a.img.startsWith('data:image')) a.img = await uploadBase64(a.img);
        }
    }

    const finalData = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        date: new Date().toLocaleTimeString(),
        thumb: full,
        full,
        baseImgSrc,
        annos: annos || [],
        url: url || '',
        desc: desc || '',
        category: category || '',
        isAsset: false,
        assets: [],
        status: 'request',
        isCompleted: isCompleted !== undefined ? isCompleted : false // 기본 미완성
    };

    S.history.push(finalData);

    GTM.push('request_item_save', {
        category: finalData.category,
        request_count_total: S.history.length,
        memo_count_total: finalData.annos.length,
        is_asset: false
    });

    S.currentHistoryTab = 'INCOMPLETE';
    renderQueue(true);
    if (S.docId && S.editToken) await syncItemToServer(finalData);
    return finalData;
}

export async function addAssetHistory() {
    const finalData = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        date: new Date().toLocaleTimeString(),
        thumb: null, full: null, baseImgSrc: null,
        annos: [],
        url: '', desc: '',
        category: 'asset',
        isAsset: true,
        assets: [],
        status: 'request',
        isCompleted: false // 최초 생성은 미완성
    };

    S.history.push(finalData);
    S.currentHistoryTab = 'INCOMPLETE';
    renderQueue(true);
    if (S.docId && S.editToken) await syncItemToServer(finalData);

    return finalData;
}

export function enterEditMode(h) {
    if (S.editingHistoryId === h.id) return;
    if (isEditorDirty() && !confirm("저장하지 않은 내용은 사라집니다. 계속하시겠습니까?")) return;

    resetMemoPanel(false);
    S.activeAnnoId = null;

    const isComp = h.isCompleted === undefined ? true : !!h.isCompleted;
    const targetTab = isComp ? 'COMPLETE' : 'INCOMPLETE';
    const tabChanged = S.currentHistoryTab !== targetTab;

    if (tabChanged) {
        S.currentHistoryTab = targetTab;
        renderQueue(); // 탭이 바뀌면 전체 리스트를 새로 그려야 함
    }

    // UI 하이라이트 (리스트를 통째로 다시 그리지 않고 클래스만 교체)
    document.querySelectorAll('.req-card.editing').forEach(card => card.classList.remove('editing'));
    const targetCard = Array.from(document.querySelectorAll('.req-card')).find(card => card.dataset.id == h.id);
    if (targetCard) targetCard.classList.add('editing');

    S.editingHistoryId = h.id;
    S.editingOriginalData = JSON.parse(JSON.stringify(h));

    const setupEditState = () => {
        S.annos = JSON.parse(JSON.stringify(h.annos));
        UI.urlIn.value = h.url || '';
        UI.reqDesc.value = h.desc || '';
        S.currentCategory = h.category;
        UI.catBtns.forEach(b => {
            b.classList.toggle('active', b.dataset.val === h.category);
            b.classList.remove('invalid-target');
        });
        updateAnnoListUI();
        render();

        // [추가] 현재 수정 중인 항목의 순번 표시 (완성된 요청인 경우에만)
        if (UI.currentEditingNum) {
            const isComp = h.isCompleted === undefined ? true : !!h.isCompleted;
            if (isComp) {
                // S.history에서 완성된 항목 중 몇 번째인지 계산
                const completeItems = S.history.filter(x => x.isCompleted === undefined || x.isCompleted === true);
                const completeIdx = completeItems.findIndex(x => x.id === h.id);
                UI.currentEditingNum.innerText = (completeIdx !== -1) ? `요청사항 ${String(completeIdx + 1).padStart(2, '0')}` : '';
            } else {
                UI.currentEditingNum.innerText = '';
            }
        }

        UI.saveReqBtn.innerText = "저장하기";

        UI.saveReqBtn.style.background = "#DD600B";

        // [추가] 추가 설명은 홈페이지 다른문제(isAsset) 일 때만 기입 가능
        if (UI.reqDescWrapper) UI.reqDescWrapper.style.display = h.isAsset ? 'block' : 'none';
        UI.reqDesc.disabled = !h.isAsset;
        UI.reqDesc.style.opacity = h.isAsset ? '1' : '0.5';
        UI.reqDesc.style.cursor = h.isAsset ? 'text' : 'not-allowed';

        updateSaveBtnState();

        // [추가] 모든 필드 구성이 끝난 시점에 줌 상태 재정의 (처음 진입 시 화면맞춤 안정성)
        setTimeout(() => { if (S.img) updateZoomMode(); }, 10);
    };

    // [추가] 편집 모드 진입 시 카테고리 버튼 상태 동기화
    S.currentCategory = h.isAsset ? 'asset' : (h.category || null);
    if (UI.catBtns) {
        UI.catBtns.forEach(b => b.classList.toggle('active', b.dataset.val === S.currentCategory));
    }

    if (h.isAsset) {
        enterAssetMode();
        S.selectedAssets = new Set(h.assets || []);
        UI.assetItems.forEach(i => i.classList.toggle('selected', S.selectedAssets.has(i.dataset.key)));

        // 뷰어 모드(이미지 없는 모드)에서 선택된 항목 리스트 즉시 갱신
        updateAssetSelectionUI();

        // [추가] 직접입력 필드 동기화 (Task 요청사항)
        const btnAssetDirect = document.getElementById('btnAssetDirect');
        if (btnAssetDirect) {
            const assetName = btnAssetDirect.querySelector('.asset-name');
            const directInput = btnAssetDirect.querySelector('.asset-direct-input');
            let directVal = "";
            S.selectedAssets.forEach(k => {
                if (k.startsWith('[직접입력]')) directVal = k.replace('[직접입력] ', '');
            });

            if (directVal) {
                assetName.innerText = directVal;
                directInput.value = directVal;
            } else {
                assetName.innerText = "직접 입력할게요";
                directInput.value = "";
            }
        }

        setupEditState();
    } else {
        if (S.isAssetMode) exitAssetMode();
        if (h.baseImgSrc) {
            loadImage(h.baseImgSrc, setupEditState);
        } else {
            S.img = null; S.baseImgSrc = null;
            UI.cWrap.style.display = 'none';
            if (UI.ctx) UI.ctx.clearRect(0, 0, S.w, S.h);
            setupEditState();
        }
    }
}


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
    const res = await SyncAPI.syncDocument(S.docId, S.editToken, historyJson);
    if (res.success && res.data && res.data.updated_at) {
        S.updatedAt = res.data.updated_at; // 수정 시각 실시간 갱신
    }
    return res;
}

/**
 * 개별 카드 증분 동기화 (Source of Truth)
 */
export async function syncItemToServer(h) {
    if (!S.docId || !S.editToken) return;
    const sortOrder = S.history.findIndex(x => x.id === h.id);
    const isCompleted = h.isCompleted === undefined ? true : !!h.isCompleted;

    // 1. 개별 카드 고속 저장 (안정도 높음)
    const res = await SyncAPI.syncItem(S.docId, S.editToken, h.id, JSON.stringify(h), isCompleted, sortOrder);
    if (res.success && res.data && res.data.updated_at) {
        S.updatedAt = res.data.updated_at; // 수정 시각 실시간 갱신
    }

    // 2. 레거시 블록 동기화 (필요시 백그라운드 병행)
    syncHistoryToServer().catch(err => console.error('Legacy Sync Failed:', err));

    return res;
}

/**
 * 개별 카드 증분 삭제
 */
export async function deleteItemFromServer(itemUuid) {
    if (!S.docId || !S.editToken) return;

    // 1. 개별 카드 삭제
    const res = await SyncAPI.deleteItem(S.docId, S.editToken, itemUuid);

    // 2. 레거시 블록 동기화 (전송량 무관하게 리스트 갱신 필요)
    syncHistoryToServer().catch(err => console.error('Legacy Sync Failed:', err));

    return res;
}

export function clearEditingState() {
    if (S.isAssetMode) {
        exitAssetMode();
    }

    // 상태 초기화
    S.editingHistoryId = null;
    S.editingOriginalData = null;
    S.img = null;
    S.baseImgSrc = null;
    S.annos = [];

    // UI 입력값 초기화
    UI.urlIn.value = '';
    UI.reqDesc.value = '';
    UI.saveReqBtn.innerText = "저장하기";
    UI.saveReqBtn.disabled = true;

    if (UI.catBtns) UI.catBtns.forEach(btn => btn.classList.remove('invalid-target'));

    // 메모 패널 및 리스트 초기화
    resetMemoPanel(false);
    updateAnnoListUI();

    // 캔버스 출력 초기화
    UI.cWrap.style.display = 'none';
    if (UI.ctx) UI.ctx.clearRect(0, 0, S.w, S.h);

    render();
    renderQueue();
    updateFooterVisibility();

    if (UI.currentEditingNum) UI.currentEditingNum.innerText = '';

    // [기본] 추가 설명 비활성화 및 숨김
    if (UI.reqDescWrapper) UI.reqDescWrapper.style.display = 'none';
    if (UI.reqDesc) {
        UI.reqDesc.disabled = true;
        UI.reqDesc.style.opacity = '0.5';
        UI.reqDesc.style.cursor = 'not-allowed';
    }

    // [추가] 직접입력 UI 초기화
    const btnAssetDirect = document.getElementById('btnAssetDirect');
    if (btnAssetDirect) {
        const assetName = btnAssetDirect.querySelector('.asset-name');
        const directInput = btnAssetDirect.querySelector('.asset-direct-input');
        if (assetName) assetName.innerText = "직접 입력할게요";
        if (directInput) directInput.value = "";
        btnAssetDirect.classList.remove('selected', 'input-mode');
        // 내부 요소들도 강제로 숨김 처리
        const directControls = btnAssetDirect.querySelector('.asset-direct-controls');
        if (assetName) assetName.style.display = 'block';
        if (directInput) directInput.style.display = 'none';
        if (directControls) directControls.style.display = 'none';
    }
}


export function isEditorDirty() {
    if (S.editingHistoryId) {
        // 수정 모드: 원본과 비교하여 변경 사항이 있는지 확인
        const orig = S.editingOriginalData;
        if (!orig) return false;

        const currentDesc = (UI.reqDesc.value || '').trim();
        const currentUrl = (UI.urlIn.value || '').trim();
        const currentCat = S.currentCategory || '';

        const descChanged = currentDesc !== (orig.desc || '').trim();
        const urlChanged = currentUrl !== (orig.url || '').trim();
        const catChanged = currentCat !== (orig.category || '');

        let contentChanged = false;
        if (S.isAssetMode) {
            const currentAssets = Array.from(S.selectedAssets).sort();
            const origAssets = Array.from(orig.assets || []).sort();
            contentChanged = JSON.stringify(currentAssets) !== JSON.stringify(origAssets);
        } else {
            const currentAnnosJson = JSON.stringify(S.annos);
            const origAnnosJson = JSON.stringify(orig.annos || []);
            contentChanged = (currentAnnosJson !== origAnnosJson);
        }

        return descChanged || urlChanged || catChanged || contentChanged;
    } else {
        // 신규 생성 모드: 최소한의 내용(설명 또는 이미지/자산선택)이 작성되었는지 확인
        if (S.isAssetMode) {
            return S.selectedAssets.size > 0 || UI.reqDesc.value.trim() !== '';
        } else {
            return (S.img && UI.cWrap.style.display !== 'none') || UI.reqDesc.value.trim() !== '' || S.annos.length > 0;
        }
    }
}

export function updateSaveBtnState() {
    const isDirty = isEditorDirty();

    // 설명, 메모, 자산 선택 중 하나라도 있어야 유효한 내용으로 간주 (Rule 024)
    let hasAnyContent = false;
    if (S.isAssetMode) {
        // [수정] 홈페이지 다른문제는 URL(필수) + 리스트(최소 1개) 조건 충족 시에만 저장 가능
        const hasUrl = UI.urlIn.value.trim() !== '';
        const hasSelectedAssets = S.selectedAssets.size > 0;
        hasAnyContent = hasUrl && hasSelectedAssets;
    } else {
        hasAnyContent = UI.reqDesc.value.trim() !== '' || S.annos.length > 0;
    }

    // [추가] URL 유효성 검사 (홈페이지 주소 형식 확인)
    const isValidUrl = (url) => {
        if (!url) return false;
        try {
            const trimUrl = url.trim();
            // 1. 프로토콜 구분자(://)가 포함되어 있다면 http, https만 허용
            if (trimUrl.includes('://')) {
                return /^(https?:\/\/)[^\s]+\.[^\s]+$/.test(trimUrl);
            }
            // 2. 프로토콜이 없다면 [텍스트].[텍스트] 형식 체크 (ftp:// 등 기타 프로토콜 방지)
            return /^[^\s]+\.[^\s]+$/.test(trimUrl);
        } catch (e) { return false; }
    };

    const urlValue = UI.urlIn.value.trim();
    const isUrlFilled = urlValue !== '';
    const isUrlValid = isValidUrl(urlValue);

    // [추가] URL 유효성 시각적 피드백 (인라인 대신 클래스 토글)
    if (S.isAssetMode) {
        if (isUrlFilled && !isUrlValid) {
            UI.urlIn.classList.add('invalid');
        } else {
            UI.urlIn.classList.remove('invalid');
        }
    } else {
        UI.urlIn.classList.remove('invalid'); // 일반 모드에서는 체크 안함 (기본적으로 빈 칸 허용)
    }

    // 변경 사항이 없거나 내용이 하나도 없으면 저장 버튼을 비활성화하여 UI 단에서 차단
    UI.saveReqBtn.disabled = !isDirty || !hasAnyContent || (S.isAssetMode && !isUrlValid);

    // [추가] 작업 중인 항목이 없을 때는 작업 취소 버튼도 비활성화
    if (UI.cancelEditBtn) {
        UI.cancelEditBtn.disabled = !S.editingHistoryId;
    }
}

let lastTab = null;

function updateCountsAndNumbers() {
    // 실시간 수량 계산
    const countComplete = S.history.filter(h => h.isCompleted === undefined || h.isCompleted === true).length;
    const countIncomplete = S.history.filter(h => h.isCompleted === false).length;

    if (UI.tabComplete && UI.tabIncomplete) {
        UI.tabComplete.innerText = `완성 요청 (${countComplete})`;
        UI.tabIncomplete.innerText = `작성중 (${countIncomplete})`;

        const isCompleteTab = S.currentHistoryTab === 'COMPLETE';
        const activeColor = 'var(--action-pink)';
        const inactiveColor = '#9ba3af';

        UI.tabComplete.style.color = isCompleteTab ? activeColor : inactiveColor;
        UI.tabComplete.style.background = isCompleteTab ? '#fff' : 'transparent';
        UI.tabComplete.style.boxShadow = isCompleteTab ? '0 2px 4px rgba(0,0,0,0.05)' : 'none';

        UI.tabIncomplete.style.color = !isCompleteTab ? activeColor : inactiveColor;
        UI.tabIncomplete.style.background = !isCompleteTab ? '#fff' : 'transparent';
        UI.tabIncomplete.style.boxShadow = !isCompleteTab ? '0 2px 4px rgba(0,0,0,0.05)' : 'none';
    }
    UI.queueCount.innerText = S.history.length + '건';

    // 탭 내의 카드 넘버링 다시 계산
    let completedCounter = 0;
    S.history.forEach(h => {
        const isComp = h.isCompleted === undefined || h.isCompleted === true;
        if (isComp) {
            completedCounter++;
            const card = document.querySelector(`.req-card[data-id="${h.id}"]`);
            if (card) {
                const label = card.querySelector('.card-label');
                if (label) label.innerText = `요청사항 ${String(completedCounter).padStart(2, '0')}`;

            }
        }
    });

    // 버튼 활성상태 업데이트
    const hasAnyComplete = S.history.some(h => h.isCompleted === undefined || h.isCompleted === true);
    UI.exportBtn.disabled = !hasAnyComplete;
    UI.shareBtn.disabled = !hasAnyComplete;
}

function createCardDOM(h) {
    const d = document.createElement('div');
    d.dataset.id = h.id;
    d.className = 'req-card' + (S.editingHistoryId === h.id ? ' editing' : '');
    const catMap = { text: '📝 내용 수정', layout: '📐 항목 추가', func: '🛠️ 기능 수정', image: '✨ 기능 개발' };

    // 이 시점의 h._idx를 사용하여 초기 라벨 설정
    const labelNum = h._idx ? `요청사항 ${String(h._idx).padStart(2, '0')}` : '작성중';

    const commonHeader = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <span class="card-label" style="font-size:14px; font-weight:800; color:${h.isCompleted === false ? '#9ca3af' : '#1e293b'}; letter-spacing:-0.5px;">${labelNum}</span>

            <div style="display:flex; gap:4px;">
                <button class="btn-delete-req" style="padding:4px 10px; font-size:10px; color:#ef4444; background:#fef2f2; border:1px solid #fee2e2; border-radius:6px; font-weight:700;">삭제</button>
            </div>
        </div>
    `;

    if (h.isAsset) {
        const assetList = (h.assets || []).map(a => `<div style="display:flex; align-items:center; gap:4px; font-size:11px; color:#666;"><span style="width:4px; height:4px; border-radius:50%; background:var(--action-pink);"></span>${ASSET_LABELS[a] || a}</div>`).join('');
        d.innerHTML = `
            ${commonHeader}
            <div style="display:flex; gap:6px; margin-bottom:8px;">
                <span class="tag tag-pink">🛠️ 홈페이지 다른 문제</span>


            </div>

            <div style="background:#f9fafb; border-radius:8px; padding:10px; margin-bottom:8px; border:1px solid #f3f4f6;">
                ${assetList}
            </div>
            ${h.desc ? `<div style="font-size:12px; color:#555; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; text-overflow:ellipsis; word-break:break-all;">${h.desc}</div>` : ''}
        `;
    } else {
        d.innerHTML = `
            ${commonHeader}
            <div style="display:flex; gap:6px; margin-bottom:8px;">
                ${h.category && catMap[h.category] ? `<span class="tag">${catMap[h.category]}</span>` : ''}
                ${h.annos.length > 0 ? `<span class="tag" style="background:#fff; border:1px solid #ddd; color:#64748b;">메모 ${h.annos.length}</span>` : ''}
                ${h.annos.some(a => a.img) ? `<span class="tag" style="background:#f5f3ff; border:1px solid #ddd6fe; color:#7c3aed; display:inline-flex; align-items:center; gap:2px;">📷 사진</span>` : ''}
            </div>
            ${h.thumb ? `<img src="${h.thumb}" style="width:100%; border-radius:8px; border:1px solid #eee; margin-bottom:8px; display:block;">` : ''}
            ${h.desc ? `<div style="font-size:12px; color:#555; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; text-overflow:ellipsis; word-break:break-all;">${h.desc}</div>` : ''}
        `;
    }

    d.onclick = () => enterEditMode(h);

    const deleteBtn = d.querySelector('.btn-delete-req');
    if (deleteBtn) {
        deleteBtn.onclick = async (e) => {
            e.stopPropagation();
            const isComp = h.isCompleted === undefined ? true : !!h.isCompleted;
            const msg = isComp ? "정말 요청사항을 삭제하시겠습니까?" : "작성중인 요청사항을 삭제하시겠습니까?";
            if (!confirm(msg)) return;

            // UI에서 즉시 제거 (부드러운 인터랙션)
            d.style.opacity = '0.5';
            d.style.pointerEvents = 'none';

            if (S.docId && S.editToken) {
                const urlsToDelete = [h.full, h.baseImgSrc, ...(h.annos || []).map(a => a.img)].filter(u => u && u.includes('/jaebong/uploads/'));
                if (urlsToDelete.length > 0) await SyncAPI.deleteFiles(S.docId, S.editToken, urlsToDelete);
            }

            S.history = S.history.filter(x => x.id !== h.id);
            if (S.editingHistoryId === h.id) clearEditingState();

            d.remove(); // DOM에서 즉시 삭제
            updateCountsAndNumbers(); // 수량 및 넘버링만 부분 업데이트

            GTM.push('request_item_delete', { request_item_id: h.id });
            await deleteItemFromServer(h.id);
        };
    }
    return d;
}

export function renderQueue(autoScroll = false) {
    const isCompleteTab = S.currentHistoryTab === 'COMPLETE';
    const tabChanged = isCompleteTab !== lastTab;
    lastTab = isCompleteTab;

    const prevScrollTop = tabChanged ? 0 : UI.reqList.scrollTop; // 탭 변경 시에는 상단으로, 아니면 위치 저장
    const frag = document.createDocumentFragment();

    // 필터링 및 넘버링 계산
    let completedCounter = 0;
    const computedHistory = S.history.map(h => {
        const isComp = h.isCompleted === undefined ? true : !!h.isCompleted;
        if (isComp) {
            completedCounter++;
            return { ...h, isCompleted: true, _idx: completedCounter };
        }
        return { ...h, isCompleted: false, _idx: null };
    });

    const displayItems = computedHistory.filter(h => h.isCompleted === isCompleteTab);

    if (displayItems.length === 0) {
        UI.reqList.innerHTML = `<div style="text-align:center; padding:50px 10px; color:#9ca3af; font-size:13px;">${isCompleteTab ? '작성완료된' : '작성중인'} 요청사항이 없습니다.</div>`;
        updateCountsAndNumbers();
        return;
    }

    displayItems.forEach(h => frag.appendChild(createCardDOM(h)));
    UI.reqList.replaceChildren(frag);
    updateCountsAndNumbers();

    // 완성 탭에서만 드래그 앤 드롭 정렬 활성화
    initSortable();

    // 스크롤 제어 (데이터 갱신 시 위치 뒤틀림 방지)
    if (autoScroll && S.history.length > 0) {
        setTimeout(() => {
            UI.reqList.scrollTop = UI.reqList.scrollHeight;
        }, 100);
    } else {
        UI.reqList.scrollTop = prevScrollTop;
        requestAnimationFrame(() => {
            UI.reqList.scrollTop = prevScrollTop;
        });
    }
}

let sortableInstance = null;
/**
 * 드래그 앤 드롭 정렬 초기화 (SortableJS)
 */
function initSortable() {
    if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
    }

    // 완성된 요청사항 탭에서만 드래그 가능하도록 설정
    const isCompleteTab = (S.currentHistoryTab === 'COMPLETE');
    if (!isCompleteTab || typeof Sortable === 'undefined') return;

    sortableInstance = new Sortable(UI.reqList, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        fallbackTolerance: 3, // 클릭 실수 방지
        scroll: true, // 드래그 중 자동 스크롤 활성화
        onEnd: async () => {
            const newOrderIds = Array.from(UI.reqList.children).map(el => el.dataset.id);
            if (newOrderIds.length === 0) return;

            // 1. S.history의 완성 아이템들을 DOM 순서대로 재배치
            const completeItems = S.history.filter(h => (h.isCompleted === true || h.isCompleted === undefined));
            const incompleteItems = S.history.filter(h => h.isCompleted === false);

            const reorderedComplete = newOrderIds.map(id => completeItems.find(h => String(h.id) === id)).filter(Boolean);

            // 2. 전체 히스토리 배열 갱신 (완성된 것들이 앞쪽으로 정렬되도록 구성 - DB sort_order 기준)
            S.history = [...reorderedComplete, ...incompleteItems];

            // UI 갱신 (넘버링 등 다시 그리기)
            renderQueue();

            // 3. 서버 일괄 동기화 (고속 배치 업데이트)
            if (S.docId && S.editToken) {
                const batchOrders = S.history.map((h, i) => ({
                    item_uuid: h.id,
                    sort_order: i
                }));
                const res = await SyncAPI.updateItemOrders(S.docId, S.editToken, batchOrders);
                console.log('[Sync] Batch Sort Orders updated:', res);
            }
        }
    });
}

export function initHistory() {
    UI.reqDesc.oninput = () => {
        updateSaveBtnState();
    };

    if (UI.urlIn) {
        UI.urlIn.oninput = () => {
            updateSaveBtnState();
        };
    }

    if (UI.tabComplete) {
        UI.tabComplete.onclick = () => {
            S.currentHistoryTab = 'COMPLETE';
            renderQueue();
        };
    }
    if (UI.tabIncomplete) {
        UI.tabIncomplete.onclick = () => {
            S.currentHistoryTab = 'INCOMPLETE';
            renderQueue();
        };
    }

    if (UI.btnOtherIssues) {
        UI.btnOtherIssues.onclick = async () => {
            const newItem = await addAssetHistory();
            showConfirm("작성 안내", "[🛠️ 홈페이지 다른 문제] 요청사항이 대기열에 추가되었습니다.<br>해당 요청사항을 바로 작성하시겠습니까?", () => {
                enterEditMode(newItem);
            });
        };
    }

    UI.saveReqBtn.onclick = async () => {
        // Validation: Check if there's any meaningful content
        const hasContent = UI.reqDesc.value.trim() !== '' || S.annos.length > 0 || (S.isAssetMode && S.selectedAssets.size > 0);
        if (!hasContent) {
            alert("내용이 없는 요청사항은 저장할 수 없습니다. 메모를 남기거나 요청 내용을 입력해 주세요.");
            return;
        }

        if (S.state === 'MEMO_WAIT' || S.state === 'EDITING') {
            if (!confirm("작성 중인 메모가 완료되지 않았습니다. 메모를 제외하고 이대로 리스트에 추가하시겠습니까?")) return;
            resetMemoPanel(false);
            render();
        }

        UI.saveReqBtn.innerText = "저장 중...";
        UI.saveReqBtn.disabled = true;

        const commonFields = {
            url: UI.urlIn.value,
            desc: UI.reqDesc.value.trim(),
            category: S.isAssetMode ? 'asset' : '',
            date: new Date().toLocaleTimeString(),
            isCompleted: true // 신규 또는 수정 시 기본적으로 '완성' 상태로 간주
        };

        let savedItemData = null;
        if (S.isAssetMode) {
            const data = {
                ...commonFields,
                id: S.editingHistoryId || Date.now(),
                thumb: null, full: null, baseImgSrc: null,
                annos: [],
                isAsset: true,
                assets: Array.from(S.selectedAssets),
                status: 'request'
            };

            if (S.editingHistoryId) {
                const idx = S.history.findIndex(x => x.id === S.editingHistoryId);
                const wasCompleted = S.history[idx] && (S.history[idx].isCompleted === undefined || S.history[idx].isCompleted === true);
                if (idx !== -1) S.history[idx] = data;

                if (wasCompleted) {
                    alert("수정 완료되었습니다.");
                } else {
                    alert("작성 완료되었습니다.");
                }
            } else {
                S.history.push(data);
                alert("작성 완료되었습니다.");
            }
            savedItemData = data;
        } else {
            // [개선] 대용량 사각형 포함 이미지 생성을 중단하고 원본을 사용함 (용량 절감)
            // 1. 원본 업로드 (Base64인 경우에만 업로드됨)
            const finalBase = await uploadBase64(S.baseImgSrc);

            // 2. 600px 썸네일 생성 (사각형 포함)
            const thumbCanvas = document.createElement('canvas');
            const tWidth = 600;
            const tHeight = Math.round(S.h * (tWidth / S.w));
            thumbCanvas.width = tWidth;
            thumbCanvas.height = tHeight;
            const tCtx = thumbCanvas.getContext('2d');

            // 이미지 그리기
            tCtx.drawImage(S.img, 0, 0, tWidth, tHeight);

            // 사각형/번호 뱃지 그리기 (canvas.js의 render 로직을 축소 적용)
            const sf = tWidth / S.w;
            const br = 18 * sf;
            const fs = 14 * sf;
            const lw = 2 * sf;

            S.annos.forEach((a, i) => {
                tCtx.strokeStyle = (a.img ? '#8b5cf6' : '#ef4444');
                tCtx.lineWidth = Math.max(1, lw);
                tCtx.strokeRect(a.rect.x * sf, a.rect.y * sf, a.rect.w * sf, a.rect.h * sf);

                // 번호 뱃지
                tCtx.fillStyle = (a.img ? '#8b5cf6' : '#ef4444');
                tCtx.beginPath();
                tCtx.arc(a.rect.x * sf, a.rect.y * sf, Math.max(5, br), 0, Math.PI * 2);
                tCtx.fill();

                tCtx.fillStyle = '#fff';
                tCtx.font = `bold ${Math.max(8, fs)}px sans-serif`;
                tCtx.textAlign = 'center';
                tCtx.textBaseline = 'middle';
                tCtx.fillText(String(i + 1).padStart(2, '0'), a.rect.x * sf, a.rect.y * sf);
            });
            const thumbB64 = thumbCanvas.toDataURL('image/jpeg', 0.7);
            const finalThumb = await uploadBase64(thumbB64);

            const annosCopy = JSON.parse(JSON.stringify(S.annos));
            for (let a of annosCopy) {
                if (a.img && a.img.startsWith('data:image')) {
                    a.img = await uploadBase64(a.img);
                }
            }

            const itemData = {
                ...commonFields,
                id: S.editingHistoryId || Date.now(),
                full: finalBase,     // 사각형 포함 이미지 대신 원본 사용
                thumb: finalThumb,  // 300px 경량 썸네일만 저장
                baseImgSrc: finalBase,
                annos: annosCopy,
                isAsset: false,
                assets: [],
                status: 'request'
            };

            if (S.editingHistoryId) {
                // [개선] 기존 썸네일 파일 삭제 (용량 확보) - 단, 원본(baseImgSrc)과 썸네일이 다른 파일일 때만 삭제
                const oldItem = S.history.find(x => x.id === S.editingHistoryId);
                const wasCompleted = oldItem && (oldItem.isCompleted === undefined || oldItem.isCompleted === true);

                if (oldItem && oldItem.thumb &&
                    oldItem.thumb !== finalThumb &&
                    oldItem.thumb !== oldItem.baseImgSrc && // ⭐ 원본 이미지 보호: 썸네일과 원본이 같으면 삭제 금지
                    oldItem.thumb.includes('/jaebong/uploads/')) {
                    SyncAPI.deleteFiles(S.docId, S.editToken, [oldItem.thumb]).catch(e => console.error('Old thumb delete failed:', e));
                }

                const idx = S.history.findIndex(x => x.id === S.editingHistoryId);
                if (idx !== -1) S.history[idx] = itemData;

                if (wasCompleted) {
                    alert("수정 완료되었습니다.");
                } else {
                    alert("작성 완료되었습니다.");
                }
            } else {
                S.history.push(itemData);
                alert("작성 완료되었습니다.");
            }
            savedItemData = itemData;
        }

        // UI Reset
        clearEditingState();
        S.img = null;
        S.baseImgSrc = null;
        S.annos = [];
        updateAnnoListUI(); // [추가] 메모 리스트 UI 초기화
        UI.reqDesc.value = '';
        UI.urlIn.value = '';
        UI.cWrap.style.display = 'none';
        if (UI.ctx) UI.ctx.clearRect(0, 0, S.w, S.h);

        S.currentCategory = null;
        if (UI.catBtns) UI.catBtns.forEach(b => b.classList.remove('active'));

        render();
        S.currentHistoryTab = 'COMPLETE';
        renderQueue(true);

        if (S.docId && S.editToken && savedItemData) {
            await syncItemToServer(savedItemData);
        }

        UI.saveReqBtn.innerText = "저장하기";

        updateFooterVisibility();
        updateSaveBtnState();
    };

    UI.cancelEditBtn.onclick = () => {
        if (confirm("수정을 취소하시겠습니까?")) {
            clearEditingState();
            S.img = null;
            S.baseImgSrc = null;
            UI.cWrap.style.display = 'none';
            if (UI.ctx) UI.ctx.clearRect(0, 0, S.w, S.h);
            UI.urlIn.value = '';
            UI.reqDesc.value = '';
            S.annos = [];
            S.currentCategory = null;
            if (UI.catBtns) UI.catBtns.forEach(b => b.classList.remove('active'));
            render();
            updateAnnoListUI();
            updateFooterVisibility();
            updateSaveBtnState();

        }
    };

    UI.btnResetAll.onclick = async () => {
        if (!confirm("모든 요청사항을 초기화하시겠습니까? (서버 이미지 포함)")) return;
        if (S.docId && S.editToken) await SyncAPI.cleanupDocument(S.docId, S.editToken);
        S.history = [];
        clearEditingState();
        S.img = null;
        S.annos = [];
        UI.reqDesc.value = '';
        UI.urlIn.value = '';
        UI.cWrap.style.display = 'none';
        render();
        updateFooterVisibility();
        updateSaveBtnState();
        renderQueue();
        if (S.docId && S.editToken) await syncHistoryToServer();
    };
}
