/**
 * @file elements.js
 * @description 어플리케이션 전역에서 사용되는 DOM 엘리먼트들을 참조하고 캐싱하는 모듈
 */
export const UI = {};

export function initUI() {
    // =========================================================
    // 🧭 1. Layer / Mode Switching
    // =========================================================
    UI.editorLayer = document.getElementById('editorLayer');
    UI.viewerLayer = document.getElementById('viewerLayer');
    UI.loadingLayer = document.getElementById('loadingLayer');
    UI.captureLayer = document.getElementById('captureLayer');
    UI.captureStatusText = document.getElementById('captureStatusText');

    UI.editorBtns = document.getElementById('editorBtns');
    UI.viewerBtns = document.getElementById('viewerBtns');
    UI.backToEditBtn = document.getElementById('backToEditBtn');

    // =========================================================
    // 🏷️ 2. Top Header Buttons
    // =========================================================
    UI.exportBtn = document.getElementById('exportBtn');
    UI.shareBtn = document.getElementById('shareLinkBtn');
    UI.btnResetAll = document.getElementById('btnResetAll');
    UI.btnShowTutorial = document.getElementById('btnShowTutorial');
    UI.topMessage = document.getElementById('topMessage');

    // =========================================================
    // 📂 3. STEP 01 - Image Upload
    // =========================================================
    UI.urlCaptureIn = document.getElementById('urlCaptureIn');
    UI.btnScreenCapture = document.getElementById('btnScreenCapture');
    UI.btnUrlCapture = document.getElementById('btnUrlCapture');
    UI.btnOpenImg = document.getElementById('btnOpenImg');
    UI.fileIn = document.getElementById('fileIn');

    // =========================================================
    // 🖼️ 4. STEP 02 - Canvas Core
    // =========================================================
    UI.canvas = document.getElementById('mainCanvas');
    UI.minimapContainer = document.getElementById('minimapContainer');
    UI.minimapInner = document.getElementById('minimapInner');
    UI.minimapCanvas = document.getElementById('minimapCanvas');
    UI.minimapViewport = document.getElementById('minimapViewport');
    UI.minimapCtx = UI.minimapCanvas ? UI.minimapCanvas.getContext('2d') : null;
    UI.ctx = UI.canvas ? UI.canvas.getContext('2d') : null;
    UI.cWrap = document.getElementById('canvasWrapper');
    UI.scrollContainer = document.getElementById('scrollContainer');
    UI.btnZoom = document.getElementById('toggleZoomBtn');

    // =========================================================
    // 🔗 5. URL + QR System
    // =========================================================
    UI.urlIn = document.getElementById('urlIn');
    UI.qrVis = document.getElementById('qrVis');
    UI.qrHidden = document.getElementById('qrHidden');

    // =========================================================
    // 🏷️ 6. Category Buttons
    // =========================================================
    UI.catBtns = document.querySelectorAll('.cat-btn');

    // =========================================================
    // 💾 7. Save / Edit Controls
    // =========================================================
    UI.reqDesc = document.getElementById('reqDesc');
    UI.saveReqBtn = document.getElementById('saveReqBtn');
    UI.cancelEditBtn = document.getElementById('cancelEditBtn');

    // =========================================================
    // 📝 8. Memo System
    // =========================================================
    UI.guideText = document.getElementById('guideText');

    UI.memoPanel = document.getElementById('memoPanel');
    UI.memoPanelTitle = document.getElementById('memoPanelTitle');
    UI.memoInput = document.getElementById('memoInput');

    UI.confirmMemoBtn = document.getElementById('confirmMemoBtn');
    UI.cancelMemoBtn = document.getElementById('cancelMemoBtn');
    UI.deleteMemoBtn = document.getElementById('deleteMemoBtn');

    UI.annoList = document.getElementById('annoList');

    // =========================================================
    // 📚 9. History Queue
    // =========================================================
    UI.reqList = document.getElementById('reqList');
    UI.queueCount = document.getElementById('queueCount');

    // =========================================================
    // 📄 10. Viewer Mode
    // =========================================================
    UI.viewContentArea = document.getElementById('viewContentArea');
    UI.viewDate = document.getElementById('viewDate');

    // =========================================================
    // 💬 11. Chat System (PRO)
    // =========================================================
    UI.chatList = document.getElementById('chatList');
    UI.chatInput = document.getElementById('chatInput');
    UI.btnSendChat = document.getElementById('btnSendChat');

    // =========================================================
    // 🎓 12. Tutorial Overlay (LITE)
    // =========================================================
    UI.tutOverlay = document.getElementById('tutorialOverlay');
    UI.tutSpot = document.getElementById('tutSpot');
    UI.tutCard = document.getElementById('tutCard');
    UI.tutStep = document.getElementById('tutStep');
    UI.tutTitle = document.getElementById('tutTitle');
    UI.tutDesc = document.getElementById('tutDesc');
    UI.tutNext = document.getElementById('tutNext');
    UI.tutSkip = document.getElementById('tutSkip');
}
