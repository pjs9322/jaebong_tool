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
        const catMap = {
            text: '내용 수정(이미지, 타이포)',
            layout: '레이아웃 / 항목 추가',
            func: '기능 수정 및 오류 개선',
            image: '기능 개발 (신규 기능)'
        };

        for (let i = 0; i < S.history.length; i++) {
            const h = S.history[i];
            if (i > 0) doc.addPage();
            const memos = h.annos.map((a, idx) => `<div style="margin-bottom:8px; font-size:14px; line-height:1.6; display:flex; gap:8px;"><div style="font-weight:800; color:var(--action-pink); min-width:20px; color:#f43f5e;">[${idx + 1}]</div><div>${a.text}</div></div>`).join('');

            let basicInfo = '';
            if (i === 0) basicInfo = `
                <div style="margin-bottom:30px; border:1px solid #e5e7eb; background:#f9fafb; padding:20px; border-radius:8px; display:flex; gap:20px;">
                    <div style="flex:1;"><strong>[의뢰인 정보]</strong><br>업체명 : 컴퓨타수선집<br>담당자 : 박준성</div>
                    <div style="flex:1;"><strong>[홈페이지 정보]</strong><br>URL : ${h.url || '-'}<br>호스팅 : AWS</div>
                </div>`;

            tempDiv.innerHTML = `
                <div style="padding:40px; font-family:-apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif;">
                    <div style="border-bottom:2px solid #111; padding-bottom:10px; margin-bottom: 20px;">
                        <h1 style="font-size: 28px; font-weight: 900; letter-spacing:-1px; margin:0 0 8px 0;">홈페이지 유지보수 의뢰서</h1>
                        <div style="font-size:14px; color:#666;">페이지 (${i + 1}/${S.history.length}) · 작성일: ${new Date().toLocaleDateString()}</div>
                    </div>
                    ${basicInfo}
                    <div style="display:flex; gap:30px; border-bottom:1px solid #eee; padding-bottom:40px; margin-bottom:10px;">
                        <div style="flex:1; display:flex; flex-direction:column; gap:16px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-size:12px; font-weight:800; color:#fff; background:#111; padding:6px 12px; border-radius:4px;">#${i + 1}. ${catMap[h.category].split(' ').slice(1).join(' ')}</span>
                            </div>
                            <div style="font-size:13px; color:#555; background:#f3f4f6; padding:10px; border-radius:6px; display:flex; align-items:center; gap:8px;">
                                <span>🔗</span> <span style="font-weight:600; color:#000;">${h.url || 'URL 없음'}</span>
                            </div>
                            <div style="background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:16px; box-shadow:0 2px 4px rgba(0,0,0,0.02)">
                                <div style="font-size:12px; font-weight:800; color:#888; margin-bottom:10px;">상세 메모</div>
                                ${memos || '<div style="color:#aaa; font-size:14px;">등록된 메모가 없습니다.</div>'}
                            </div>
                            <div style="margin-top:10px; font-size:14px; color:#333; background:#fff1f2; padding:16px; border-radius:8px; border:1px solid #fecdd3;">
                                <strong>💡 추가 요청사항:</strong><br>${h.desc || "없음"}
                            </div>
                        </div>
                        ${h.full ? `
                        <div style="width:400px; flex-shrink:0;">
                            <div style="border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; background:#000; box-shadow:0 4px 10px rgba(0,0,0,0.1);">
                                <img src="${h.full}" style="width:100%; display:block;">
                            </div>
                            <div style="margin-top:10px; text-align:right;"><img src="${getQrBase64(h.url)}" width="50" style="padding:6px; background:#fff; border-radius:6px; box-shadow:0 4px 12px rgba(0,0,0,0.15)"></div>
                        </div>` : ''}
                    </div>
                </div>`;

            const canvas = await html2canvas(tempDiv, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            const imgHeight = (canvas.height * 210) / canvas.width;
            doc.addImage(imgData, 'JPEG', 0, 0, 210, imgHeight);
        }
        document.body.removeChild(tempDiv);
        doc.save('의뢰서.pdf');
        UI.exportBtn.innerText = "PDF 다운로드";
    };
}
