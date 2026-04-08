/**
 * @file canvas.js
 * @description 메인 캔버스 (워크 스페이스) 제어, 좌표계산, 드로잉, 박스 생성 및 메모 작성을 처리하는 코어 모듈
 */
import { S, COLORS, ASSET_LABELS, IMG_ICON } from '../store/state.js';
import { UI } from '../store/elements.js';
import { openMemoImageModal } from './viewer.js';
import { updateSaveBtnState, uploadBase64 } from './history.js';
import { GTM } from '../util/gtm.js';

function setLock(locked) {
    const list = [UI.step1Panel, UI.annoList, UI.reqDesc ? UI.reqDesc.parentElement : null, UI.centerFooter];
    list.forEach(el => {
        if (el) el.classList.toggle('locked-ui', locked);
    });
}

function isMemoDirty() {
    // 1. 신규 드래프트 상태인 경우
    if (S.state === 'MEMO_WAIT' && S.draftRect) {
        return UI.memoInput.value.trim() !== '' || !!S.memoImg;
    }
    // 2. 기존 메모 수정 중인 경우
    if (!S.activeAnnoId || !S.originalAnnoState) return false;
    const a = S.annos.find(x => x.id === S.activeAnnoId);
    if (!a) return false;

    const textChanged = UI.memoInput.value.trim() !== S.originalAnnoState.text;
    const rectChanged = a.rect.x !== S.originalAnnoState.rect.x ||
        a.rect.y !== S.originalAnnoState.rect.y ||
        a.rect.w !== S.originalAnnoState.rect.w ||
        a.rect.h !== S.originalAnnoState.rect.h;
    const imgChanged = S.memoImg !== S.originalAnnoState.img;

    return textChanged || rectChanged || imgChanged;
}

export function updateFooterVisibility() {
    if (!UI.centerActionRow) return;
    UI.centerActionRow.style.opacity = '1';
    UI.centerActionRow.style.pointerEvents = 'auto';
    updateZoomUI();
}

export function updateZoomUI() {
    if (!UI.zoomControls) return;
    const isImageMode = !!S.img && !S.isAssetMode;
    UI.zoomControls.style.display = isImageMode ? 'flex' : 'none';

    if (isImageMode) {
        if (UI.zoomRange) UI.zoomRange.value = S.zoom;
        if (UI.zoomPct) {
            UI.zoomPct.innerText = (S.isFitMode ? '100' : S.zoom) + '%';
        }


        // [핵심] 실제 화면에 출력될 배율 (화면맞춤 스케일을 기준으로 계산)
        const actualScale = S.fitScale * (S.zoom / 100);

        // 캔버스 크기 업데이트
        UI.cWrap.style.width = (S.w * actualScale) + 'px';
        UI.cWrap.style.height = (S.h * actualScale) + 'px';
        render(); // 줌 비율에 따른 핸들 크기 조절 등을 위해 다시 그림
    }
}



export function generateQR(url) {
    // QR 생성 로직 완전 제거 (Task 002 반영)
    return;
}

export function enterAssetMode() {
    S.isAssetMode = true;
    S.img = null;
    S.baseImgSrc = null;
    S.annos = [];
    S.selectedAssets.clear();
    UI.assetItems.forEach(i => i.classList.remove('selected'));

    UI.cWrap.style.display = 'block';
    UI.cWrap.style.width = '100%';
    UI.cWrap.style.height = '100%';
    UI.cWrap.style.maxWidth = 'none';
    UI.cWrap.style.minHeight = '0';
    UI.cWrap.style.margin = '0';
    UI.cWrap.style.boxShadow = 'none';
    UI.scrollContainer.style.padding = '0';
    UI.scrollContainer.style.cursor = 'default';
    UI.scrollContainer.style.padding = '0';
    UI.scrollContainer.style.cursor = 'default';
    if (UI.normalSubtitleWrapper) UI.normalSubtitleWrapper.style.display = 'none';


    UI.urlIn.value = ''; // 신규 자산 요청 시 초기화

    UI.canvas.style.display = 'none';
    UI.assetModeOverlay.style.display = 'flex'; // 중앙 정렬을 위해 flex 사용
    UI.minimapContainer.style.display = 'none';
    UI.btnAttachMemoImg.style.display = 'none'; // 자산 모드 숨김
    UI.annoList.style.display = 'none';           // 자산 모드 숨김

    if (UI.guideText) UI.guideText.style.display = 'none';
    updateFooterVisibility();

    UI.reqDesc.placeholder = `선택한 문제 상황에 대한 상세 내용을 입력해 주세요.
예시) 갑자기 홈페이지 접속이 안 됩니다, 관리자 비밀번호를 잊어버렸습니다, 사이트를 다른 서버로 옮기고 싶습니다.`;
    if (UI.reqDescWrapper) UI.reqDescWrapper.style.display = 'block';
    UI.reqDesc.disabled = false;
    UI.reqDesc.style.opacity = '1';
    UI.reqDesc.style.cursor = 'text';

    updateAssetSelectionUI();
    render();
}

