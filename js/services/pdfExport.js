/**
 * @file pdfExport.js
 * @description 작성 완료된 히스토리 리스트를 기반으로 PDF 형식의 의뢰서를 생성 및 다운로드하는 서비스 모듈 (html2canvas, jsPDF 활용)
 */
import { S } from '../store/state.js';
import { UI } from '../store/elements.js';

function getQrBase64(text) {
    if (!text) return '';
    const div = document.createElement('div');
    new QRCode(div, { text, width: 80, height: 80 });
    return div.querySelector('canvas').toDataURL();
}

export function initPdfExport() {
    UI.exportBtn.onclick = async () => {
        UI.exportBtn.innerText = "생성 중...";
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.width = '794px';
        tempDiv.style.background = '#fff';
        document.body.appendChild(tempDiv);
        const completedHistory = S.history.filter(h => !!h.isCompleted);
        const total = completedHistory.length;

        const catMap = {
            text: '내용 수정(이미지, 타이포)',
            layout: '레이아웃 / 항목 추가',
            func: '기능 수정 및 오류 개선',
            image: '기능 개발 (신규 기능)',
            asset: '사이트 인프라 (호스팅, 도메인)'
        };

        for (let i = 0; i < total; i++) {
            const h = completedHistory[i];
            if (i > 0) doc.addPage();
            
            const memos = h.annos.map((a, idx) => `<div style="margin-bottom:8px; font-size:14px; line-height:1.6; display:flex; gap:8px;"><div style="font-weight:800; color:#f43f5e; min-width:20px;">[${String(idx + 1).padStart(2, '0')}]</div><div>${a.text}</div></div>`).join('');

            let basicInfo = '';
            if (i === 0) basicInfo = `
                <div style="margin-bottom:30px; border:1px solid #e5e7eb; background:#f9fafb; padding:20px; border-radius:8px; display:flex; gap:20px;">
                    <div style="flex:1;"><strong style="color:#111;">[의뢰인 정보]</strong><br>업체명 : 컴퓨타수선집<br>담당자 : 박준성</div>
                    <div style="flex:1;"><strong style="color:#111;">[홈페이지 정보]</strong><br>URL : ${h.url || '-'}<br>호스팅 : AWS</div>
                </div>`;

            const catLabel = catMap[h.category] || '기타 요청';
            
            // 자산 항목인 경우 상세 목록 생성
            const assetListHtml = h.isAsset ? (h.assets || []).map(a => `<div style="margin-bottom:4px; font-size:13px; color:#444;">• ${ASSET_LABELS[a] || a}</div>`).join('') : '';

            tempDiv.innerHTML = `
                <div style="padding:40px; font-family:-apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif; background:#fff;">
                    <div style="border-bottom:2px solid #111; padding-bottom:12px; margin-bottom: 24px; display:flex; justify-content:space-between; align-items:flex-end;">
                        <div>
                            <h1 style="font-size: 32px; font-weight: 900; letter-spacing:-1.5px; margin:0 0 4px 0; color:#111;">홈페이지 유지보수 의뢰서</h1>
                            <div style="font-size:14px; color:#6b7280;">작성일: ${(() => {
                                const d = new Date();
                                const yyyy = d.getFullYear();
                                const mm = String(d.getMonth() + 1).padStart(2, '0');
                                const dd = String(d.getDate()).padStart(2, '0');
                                return `${yyyy}. ${mm}. ${dd}.`;
                            })()}</div>
                        </div>
                        <div style="font-size:16px; font-weight:700; color:#111;">PAGE ${String(i + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</div>
                    </div>
                    ${basicInfo}
                    <div style="display:flex; gap:30px; border-bottom:1px solid #f3f4f6; padding-bottom:40px; margin-bottom:10px;">
                        <div style="flex:1; display:flex; flex-direction:column; gap:20px;">
                            <div>
                                <span style="font-size:13px; font-weight:800; color:#fff; background:#f43f5e; padding:6px 14px; border-radius:6px; box-shadow:0 2px 4px rgba(244,63,94,0.2);">요청사항 ${String(i + 1).padStart(2, '0')}. ${catLabel}</span>
                            </div>
                            <div style="font-size:14px; color:#4b5563; background:#f8fafc; padding:12px 16px; border-radius:8px; border:1px solid #e2e8f0; display:flex; align-items:center; gap:8px;">
                                <span style="font-size:18px;">🔗</span> <span style="font-weight:700; color:#1e293b;">${h.url || 'URL 정보 없음'}</span>
                            </div>
                            
                            ${h.isAsset ? `
                            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:18px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05)">
                                <div style="font-size:13px; font-weight:800; color:#64748b; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
                                    <span style="width:8px; height:8px; border-radius:50%; background:#f43f5e;"></span> 이슈 항목 선택
                                </div>
                                ${assetListHtml}
                            </div>
                            ` : `
                            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:18px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05)">
                                <div style="font-size:13px; font-weight:800; color:#64748b; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
                                    <span style="width:8px; height:8px; border-radius:50%; background:#f43f5e;"></span> 상세 메모 내역
                                </div>
                                ${memos || '<div style="color:#94a3b8; font-size:14px;">등록된 메모가 없습니다.</div>'}
                            </div>
                            `}

                            <div style="margin-top:4px; font-size:14px; color:#334155; background:#fff1f2; padding:20px; border-radius:10px; border:1px solid #fecdd3; line-height:1.6;">
                                <div style="font-weight:900; color:#e11d48; margin-bottom:8px; font-size:13px;">💡 요청사항 추가설명</div>
                                <div style="white-space:pre-wrap;">${h.desc || "상세 설명이 없습니다."}</div>
                            </div>
                        </div>
                        ${h.full ? `
                        <div style="width:380px; flex-shrink:0;">
                            <div style="border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; background:#f8fafc; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
                                <img src="${h.full}" style="width:100%; display:block; object-fit:contain;">
                            </div>
                            <div style="margin-top:16px; display:flex; justify-content:flex-end;"><img src="${getQrBase64(h.url)}" width="60" style="padding:8px; background:#fff; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.1); border:1px solid #f1f5f9;"></div>
                        </div>` : ''}
                    </div>
                </div>`;

            const canvas = await html2canvas(tempDiv, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            const imgHeight = (canvas.height * 210) / canvas.width;
            doc.addImage(imgData, 'JPEG', 0, 0, 210, imgHeight);
        }
        document.body.removeChild(tempDiv);
        doc.save('의뢰서.pdf');
        UI.exportBtn.innerText = "PDF 다운로드";
    };
}
