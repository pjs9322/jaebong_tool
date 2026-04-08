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
    UI.sharePopupLayer = document.getElementById('sharePopupLayer');
    UI.captureLayer = document.getElementById('captureLayer');
    UI.captureStatusText = document.getElementById('captureStatusText');
    UI.btnCancelCapture = document.getElementById('btnCancelCapture');

    UI.editorBtns = document.getElementById('editorBtns');
    UI.viewerBtns = document.getElementById('viewerBtns');
    UI.backToEditBtn = document.getElementById('backToEditBtn');

    // =========================================================
    // 🏷️ 2. Top Header Buttons
    // =========================================================
    UI.exportBtn = document.getElementById('exportBtn');
    UI.shareBtn = document.getElementById('shareLinkBtn');
    UI.maintUrlIn = document.getElementById('maintUrlIn');
    UI.btnStartShare = document.getElementById('btnStartShare');

    UI.cntIncomplete = document.getElementById('cntIncomplete');
    UI.cntComplete = document.getElementById('cntComplete');
    UI.cntAsset = document.getElementById('cntAsset');
    UI.cntTotal = document.getElementById('cntTotal');

    UI.btnResetAll = document.getElementById('btnResetAll');
    UI.btnShowTutorial = document.getElementById('btnShowTutorial');
    UI.topMessage = document.getElementById('topMessage');
    UI.normalSubtitleWrapper = document.getElementById('normalSubtitleWrapper');

    // =========================================================
    // 📂 3. STEP 01 - Image Upload
    // =========================================================
    UI.urlCaptureIn = document.getElementById('urlCaptureIn');
    UI.btnScreenCapture = document.getElementById('btnScreenCapture');
    UI.btnUrlCapture = document.getElementById('btnUrlCapture');
    UI.btnOpenImg = document.getElementById('btnOpenImg');
    UI.btnOtherIssues = document.getElementById('btnOtherIssues');
    UI.step1Panel = document.getElementById('step1Panel');
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
    UI.canvasControls = document.querySelector('.canvas-controls');
    UI.centerActionRow = document.getElementById('centerActionRow');
    UI.centerFooter = document.querySelector('.center-footer');
    UI.zoomControls = document.getElementById('zoomControls');
    UI.zoomRange = document.getElementById('zoomRange');
    UI.btnZoomIn = document.getElementById('btnZoomIn');
    UI.btnZoomOut = document.getElementById('btnZoomOut');
    UI.zoomPct = document.getElementById('zoomPct');


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
    UI.catAssetBtn = document.getElementById('catAssetBtn');
    UI.assetModeOverlay = document.getElementById('assetModeOverlay');
    UI.assetItems = document.querySelectorAll('.asset-item');

    // =========================================================
    // 💾 7. Save / Edit Controls
    // =========================================================
    UI.reqDesc = document.getElementById('reqDesc');
    UI.reqDescWrapper = document.getElementById('reqDescWrapper');
    UI.assetSelectionList = document.getElementById('assetSelectionList');
    UI.assetSelectionEmpty = document.getElementById('assetSelectionEmpty');
    UI.saveReqBtn = document.getElementById('saveReqBtn');
    UI.cancelEditBtn = document.getElementById('cancelEditBtn');
    UI.currentEditingNum = document.getElementById('currentEditingNum');


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

    UI.btnAttachMemoImg = document.getElementById('btnAttachMemoImg');
    UI.memoFileIn = document.getElementById('memoFileIn');
    UI.memoImgPreviewArea = document.getElementById('memoImgPreviewArea');
    UI.memoImgPreview = document.getElementById('memoImgPreview');
    UI.btnDelMemoImg = document.getElementById('btnDelMemoImg');

    UI.annoList = document.getElementById('annoList');

    // =========================================================
    // 📚 9. History Queue
    // =========================================================
    UI.reqList = document.getElementById('reqList');
    UI.queueCount = document.getElementById('queueCount');
    UI.tabComplete = document.getElementById('tabComplete');
    UI.tabIncomplete = document.getElementById('tabIncomplete');

    // =========================================================
    // 📄 10. Viewer Mode
    // =========================================================
    UI.viewContentArea = document.getElementById('viewContentArea');
    UI.viewDate = document.getElementById('viewDate');
    
    // Viewer UI Elements (Popups, Overlays)
    UI.imageModalViewer = document.getElementById('imageModalViewer');
    UI.viewerModalImg = document.getElementById('viewerModalImg');
    UI.closeViewerModal = document.getElementById('closeViewerModal');
    UI.viewerAnnoOverlay = document.getElementById('viewerAnnoOverlay');
    UI.viewerMemoTooltip = document.getElementById('viewerMemoTooltip');
    UI.viewerMobileBottomSheet = document.getElementById('viewerMobileBottomSheet');
    UI.btnCloseSheet = document.getElementById('btnCloseSheet');
    UI.viewerSheetContent = document.getElementById('viewerSheetContent');
    
    // 🖼️ Memo Image Detail Modal (Secondary)
    UI.memoImageModal = document.getElementById('memoImageModal');
    UI.memoModalImg = document.getElementById('memoModalImg');
    UI.closeMemoImageModal = document.getElementById('closeMemoImageModal');
    UI.memoModalHeader = document.getElementById('memoModalHeader');

    // =========================================================
    // 💬 11. Chat System (PRO)
    // =========================================================
    UI.chatList = document.getElementById('chatList');
    UI.chatInput = document.getElementById('chatInput');
    UI.btnSendChat = document.getElementById('btnSendChat');

    UI.viewMaintInfo = document.getElementById('viewMaintInfo');
    UI.viewMaintUrlBold = document.getElementById('viewMaintUrlBold');
    UI.viewTotalCountBold = document.getElementById('viewTotalCountBold');

    // =========================================================
    // 🔔 11-1. Custom Confirm Modal
    // =========================================================
    UI.confirmModal = document.getElementById('confirmModal');
    UI.confirmModalTitle = document.getElementById('confirmModalTitle');
    UI.confirmModalDesc = document.getElementById('confirmModalDesc');
    UI.btnConfirmOk = document.getElementById('btnConfirmOk');
    UI.btnConfirmCancel = document.getElementById('btnConfirmCancel');

    // =========================================================
    // 🎓 12. Tutorial Overlay (LITE)
    // =========================================================
    UI.tutOverlay = document.getElementById('tutorialOverlay');
    UI.tutBg = document.getElementById('tutorialBg');
    UI.tutSpot = document.getElementById('tutSpot');
    UI.tutCard = document.getElementById('tutCard');
    UI.tutStep = document.getElementById('tutStep');
    UI.tutTitle = document.getElementById('tutTitle');
    UI.tutDesc = document.getElementById('tutDesc');
    UI.tutNext = document.getElementById('tutNext');
    UI.tutPrev = document.getElementById('tutPrev');
    UI.tutSkip = document.getElementById('tutSkip');
    UI.introOverlay = document.getElementById('introOverlay');
    UI.btnStartTutorial = document.getElementById('btnStartTutorial');
    UI.btnSkipTutorial = document.getElementById('btnSkipTutorial');
}