export function updateAssetSelectionUI() {
    if (!UI.assetSelectionList) return;
    UI.assetSelectionList.innerHTML = '';
    if (S.selectedAssets.size === 0) {
        if (UI.assetSelectionEmpty) {
            UI.assetSelectionEmpty.style.display = 'block';
            UI.assetSelectionList.appendChild(UI.assetSelectionEmpty);
        }
        return;
    }
    if (UI.assetSelectionEmpty) UI.assetSelectionEmpty.style.display = 'none';

    S.selectedAssets.forEach(key => {
        const item = document.createElement('div');
        item.style.cssText = 'display:flex; align-items:center; gap:8px; font-size:13px; color:#334155; background:#fff; padding:8px 12px; border-radius:8px; border:1px solid #e2e8f0;';
        item.innerHTML = `<span style="width:6px; height:6px; background:var(--action-pink); border-radius:50%;"></span>${ASSET_LABELS[key] || key}`;
        UI.assetSelectionList.appendChild(item);
    });

    // [추가] 직접입력 버튼의 활성화(selected) 상태 제어 (Task 요청사항)
    const btnAssetDirect = document.getElementById('btnAssetDirect');
    if (btnAssetDirect) {
        let hasDirect = false;
        S.selectedAssets.forEach(k => {
            if (k.startsWith('[직접입력]')) hasDirect = true;
        });
        btnAssetDirect.classList.toggle('selected', hasDirect);
    }
}


export function exitAssetMode() {
    S.isAssetMode = false;
    S.selectedAssets.clear();
    UI.assetItems.forEach(i => i.classList.remove('selected'));
    UI.assetModeOverlay.style.display = 'none';
    UI.canvas.style.display = 'block';
    UI.btnAttachMemoImg.style.display = 'block';
    UI.annoList.style.display = 'block';

    // 스타일 초기화 (이미지 로드 시 재설정됨)
    UI.cWrap.style.width = '';
    UI.cWrap.style.maxWidth = '';
    UI.cWrap.style.height = '';
    UI.cWrap.style.minHeight = '';
    UI.cWrap.style.margin = '';
    UI.cWrap.style.boxShadow = '';
    UI.scrollContainer.style.padding = '';
    UI.scrollContainer.style.cursor = '';
    UI.scrollContainer.style.padding = '';
    UI.scrollContainer.style.cursor = '';
    if (UI.normalSubtitleWrapper) UI.normalSubtitleWrapper.style.display = 'block';


    UI.urlIn.value = ''; // 일반 모드 복귀 시 초기화

    if (!S.img) {
        UI.cWrap.style.display = 'none';
    }
    if (UI.guideText) UI.guideText.style.display = 'block';
    updateFooterVisibility();
    UI.reqDesc.value = ''; // 작성 내용 파기
    UI.reqDesc.placeholder = `이 페이지에 대한 전체적인 참고사항을 입력하세요.
예시) 이미지는 추후 전달드리겠습니다, 이미지 직접 구해서 수정 부탁드립니다, www.susunzip.com 해당 레퍼런스 참고하여 디자인 리뉴얼 부탁드립니다.`;
    if (UI.reqDescWrapper) UI.reqDescWrapper.style.display = 'none';
    UI.reqDesc.disabled = true;
    UI.reqDesc.style.opacity = '0.5';
    UI.reqDesc.style.cursor = 'not-allowed';

    // [추가] 자산 모드 종료 시 카테고리도 초기화
    S.currentCategory = null;
    if (UI.catBtns) UI.catBtns.forEach(b => b.classList.remove('active'));

    resetMemoPanel(false);
}

export function resetMemoPanel(autoSave) {
    if (S.activeAnnoId) {
        if (autoSave) {
            const a = S.annos.find(x => x.id === S.activeAnnoId);
            if (a) a.text = UI.memoInput.value.trim();
        } else if (S.originalAnnoState) {
            const a = S.annos.find(x => x.id === S.activeAnnoId);
            if (a) {
                a.rect = { ...S.originalAnnoState.rect };
                a.text = S.originalAnnoState.text;
                a.img = S.originalAnnoState.img;
            }
        }
    }
    S.state = 'IDLE';
    S.draftRect = null;
    S.activeAnnoId = null;
    S.originalAnnoState = null;
    setLock(false);
    UI.memoPanel.classList.remove('active');
    UI.guideText.style.display = 'block';
    UI.memoInput.value = '';
    S.memoImg = null;
    UI.memoImgPreview.src = '';
    UI.memoImgPreviewArea.style.display = 'none';
    updateAnnoListUI();
}

