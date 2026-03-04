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
            const memos = h.annos.map((a, idx) => `<div style="margin-bottom:6px;"><strong>[${idx + 1}]</strong> ${a.text}</div>`).join('');

            let basicInfo = '';
            if (i === 0) basicInfo = `
                <div style="margin-bottom:30px; border:1px solid #000; padding:20px; display:flex; gap:20px;">
                    <div style="flex:1;"><strong>[의뢰인 정보]</strong><br>업체명 : 컴퓨타수선집<br>담당자 : 박준성</div>
                    <div style="flex:1;"><strong>[홈페이지 정보]</strong><br>URL : ${h.url || '-'}<br>호스팅 : AWS</div>
                </div>`;

            tempDiv.innerHTML = `
                <div style="padding:40px; font-family:sans-serif;">
                    <h1 style="border-bottom:2px solid #000; padding-bottom:10px;">유지보수 의뢰서 (${i + 1}/${S.history.length})</h1>
                    ${basicInfo}
                    <div style="display:flex; gap:20px; margin-top:20px;">
                        <div style="flex:1;">
                            <div style="background:#eee; padding:10px; font-weight:bold; margin-bottom:10px;">${catMap[h.category]}</div>
                            <div><strong>URL:</strong> ${h.url}</div>
                            <div style="margin-top:10px;">${memos}</div>
                            <div style="margin-top:20px; border-top:1px dashed #ccc; padding-top:10px;"><strong>추가 요청:</strong> ${h.desc}</div>
                        </div>
                        <div style="width:340px; text-align:right;">
                            <img src="${h.full}" style="max-width:100%; border:1px solid #ccc;">
                            <div style="margin-top:10px;"><img src="${getQrBase64(h.url)}" width="50"></div>
                        </div>
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