export function openEditPanel(id) {
    resetMemoPanel(true); // 기존 수정 건이 있다면 자동 저장
    S.activeAnnoId = id;
    const anno = S.annos.find(a => a.id === id);
    if (!anno) return;
    S.originalAnnoState = { rect: { ...anno.rect }, text: anno.text, img: anno.img };
    setLock(true);
    UI.guideText.style.display = 'none';
    UI.memoPanel.classList.add('active');
    UI.memoPanelTitle.innerText = "메모 수정";
    UI.confirmMemoBtn.innerText = "수정 완료";
    UI.deleteMemoBtn.style.display = 'block';
    UI.memoInput.value = anno.text;
    if (anno.img) {
        S.memoImg = anno.img;
        UI.memoImgPreview.src = anno.img;
        UI.memoImgPreviewArea.style.display = 'block';
    } else {
        S.memoImg = null;
        UI.memoImgPreview.src = '';
        UI.memoImgPreviewArea.style.display = 'none';
    }
    GTM.push('memo_edit', { request_item_id: id });
    updateAnnoListUI();
    render();
}

export function updateAnnoListUI() {
    UI.annoList.innerHTML = '';
    S.annos.forEach((a, i) => {
        const el = document.createElement('div');
        el.className = 'anno-item' + (S.activeAnnoId === a.id ? ' selected' : '');
        
        // [수정] 클릭 이벤트 타겟 분리를 위해 클래스(memo-img-btn) 부여
        const imgIcon = a.img ? `<span class="memo-img-btn" style="color:#8b5cf6; margin-left:6px; display:inline-flex; align-items:center; gap:4px; cursor:zoom-in;">${IMG_ICON}<span style="font-size:11px; font-weight:normal;">첨부이미지 크게보기</span></span>` : '';
        
        el.innerHTML = `<div class="anno-badge">${String(i + 1).padStart(2, '0')}</div><div class="anno-text">${a.text}${imgIcon}</div>`;
        
        // 전체 클릭 시에는 기존처럼 편집 패널 오픈
        el.onclick = () => { resetMemoPanel(true); openEditPanel(a.id); };
        
        // [추가] 이미지 아이콘 클릭 시에는 편집 패널 대신 보조 팝업 오픈 (Rule 028 반영)
        if (a.img) {
            const imgBtn = el.querySelector('.memo-img-btn');
            if (imgBtn) {
                imgBtn.onclick = (e) => {
                    e.stopPropagation();
                    openMemoImageModal(a.img, "작성 중", i + 1, a.text);
                };
            }
        }
        
        UI.annoList.appendChild(el);
    });
    updateSaveBtnState();
}

export function render(isExport = false) {
    if (!S.img) {
        if (typeof renderMinimap === 'function') renderMinimap();
        return;
    }
    const ctx = UI.ctx;
    ctx.clearRect(0, 0, S.w, S.h);
    ctx.drawImage(S.img, 0, 0);
    const sf = isExport ? 1 : 1 / (S.fitScale * (S.zoom / 100));
    const br = 18 * sf; // 반지름 18px로 상향
    const fs = 14 * sf; // 폰트 크기도 14px로 상향
    const lw = 2 * sf;
    const boxColor = COLORS.box;
    // 1st Pass: Draw all rectangle borders ONLY
    S.annos.forEach((a, i) => {
        const active = S.activeAnnoId === a.id && !isExport;
        ctx.strokeStyle = active ? COLORS.draft : (a.img ? COLORS.purple : boxColor);
        ctx.lineWidth = lw;

        if (active) {
            ctx.fillStyle = 'rgba(59,130,246,0.1)';
            ctx.fillRect(a.rect.x, a.rect.y, a.rect.w, a.rect.h);
        }

        // 선이 배지(원) 영역에 침범하지 않도록 경로를 끊어서 그림
        ctx.beginPath();
        // 상단 선 (왼쪽에서 br만큼 떨어진 지점부터 오른쪽 끝까지)
        ctx.moveTo(a.rect.x + br, a.rect.y);
        ctx.lineTo(a.rect.x + a.rect.w, a.rect.y);
        // 우측 선
        ctx.lineTo(a.rect.x + a.rect.w, a.rect.y + a.rect.h);
        // 하단 선
        ctx.lineTo(a.rect.x, a.rect.y + a.rect.h);
        // 좌측 선 (하단에서 위로 올라오되, 상단에서 br만큼 떨어진 지점까지만)
        ctx.lineTo(a.rect.x, a.rect.y + br);
        ctx.stroke();
    });

    // 2nd Pass: Draw all point badges (Circles + Numbers) on top of all lines
    S.annos.forEach((a, i) => {
        const active = S.activeAnnoId === a.id && !isExport;

        // 원 배지 그리기
        ctx.fillStyle = active ? COLORS.draft : (a.img ? COLORS.purple : boxColor);
        ctx.beginPath();
        ctx.arc(a.rect.x, a.rect.y, br, 0, Math.PI * 2);
        ctx.fill();

        // 배지 테두리 (선택 시 강조)
        if (active) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2 * sf;
            ctx.stroke();
        }

        // 숫자 텍스트
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${fs}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1).padStart(2, '0'), a.rect.x, a.rect.y + (1 * sf));
    });

    if (S.draftRect && !isExport) {
        if (S.state === 'MEMO_WAIT' || S.state === 'EDITING_DRAFT') {
            ctx.fillStyle = 'rgba(59,130,246,0.1)';
            ctx.fillRect(S.draftRect.x, S.draftRect.y, S.draftRect.w, S.draftRect.h);
        }
        ctx.strokeStyle = COLORS.draft;
        ctx.lineWidth = lw;
        ctx.setLineDash([8 * sf, 8 * sf]);
        ctx.beginPath();
        ctx.strokeRect(S.draftRect.x, S.draftRect.y, S.draftRect.w, S.draftRect.h);
        ctx.setLineDash([]);
    }
    // QR 코드 그리기 렌더 파트 삭제 (Task 002)
    renderMinimap();
}

function renderMinimap() {
    if (!UI.minimapContainer) return;
    if (!S.img || UI.cWrap.style.display === 'none') {
        UI.minimapContainer.style.display = 'none';
        return;
    }

    UI.minimapContainer.style.display = 'block';

    const sc = UI.scrollContainer;
    const mc = UI.minimapContainer;
    const mCanvas = UI.minimapCanvas;
    const mCtx = UI.minimapCtx;
    const mViewport = UI.minimapViewport;
    const mi = UI.minimapInner;

    // [개선] 스크롤 전체 영역(Padding 포함)을 기준으로 미니맵 비율 계산
    const fullW = sc.scrollWidth;
    const fullH = sc.scrollHeight;

    const mapWidth = 150;
    const mapHeight = mapWidth * (fullH / fullW);

    mCanvas.width = mapWidth;
    mCanvas.height = mapHeight;

    const scale = mapWidth / fullW;

    mCtx.clearRect(0, 0, mapWidth, mapHeight);

    // 1. 메인 이미지 그리기 (중앙 정렬 및 패딩 등 실측 위치 반영)
    const rectC = UI.cWrap.getBoundingClientRect();
    const rectS = sc.getBoundingClientRect();

    // 스크롤 내부의 실제 상대 좌표 계산
    const relX = rectC.left - rectS.left + sc.scrollLeft;
    const relY = rectC.top - rectS.top + sc.scrollTop;

    const imgX = relX * scale;
    const imgY = relY * scale;
    const imgW = UI.cWrap.offsetWidth * scale;
    const imgH = UI.cWrap.offsetHeight * scale;
    mCtx.drawImage(S.img, imgX, imgY, imgW, imgH);

    // 2. 메모 박스 그리기
    const actualScale = UI.cWrap.offsetWidth / S.w; // Natural -> DOM Scale
    S.annos.forEach(a => {
        const ax = imgX + (a.rect.x * actualScale * scale);
        const ay = imgY + (a.rect.y * actualScale * scale);
        const aw = a.rect.w * actualScale * scale;
        const ah = a.rect.h * actualScale * scale;
        mCtx.fillStyle = 'rgba(239, 68, 68, 0.7)';
        mCtx.fillRect(ax, ay, aw, ah);
    });

    // 3. 뷰포트 (현재 보이는 영역) 표시
    const viewW = sc.clientWidth;
    const viewH = sc.clientHeight;

    mViewport.style.width = (viewW * scale) + 'px';
    mViewport.style.height = (viewH * scale) + 'px';
    mViewport.style.left = (sc.scrollLeft * scale) + 'px';
    mViewport.style.top = (sc.scrollTop * scale) + 'px';

    // 4. 미니맵 자체 스크롤 동기화 (내부 translate 보정)
    const maxScrollY = Math.max(0, fullH - viewH);
    const scrollPctY = maxScrollY > 0 ? (sc.scrollTop / maxScrollY) : 0;
    const maxMinimapScrollY = Math.max(0, mapHeight - mc.clientHeight);
    const innerTop = -(scrollPctY * maxMinimapScrollY);

    if (mi) {
        mi.style.transform = `translateY(${innerTop}px)`;
    }
}

export function initCanvas() {
    UI.catBtns.forEach(btn => {
        btn.onclick = () => {
            const targetVal = btn.dataset.val;

            // 자산 모드 전환/복구 관련 정책 적용 (Task 014)
            if (targetVal === 'asset' && !S.isAssetMode) {
                // 일반 -> 자산 전환
                if (S.img || S.annos.length > 0 || UI.reqDesc.value.trim() !== '') {
                    if (!confirm("자산 관련 요청으로 전환하시겠습니까? 작성 중인 내용(이미지, 메모 포함)이 모두 파기됩니다.")) return;
                }
                enterAssetMode();
            } else if (targetVal !== 'asset' && S.isAssetMode) {
                // 자산 -> 일반 전환
                if (S.selectedAssets.size > 0 || UI.reqDesc.value.trim() !== '') {
                    if (!confirm("일반 요청으로 전환하시겠습니까? 선택한 자산 항목과 작성된 내용이 모두 파기됩니다.")) return;
                }
                exitAssetMode();
            }

            UI.catBtns.forEach(b => {
                b.classList.remove('active');
                b.classList.remove('invalid-target');
            });
            btn.classList.add('active');
            S.currentCategory = targetVal;
            updateSaveBtnState();
        };
    });

    // 자산 아이템 토글 (Task 014)
    if (UI.assetItems) {
        UI.assetItems.forEach(item => {
            item.onclick = () => {
                const key = item.dataset.key;
                if (!key) return; // 직접입력 버튼 등 dataset-key가 없는 경우는 별도 처리

                if (S.selectedAssets.has(key)) {
                    S.selectedAssets.delete(key);
                    item.classList.remove('selected');
                } else {
                    S.selectedAssets.add(key);
                    item.classList.add('selected');
                }
                updateAssetSelectionUI();
                updateSaveBtnState();
            };
        }
        );

        // --- 직접입력 아이템 로직 (Task 요청사항) ---
        const btnAssetDirect = document.getElementById('btnAssetDirect');
        if (btnAssetDirect) {
            const assetName = btnAssetDirect.querySelector('.asset-name');
            const directInput = btnAssetDirect.querySelector('.asset-direct-input');
            const directControls = btnAssetDirect.querySelector('.asset-direct-controls');
            const btnDelete = btnAssetDirect.querySelector('.delete');
            const btnCancel = btnAssetDirect.querySelector('.cancel');
            const btnConfirm = btnAssetDirect.querySelector('.confirm');

            btnAssetDirect.addEventListener('click', () => {
                if (btnAssetDirect.classList.contains('input-mode')) return;

                btnAssetDirect.classList.add('input-mode');
                assetName.style.display = 'none';
                directInput.style.display = 'block';
                directControls.style.display = 'flex';

                // [추가] 리스트에 이미 직접입력 항목이 있다면 '삭제' 버튼 노출 (Task 요청사항)
                let hasDirect = false;
                S.selectedAssets.forEach(k => { if (k.startsWith('[직접입력]')) hasDirect = true; });
                btnDelete.style.display = hasDirect ? 'block' : 'none';

                directInput.focus();
            });

            btnDelete.onclick = (e) => {
                e.stopPropagation();
                if (!confirm("입력하신 직접입력 항목을 삭제하시겠습니까?")) return;

                // 1. S.selectedAssets에서 제거
                S.selectedAssets.forEach(k => {
                    if (k.startsWith('[직접입력]')) S.selectedAssets.delete(k);
                });

                // 2. UI 초기화
                directInput.value = '';
                assetName.innerText = "직접 입력할게요";

                // 3. 갱신
                updateAssetSelectionUI();
                updateSaveBtnState();

                // 4. 입력 모드 종료
                btnAssetDirect.classList.remove('input-mode');
                assetName.style.display = 'block';
                directInput.style.display = 'none';
                directControls.style.display = 'none';
            };

            btnCancel.onclick = (e) => {
                e.stopPropagation();
                btnAssetDirect.classList.remove('input-mode');
                assetName.style.display = 'block';
                directInput.style.display = 'none';
                directControls.style.display = 'none';

                // 취소 시에는 마지막으로 확인된(S.selectedAssets에 있는) 값으로 다시 복원하여 '유지'
                let lastVal = "";
                S.selectedAssets.forEach(k => {
                    if (k.startsWith('[직접입력]')) lastVal = k.replace('[직접입력] ', '');
                });
                if (lastVal) directInput.value = lastVal;
                else directInput.value = ''; // 등록된 게 아예 없었다면 비움
            };

            btnConfirm.onclick = (e) => {
                e.stopPropagation();
                const val = directInput.value.trim();
                if (val) {
                    // [핵심] 기존의 모든 '[직접입력]' 항목을 찾아서 제거 (단일 항목 유지)
                    S.selectedAssets.forEach(k => {
                        if (k.startsWith('[직접입력]')) {
                            S.selectedAssets.delete(k);
                        }
                    });

                    const finalKey = `[직접입력] ${val}`;
                    S.selectedAssets.add(finalKey);

                    updateAssetSelectionUI();
                    updateSaveBtnState();

                    // 입력 모드만 종료하고 input 값은 그대로 둡니다 (다음 수정 시 유지)
                    btnAssetDirect.classList.remove('input-mode');
                    assetName.innerText = val; // 버튼 겉면 텍스트도 입력값으로 변경 시각화
                    assetName.style.display = 'block';
                    directInput.style.display = 'none';
                    directControls.style.display = 'none';
                } else {
                    // 비어있으면 그냥 취소 처리
                    btnCancel.click();
                }
            };

            directInput.onkeydown = (e) => {
                if (e.key === 'Enter') btnConfirm.click();
                if (e.key === 'Escape') btnCancel.click();
            };
        }
    }

    // --- 메모 이미지 첨부 로직 ---
    UI.btnAttachMemoImg.onclick = () => UI.memoFileIn.click();
    UI.memoFileIn.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            S.memoImg = ev.target.result;
            UI.memoImgPreview.src = S.memoImg;
            UI.memoImgPreviewArea.style.display = 'block';
        };
        reader.readAsDataURL(file);
        UI.memoFileIn.value = ''; // 재선택 가능하도록 초기화
    };
    UI.btnDelMemoImg.onclick = () => {
        S.memoImg = null;
        UI.memoImgPreview.src = '';
        UI.memoImgPreviewArea.style.display = 'none';
    };

    UI.urlIn.addEventListener('input', (e) => {
        updateSaveBtnState();
    });

    // --- 미니맵 인터랙션 구현 ---
    if (UI.minimapContainer) {
        let isDraggingMap = false;

        UI.scrollContainer.addEventListener('scroll', () => {
            if (!isDraggingMap) renderMinimap();
        });

        const updateScrollFromMinimap = (e) => {
            const mc = UI.minimapContainer;
            const sc = UI.scrollContainer;

            const rect = mc.getBoundingClientRect();
            const yInContainer = e.clientY - rect.top;
            const xInContainer = e.clientX - rect.left;

            const fullW = sc.scrollWidth;
            const fullH = sc.scrollHeight;
            const mapWidth = 150;
            const mapHeight = mapWidth * (fullH / fullW);
            const scale = mapWidth / fullW;

            // 4. 미니맵 자체 스크롤 보정값 (renderMinimap과 동일 로직)
            const viewH = sc.clientHeight;
            const maxScrollY = Math.max(0, fullH - viewH);
            const scrollPctY = maxScrollY > 0 ? (sc.scrollTop / maxScrollY) : 0;
            const maxMinimapScrollY = Math.max(0, mapHeight - mc.clientHeight);
            const currentInnerTop = -(scrollPctY * maxMinimapScrollY);

            // Container 기준 클릭 Y를 Canvas 기준 Y로 매핑
            const yOnMap = yInContainer - currentInnerTop;
            const xOnMap = xInContainer;

            // 맵 좌표를 스크롤 좌표로 변환
            sc.scrollTop = (yOnMap / scale) - (sc.clientHeight / 2);
            sc.scrollLeft = (xOnMap / scale) - (sc.clientWidth / 2);

            renderMinimap();
        };

        UI.minimapContainer.addEventListener('mousedown', (e) => {
            isDraggingMap = true;
            updateScrollFromMinimap(e);
        });

        window.addEventListener('mousemove', (e) => {
            if (isDraggingMap) updateScrollFromMinimap(e);
        });

        window.addEventListener('mouseup', () => {
            isDraggingMap = false;
        });
    }

    function getPos(e) {
        const r = UI.canvas.getBoundingClientRect();
        const sx = S.w / r.width;
        const sy = S.h / r.height;
        return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
    }

    function hitCheck(p, rect) {
        const actualScale = S.fitScale * (S.zoom / 100);
        const tol = 12 / actualScale;
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
        if (!S.img || S.isAssetMode) {
            UI.scrollContainer.style.cursor = 'default';
            return;
        }
        const p = getPos(e);

        // 1. 이미지 범위를 벗어나면 기본 커서 (패딩 영역 등)
        let cursor = (p.x < 0 || p.x > S.w || p.y < 0 || p.y > S.h) ? 'default' : 'crosshair';

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
        if ((S.state === 'EDITING' || S.state === 'EDITING_DRAFT') && S.action) {
            const isDraft = S.state === 'EDITING_DRAFT';
            const rect = isDraft ? S.draftRect : S.annos.find(a => a.id === S.activeAnnoId)?.rect;
            if (!rect) return;

            if (S.action === 'move') {
                const dx = p.x - S.dragStart.x;
                const dy = p.y - S.dragStart.y;

                // [개선] 드래그 임계값 체크 (5px 미만은 무시하여 클릭 시 미세한 이동 방지)
                if (!S.isActualDrag) {
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist > 5) S.isActualDrag = true;
                }

                if (S.isActualDrag) {
                    rect.x += dx;
                    rect.y += dy;
                    S.dragStart = p;
                }
            } else {
                if (S.fixedPos.x !== null) {
                    rect.x = Math.min(p.x, S.fixedPos.x);
                    rect.w = Math.abs(p.x - S.fixedPos.x);
                }
                if (S.fixedPos.y !== null) {
                    rect.y = Math.min(p.y, S.fixedPos.y);
                    rect.h = Math.abs(p.y - S.fixedPos.y);
                }
            }
            render();
            return;
        }
        if (S.activeAnnoId) {
            const a = S.annos.find(x => x.id === S.activeAnnoId);
            if (a) {
                const hit = hitCheck(p, a.rect);
                if (hit) cursor = (hit === 'move' ? 'pointer' : hit + '-resize');
            }
        } else if (S.state === 'MEMO_WAIT' && S.draftRect) {
            const hit = hitCheck(p, S.draftRect);
            if (hit) cursor = (hit === 'move' ? 'pointer' : hit + '-resize');
        } else {
            const h = [...S.annos].reverse().find(a => p.x >= a.rect.x && p.x <= a.rect.x + a.rect.w && p.y >= a.rect.y && p.y <= a.rect.y + a.rect.h);
            if (h) cursor = 'pointer';
        }
        UI.canvas.style.cursor = cursor;
    };

    UI.canvas.onmousedown = (e) => {
        if (!S.img || S.isAssetMode) return;
        const p = getPos(e);

        const initEdit = (hit, rect, state) => {
            S.state = state;
            S.action = hit;
            S.dragStart = p;
            S.isActualDrag = false; // 플래그 초기화
            S.fixedPos = { x: null, y: null };
            if (hit !== 'move') {
                if (hit.includes('w')) S.fixedPos.x = rect.x + rect.w;
                else if (hit.includes('e')) S.fixedPos.x = rect.x;
                if (hit.includes('n')) S.fixedPos.y = rect.y + rect.h;
                else if (hit.includes('s')) S.fixedPos.y = rect.y;
            }
        };

        // 1. 이미 활성화된 메모가 있는 경우 (기존 항목 수정 중)
        if (S.activeAnnoId) {
            const a = S.annos.find(x => x.id === S.activeAnnoId);
            if (a) {
                const hit = hitCheck(p, a.rect);
                if (hit) {
                    initEdit(hit, a.rect, 'EDITING');
                    return;
                }
            }
            // 영역 밖을 클릭한 경우: 수정 사항이 있는지 체크
            if (isMemoDirty()) {
                return; // 수정 사항이 있으면 잠금 유지 및 무시
            } else {
                resetMemoPanel(false); // 수정 사항 없으면 즉시 취소하고 아래 로직(신규 등) 진행
            }
        }

        // 2. 새 메모 생성 대기 중인 경우 (드래프트)
        if (S.state === 'MEMO_WAIT' && S.draftRect) {
            const hit = hitCheck(p, S.draftRect);
            if (hit) {
                initEdit(hit, S.draftRect, 'EDITING_DRAFT');
                return;
            }
            // 영역 밖 클릭 시: 텍스트 입력 여부 체크
            if (isMemoDirty()) {
                return;
            } else {
                resetMemoPanel(false); // 아무것도 안 적었으면 그냥 취소하고 아래 로직 진행
            }
        }

        // 3. 아무것도 활성화되지 않은 경우에만 신규 선택이나 드로잉 허용
        const clicked = [...S.annos].reverse().find(a => p.x >= a.rect.x && p.x <= a.rect.x + a.rect.w && p.y >= a.rect.y && p.y <= a.rect.y + a.rect.h);
        if (clicked) {
            resetMemoPanel(true);
            openEditPanel(clicked.id);
            // [개선] 첫 클릭 시에는 선택만 하고 이동(initEdit)은 하지 않음
            // 이미 선택된 상태에서의 클릭은 Case 1에서 처리됨
            render();
            return;
        }

        resetMemoPanel(true);
        S.activeAnnoId = null;
        S.state = 'DRAWING';
        S.dragStart = p;
        S.draftRect = { x: p.x, y: p.y, w: 0, h: 0 };
        GTM.push('box_draw_start');
        render();
    };
    window.onmouseup = (e) => {
        if (S.state === 'DRAWING') {
            if (S.draftRect && S.draftRect.w > 1 && S.draftRect.h > 1) {
                S.state = 'MEMO_WAIT';
                setLock(true);
                UI.guideText.style.display = 'none';
                UI.memoPanel.classList.add('active');
                UI.memoPanelTitle.innerText = "새 메모 작성";
                UI.confirmMemoBtn.innerText = "확인";
                UI.deleteMemoBtn.style.display = 'none';
                UI.memoInput.value = '';
                UI.memoInput.focus();
                GTM.push('box_draw_complete', {
                    box_width: Math.round(S.draftRect.w),
                    box_height: Math.round(S.draftRect.h)
                });
                GTM.push('memo_create_start');
            } else {
                S.state = 'IDLE';
                S.draftRect = null;
            }
        } else if (S.state === 'EDITING' || S.state === 'EDITING_DRAFT') {
            if (S.state === 'EDITING_DRAFT') {
                S.state = 'MEMO_WAIT';
            } else {
                S.state = 'IDLE';
            }
            S.action = null;
        }
        render();
    };

    UI.confirmMemoBtn.onclick = async () => {
        const txt = UI.memoInput.value.trim();
        if (!txt) {
            alert("메모를 입력하세요.");
            UI.memoInput.focus();
            return;
        }

        const isNew = !S.activeAnnoId;
        GTM.push('memo_create_complete', {
            memo_length: txt.length,
            has_image: !!S.memoImg,
            is_new: isNew
        });

        // 이미지가 Base64인 경우 서버에 즉시 업로드 (새로고침 시 누락 방지 및 싱크 최적화)
        let finalImg = S.memoImg;
        if (S.memoImg && S.memoImg.startsWith('data:image')) {
            UI.confirmMemoBtn.innerText = "업로드 중...";
            UI.confirmMemoBtn.disabled = true;
            finalImg = await uploadBase64(S.memoImg);
            UI.confirmMemoBtn.disabled = false;
            UI.confirmMemoBtn.innerText = "확인";
        }

        if (S.activeAnnoId) {
            const a = S.annos.find(x => x.id === S.activeAnnoId);
            if (a) {
                a.text = txt;
                a.img = finalImg;
            }
        } else {
            S.annos.push({ id: Date.now(), rect: { ...S.draftRect }, text: txt, img: finalImg });
        }
        S.originalAnnoState = null; // 확인 버튼 클릭 시에는 복원 방지
        resetMemoPanel(false);
        updateAnnoListUI();
        render();
    };

    UI.deleteMemoBtn.onclick = () => {
        if (confirm("삭제하시겠습니까?")) {
            S.annos = S.annos.filter(a => a.id !== S.activeAnnoId);
            GTM.push('memo_delete', { memo_id: S.activeAnnoId });
            resetMemoPanel(false);
            updateAnnoListUI();
            render();
        }
    };

    UI.cancelMemoBtn.onclick = () => {
        resetMemoPanel(false);
        render();
    };

    // --- 줌 컨트롤 이벤트 바인딩 ---
    if (UI.zoomRange) {
        UI.zoomRange.oninput = () => {
            S.isFitMode = false; // 수동 변경 시 폭맞춤 해제
            S.zoom = parseInt(UI.zoomRange.value);
            updateZoomUI();
        };
    }
    if (UI.btnZoomIn) {
        UI.btnZoomIn.onclick = () => {
            S.isFitMode = false; // 수동 변경 시 화면맞춤 해제
            S.zoom = Math.min(200, Math.floor(S.zoom / 10) * 10 + 10);
            updateZoomUI();
        };
    }
    if (UI.btnZoomOut) {
        UI.btnZoomOut.onclick = () => {
            S.isFitMode = false; // 수동 변경 시 화면맞춤 해제
            S.zoom = Math.max(50, Math.ceil(S.zoom / 10) * 10 - 10);
            updateZoomUI();
        };
    }

    if (UI.zoomPct) {
        UI.zoomPct.onclick = () => {
            // 폭맞춤 토글
            S.isFitMode = !S.isFitMode;
            // imageLoader.js의 updateZoomMode를 비동기 호출 (순환 참조 방지 등을 위해 직접 사용 권장)
            import('../utils/imageLoader.js').then(m => m.updateZoomMode());
        };
    }
    // 마우스 휠 줌 (Ctrl 키 조합)
    UI.scrollContainer.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            S.isFitMode = false; // 수동 변경 시 화면맞춤 해제
            const delta = -e.deltaY;
            const factor = delta > 0 ? 10 : -10;
            S.zoom = Math.max(50, Math.min(200, S.zoom + factor));
            updateZoomUI();
        }
    }, { passive: false });


    updateFooterVisibility(); // 초기화 단계에서 호출
}

