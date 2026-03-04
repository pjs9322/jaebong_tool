<!doctype html>
<html lang="ko">

<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>재봉툴 PRO v13 · Card Layout Final</title>

  <script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>

  <style>
    /* ✨ 디자인 시스템: Card Layout + Black/Pink Theme */
    :root {
      --bg: #f3f4f6;
      /* 전체 배경 (쿨그레이) */
      --card-bg: #ffffff;
      /* 카드 배경 */
      --bd: #e5e7eb;
      /* 테두리 */
      --text: #111827;
      /* 메인 텍스트 */
      --text-muted: #6b7280;

      --primary: #000000;
      /* 메인 블랙 */
      --mint-bg: #d1fae5;
      /* 카테고리 배경 민트 */
      --action-pink: #f43f5e;
      /* 포인트 핑크 */

      /* 💡 카드형 디자인을 위한 깊은 그림자 */
      --shadow-card: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    }

    * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", Roboto, sans-serif;
    }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* --- Top Bar --- */
    .topbar {
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 32px;
      background: #fff;
      z-index: 20;
      border-bottom: 1px solid var(--bd);
      flex-shrink: 0;
      /* 높이 고정 */
    }

    .logo-area {
      position: relative;
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 900;
      font-size: 20px;
      letter-spacing: -0.5px;
    }

    .logo-area img {
      width: 250px;
    }

    .logo-area .beta01 {
      position: absolute;
      right: 0;
      top: 0;
      color: var(--action-pink);
      font-weight: 700;
      font-size: 16px;
      transform: translate(50%, -25%);
    }

    .top-msg {
      font-size: 14px;
      font-weight: 700;
      color: var(--text);
    }

    .top-btns {
      display: flex;
      gap: 8px;
    }

    /* --- LAYERS --- */
    .layer {
      display: none;
      flex: 1;
      overflow: hidden;
    }

    .layer.active {
      display: flex;
    }

    /* --- 💡 WORKSPACE: CARD LAYOUT --- */
    .workspace {
      flex: 1;
      display: grid;
      grid-template-columns: 300px 1fr 340px;
      /* 3단 컬럼 */
      gap: 20px;
      /* 💡 카드 사이의 간격 */
      padding: 24px;
      /* 💡 전체 화면 테두리 여백 */
      overflow: hidden;
      background: var(--bg);
    }

    /* 💡 독립된 카드 패널 스타일 */
    .col {
      display: flex;
      flex-direction: column;
      background: var(--card-bg);
      border-radius: 16px;
      /* 둥근 모서리 */
      box-shadow: var(--shadow-card);
      /* 붕 떠있는 그림자 효과 */
      border: 1px solid var(--bd);
      overflow: hidden;
    }

    .col-hd {
      padding: 0 20px;
      height: 56px;
      border-bottom: 1px solid var(--bd);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #fff;
      flex-shrink: 0;
    }

    /* 단계 뱃지 */
    .step-badge {
      font-size: 10px;
      font-weight: 800;
      background: #e0e7ff;
      color: #3730a3;
      padding: 4px 8px;
      border-radius: 6px;
      margin-right: 8px;
      letter-spacing: 0.5px;
    }

    .col-title {
      font-size: 14px;
      font-weight: 800;
      color: var(--primary);
    }

    .col-bd {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* --- Buttons --- */
    button {
      cursor: pointer;
      border: none;
      font-size: 12px;
      font-weight: 700;
      border-radius: 6px;
      transition: all 0.2s;
      outline: none;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-std {
      background: #f3f4f6;
      color: #333;
      padding: 8px 16px;
      border: 1px solid #d1d5db;
    }

    .btn-std:hover:not(:disabled) {
      background: #e5e7eb;
    }

    .btn-black {
      background: var(--primary);
      color: #fff;
      padding: 10px 20px;
      border-radius: 6px;
    }

    .btn-black:hover:not(:disabled) {
      background: #333;
    }

    .btn-pink {
      background: var(--action-pink);
      color: #fff;
      padding: 12px 20px;
      border-radius: 6px;
      width: 100%;
      font-size: 14px;
    }

    .btn-pink:hover:not(:disabled) {
      opacity: 0.9;
    }

    .btn-blue {
      background: #3b82f6;
      color: #fff;
      padding: 10px 20px;
    }

    /* --- Left Column (Upload) --- */
    .btn-capture {
      width: 100%;
      padding: 24px;
      border: 2px dashed #d1d5db;
      background: #f9fafb;
      color: var(--primary);
      font-size: 14px;
      font-weight: 800;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .btn-capture:hover {
      background: #eff6ff;
      border-color: var(--primary);
    }

    .req-card {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 10px;
      padding: 14px;
      background: #fff;
      border: 1px solid var(--bd);
      border-radius: 10px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      transform: scale(0.99);
      transition: 0.2s;
      cursor: pointer;
    }

    .req-card:hover {
      border-color: var(--primary);
      transform: scale(1);
    }

    .req-card.editing {
      border: 2px solid var(--action-pink);
      background: #fff1f2;
    }

    .req-card img {
      width: 100%;
      border-radius: 6px;
      border: 1px solid var(--bd);
    }

    .tag {
      font-size: 10px;
      padding: 3px 6px;
      border-radius: 4px;
      background: #f3f4f6;
      color: #555;
      font-weight: 700;
      border: 1px solid #e5e7eb;
    }

    /* --- Center Column (Canvas) --- */
    .canvas-controls {
      padding: 20px;
      border-bottom: 1px solid var(--bd);
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: #fff;
    }

    .input-label {
      font-size: 12px;
      font-weight: 800;
      color: var(--primary);
      margin-bottom: 6px;
      display: block;
    }

    .url-input {
      width: 100%;
      background: #fff;
      border: 1px solid var(--bd);
      padding: 12px;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
      transition: 0.2s;
    }

    .url-input:focus {
      border-color: var(--primary);
    }

    .cat-wrapper {
      padding: 8px;
      background: var(--bg);
      border-radius: 10px;
    }

    .cat-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }

    .cat-btn {
      background: var(--primary);
      color: #fff;
      padding: 5px 0;
      border-radius: 5px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 700;
      opacity: 0.2;
      transition: 0.2s;
    }

    .cat-btn:hover {
      opacity: 0.5;
    }

    .cat-btn.active {
      opacity: 1;
      transform: scale(1.02);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    }

    .cat-icon {
      font-size: 14px;
      margin-bottom: 2px;
    }

    .canvas-area-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #e5e7eb;
      overflow: hidden;
      position: relative;
    }

    .canvas-scroll-container {
      flex: 1;
      overflow: auto;
      display: block;
      padding: 40px;
      cursor: crosshair;
      text-align: center;
    }

    .canvas-content {
      position: relative;
      display: none;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
      background: #fff;
      transform-origin: top center;
      border-radius: 4px;
    }

    canvas {
      display: block;
      width: 100%;
      height: auto;
    }

    /* Center Footer */
    .center-footer {
      padding: 20px;
      background: #fff;
      border-top: 1px solid var(--bd);
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .desc-input {
      width: 100%;
      height: 60px;
      background: #f9fafb;
      border: 1px solid var(--bd);
      padding: 12px;
      border-radius: 8px;
      font-size: 13px;
      resize: none;
      outline: none;
    }

    .desc-input:focus {
      border-color: var(--primary);
      background: #fff;
    }

    .center-action-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* --- Right Column (Memo) --- */
    .guide-box {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-muted);
      font-size: 13px;
      line-height: 1.6;
      border: 1px dashed var(--bd);
      border-radius: 12px;
      background: #f9fafb;
    }

    .memo-panel {
      background: #fff;
      border: 2px solid var(--primary);
      padding: 20px;
      border-radius: 12px;
      display: none;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
      animation: slideUp 0.2s ease;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    }

    .memo-panel.active {
      display: flex;
    }

    .memo-input {
      width: 100%;
      height: 100px;
      background: #f9fafb;
      border: 1px solid var(--bd);
      padding: 12px;
      border-radius: 8px;
      resize: none;
      font-size: 13px;
      outline: none;
    }

    .memo-input:focus {
      border-color: var(--primary);
      background: #fff;
    }

    .anno-list-container {
      flex: 1;
      overflow-y: auto;
    }

    .anno-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 10px;
      padding: 14px;
      background: #fff;
      border: 1px solid var(--bd);
      border-radius: 10px;
      transform: scale(0.99);
      transition: 0.2s;
      cursor: pointer;
    }

    .anno-item:hover {
      border-color: var(--primary);
      transform: scale(1);
    }

    .anno-item.selected {
      border-color: var(--action-pink);
      background: #fff1f2;
    }

    .anno-badge {
      background: var(--primary);
      color: white;
      width: 20px;
      height: 20px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 800;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .qr-overlay {
      position: absolute;
      top: 20px;
      right: 20px;
      padding: 6px;
      background: #fff;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10;
      pointer-events: none;
      display: none;
    }

    .qr-overlay img {
      display: block;
      width: 80px;
      height: 80px;
    }

    /* --- TUTORIAL OVERLAY --- */
    #tutorialOverlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 9999;
      display: none;
    }

    .tut-spotlight {
      position: absolute;
      border-radius: 12px;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7);
      transition: all 0.4s ease;
      pointer-events: none;
      border: 2px solid var(--action-pink);
    }

    .tut-card {
      position: absolute;
      width: 320px;
      background: #fff;
      padding: 24px;
      border-radius: 16px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
      transition: all 0.4s ease;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .tut-step {
      color: var(--action-pink);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 1px;
    }

    .tut-title {
      font-size: 18px;
      font-weight: 800;
      color: var(--primary);
      margin: 0;
    }

    .tut-desc {
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.5;
      margin: 0;
    }

    .tut-btn {
      align-self: flex-end;
      background: var(--primary);
      color: #fff;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
    }

    /* --- VIEWER --- */
    .viewer-layout {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 420px;
      background: #e5e7eb;
    }

    .view-main {
      overflow-y: auto;
      padding: 40px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }

    .view-paper {
      width: 100%;
      max-width: 1000px;
      background: #fff;
      min-height: 1200px;
      box-shadow: var(--shadow-float);
      border-radius: 12px;
      padding: 60px;
      display: flex;
      flex-direction: column;
      gap: 40px;
    }

    .paper-header {
      border-bottom: 2px solid #111;
      padding-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .paper-title {
      font-size: 32px;
      font-weight: 900;
      letter-spacing: -1px;
      margin-bottom: 8px;
    }

    .paper-sub {
      font-size: 14px;
      color: #666;
    }

    .paper-header img {
      display: block;
      width: 200px;
    }

    .item-status-select {
      padding: 6px 14px;
      border-radius: 20px;
      border: 1px solid #ddd;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
      outline: none;
      appearance: none;
      text-align: center;
      transition: 0.2s;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .item-status-select.request {
      color: #d97706;
      border-color: #fbbf24;
      background: #fffbeb;
    }

    .item-status-select.review {
      color: #2563eb;
      border-color: #93c5fd;
      background: #eff6ff;
    }

    .item-status-select.complete {
      color: #059669;
      border-color: #6ee7b7;
      background: #ecfdf5;
    }

    .view-content-row {
      display: flex;
      gap: 30px;
      align-items: flex-start;
      border-bottom: 1px solid #eee;
      padding-bottom: 40px;
      margin-bottom: 10px;
      position: relative;
    }

    .view-info-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .view-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .view-cat-badge {
      display: inline-block;
      font-size: 12px;
      font-weight: 800;
      color: #fff;
      background: #111;
      padding: 6px 12px;
      border-radius: 4px;
    }

    .view-url-container {
      font-size: 13px;
      color: #555;
      background: #f3f4f6;
      padding: 10px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: text;
      transition: 0.2s;
      border: 1px solid transparent;
    }

    .view-url-container:hover {
      background: #e5e7eb;
      border-color: #d1d5db;
    }

    .view-url-input {
      border: none;
      background: transparent;
      font-size: 13px;
      color: var(--primary);
      font-weight: 600;
      width: 100%;
      outline: none;
    }

    .view-memo-box {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
    }

    .view-memo-item {
      margin-bottom: 8px;
      font-size: 14px;
      line-height: 1.6;
      display: flex;
      gap: 8px;
    }

    .view-memo-num {
      font-weight: 800;
      color: var(--action-pink);
      min-width: 20px;
    }

    .view-add-req {
      margin-top: 10px;
      font-size: 14px;
      color: #333;
      background: #fff1f2;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #fecdd3;
    }

    .view-img-col {
      width: 400px;
      flex-shrink: 0;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
      background: #000;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    }

    .view-img-col img {
      width: 100%;
      display: block;
      height: auto;
    }

    .view-sidebar {
      background: #fff;
      border-left: 1px solid var(--bd);
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .chat-header {
      height: 64px;
      border-bottom: 1px solid var(--bd);
      display: flex;
      align-items: center;
      padding: 0 24px;
      font-weight: 800;
      font-size: 16px;
      gap: 8px;
    }

    .chat-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      background: var(--chat-bg);
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .chat-bubble {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-width: 85%;
    }

    .chat-bubble.mine {
      align-self: flex-end;
      align-items: flex-end;
    }

    .chat-meta {
      font-size: 11px;
      color: #9ca3af;
      display: flex;
      gap: 6px;
    }

    .chat-text {
      padding: 12px 16px;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.5;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
      color: #374151;
    }

    .chat-bubble.mine .chat-text {
      background: var(--primary);
      color: #fff;
      border-color: var(--primary);
      border-bottom-right-radius: 2px;
    }

    .chat-input-area {
      padding: 20px;
      background: #fff;
      border-top: 1px solid var(--bd);
    }

    .chat-input {
      width: 100%;
      height: 80px;
      padding: 12px;
      border: 1px solid var(--bd);
      border-radius: 8px;
      resize: none;
      font-size: 13px;
      outline: none;
      margin-bottom: 10px;
      background: #f9fafb;
    }

    .chat-input:focus {
      border-color: var(--primary);
      background: #fff;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    ::-webkit-scrollbar {
      width: 6px;
    }

    ::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 3px;
    }

    /* Footer */
    .app-footer {
      background: var(--primary);
      color: #fff;
      padding: 15px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #9ca3af;
      margin-top: auto;
    }
  </style>
</head>

<body>

  <div class="topbar">
    <div class="logo-area">
      <img src="/jaebong_v2/assets/img/logo01.png" alt="">
      <div class="beta01">Beta</div>
    </div>
    <div class="top-msg">“홈페이지 수정·유지보수 요청을 캡처·URL·요청내용으로 정리해 PDF 의뢰서로 만들어보세요”</div>
    <div class="top-btns">
      <div id="editorBtns" style="display:flex; gap:8px;">
        <button class="btn-std" onclick="location.reload()">처음으로 (초기화)</button>
        <button class="btn-black" id="exportBtn" disabled>PDF 다운로드</button>
        <button class="btn-blue" id="shareLinkBtn" disabled>🔗 웹 링크 생성 (공유)</button>
      </div>

      <div id="viewerBtns" style="display:none; gap:8px;">
        <button class="btn-std" id="backToEditBtn">✎ 편집 모드로 돌아가기</button>
        <button class="btn-black" onclick="alert('링크가 클립보드에 복사되었습니다!');">🔗 공유 링크 복사</button>
      </div>
    </div>
  </div>

  <div class="layer active" id="editorLayer">
    <div class="workspace">
      <div class="col" id="step1Panel">
        <div class="col-hd">
          <div><span class="step-badge">STEP 01</span><span class="col-title">이미지 가져오기</span></div>
        </div>
        <div class="col-bd">
          <button class="btn-capture" id="btnScreenCapture">
            📸 내 홈페이지 화면 캡처
            <span style="font-weight:normal; color:#aaa; font-size:11px;">(클릭 후 브라우저 탭 선택)</span>
          </button>

          <div style="display:flex; align-items:center; gap:8px; margin: 10px 0; font-size:11px; color:#aaa;">
            <hr style="flex:1; border:0; border-top:1px solid #eee;">또는
            <hr style="flex:1; border:0; border-top:1px solid #eee;">
          </div>

          <button class="btn-std" id="btnOpenImg"
            style="width:100%; border:1px solid #ddd; background:#fff; padding:14px;">📂 파일 열기 / Ctrl+V</button>
          <input type="file" id="fileIn" accept="image/*" style="display:none">

          <div style="margin-top:24px;">
            <div
              style="font-size:12px; font-weight:800; color:var(--action-pink); margin-bottom:8px; display:flex; justify-content:space-between; border-bottom:2px solid #eee; padding-bottom:6px;">
              <span>요청사항 리스트</span>
              <span id="queueCount">0건</span>
            </div>
            <div style="flex: 1; overflow-y: auto;" id="reqList">
              <div style="text-align:center; padding:30px 10px; color:#9ca3af; font-size:12px;">등록된 요청사항이 없습니다.</div>
            </div>
          </div>
        </div>
      </div>

      <div class="col" id="step2Panel">
        <div class="col-hd">
          <div><span class="step-badge">STEP 02</span><span class="col-title">WORK CANVAS</span></div>
        </div>
        <div class="canvas-controls">
          <div>
            <span class="input-label">Page URL (QR코드 자동 생성)</span>
            <input type="text" class="url-input" id="urlIn" placeholder="수정할 페이지의 주소를 입력해주세요 (예: https://...)">
          </div>

          <div>
            <span class="input-label">요청사항 카테고리</span>
            <div class="cat-wrapper">
              <div class="cat-bar">
                <button class="cat-btn active" data-val="text">
                  <span class="cat-icon">📝</span>내용 수정 (이미지&타이포)
                </button>
                <button class="cat-btn" data-val="layout">
                  <span class="cat-icon">📐</span>항목 추가
                </button>
                <button class="cat-btn" data-val="func">
                  <span class="cat-icon">🛠️</span>기능 수정
                </button>
                <button class="cat-btn" data-val="image">
                  <span class="cat-icon">✨</span>기능 개발
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="canvas-area-wrapper">
          <div class="canvas-scroll-container" id="scrollContainer">
            <div class="canvas-content" id="canvasWrapper">
              <canvas id="mainCanvas"></canvas>
              <div id="qrVis" class="qr-overlay"></div>
            </div>
          </div>

          <div class="center-footer">
            <textarea id="reqDesc" class="desc-input" placeholder="이 페이지에 대한 전체적인 추가 요청사항을 입력하세요.
예시) 이미지는 추후 전달드리겠습니다, 이미지 직접 수급 부탁드립니다, www.susunzip.com 해당 레퍼런스 참고하여 디자인 리뉴얼 부탁드립니다."></textarea>

            <div class="center-action-row">
              <button class="btn-std" id="toggleZoomBtn" style="background:#fff; border:1px solid #ddd;">🔍 100% /
                화면맞춤</button>

              <div style="display:flex; gap:8px;">
                <button class="btn-std" id="cancelEditBtn"
                  style="display:none; background:#fee2e2; color:var(--danger); border:none;">수정 취소</button>
                <button class="btn-pink" id="saveReqBtn" disabled>리스트 추가하기 ➝</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col" id="step3Panel">
        <div class="col-hd">
          <div><span class="step-badge">STEP 03</span><span class="col-title">수정사항 메모 생성</span></div>
        </div>

        <div class="col-bd">
          <div class="guide-box" id="guideText">
            <b>캔버스</b>에서 수정하고 싶은 부분을<br>마우스로 드래그하여 박스를 그려주세요.<br><br>
            <span style="font-size:11px; color:var(--action-pink);">(박스를 클릭하면 다시 수정할 수 있습니다)</span>
          </div>

          <div class="memo-panel" id="memoPanel">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span style="font-weight:800; font-size:13px;" id="memoPanelTitle">선택 영역 메모</span>
              <button style="background:transparent; color:#ef4444; font-size:11px;" id="deleteMemoBtn"
                style="display:none;">삭제</button>
            </div>

            <textarea id="memoInput" class="memo-input" placeholder="선택 영역에 대한 전/후 내용을 설명해주세요.
예시) 고객센터 -> 고객문의로 변경해주세요."></textarea>

            <div style="display:flex; gap:8px; margin-top:8px;">
              <button class="btn-std" id="cancelMemoBtn" style="flex:1;">취소</button>
              <button class="btn-black" id="confirmMemoBtn" style="flex:2;">확인</button>
            </div>
          </div>

          <div class="anno-list-container" id="annoList"></div>
        </div>
      </div>
    </div>
  </div>


  <div class="layer" id="viewerLayer">
    <div class="viewer-layout">
      <div class="view-main">
        <div class="view-paper" id="viewPaper">
          <div class="paper-header">
            <div>
              <div class="paper-title">홈페이지 유지보수 의뢰서</div>
              <div class="paper-sub">작성일: <span id="viewDate">-</span></div>
              <!-- <div class="paper-sub">작성일: <span id="viewDate">-</span> | 작성자: Client (Guest)</div> -->
            </div>
            <div style="text-align:right;">
              <!-- <div style="font-size:11px; color:#888; margin-bottom:4px;">의뢰 번호</div> -->
              <!-- <div style="font-weight:800; font-size:14px;">#JB-2026-001</div> -->
              <img src="/jaebong_v2/assets/img/logo01.png" alt="">
            </div>
          </div>

          <div id="viewContentArea">
          </div>
        </div>
      </div>

      <div class="view-sidebar">
        <div class="chat-header">💬 프로젝트 소통 (History)</div>
        <div class="chat-body" id="chatList">
          <div class="chat-bubble">
            <div class="chat-meta">System • 14:00</div>
            <div class="chat-text" style="background:#f3f4f6; color:#555;">의뢰서가 생성되었습니다.</div>
          </div>
        </div>
        <div class="chat-input-area">
          <textarea class="chat-input" id="chatInput" placeholder="댓글 입력... (Enter)"></textarea>
          <button class="btn-black" style="width:100%" id="btnSendChat">메시지 전송</button>
        </div>
      </div>
    </div>
  </div>

  <div class="app-footer">
    <div><strong>JAEBONGTOOL</strong> | Contact: contact@susunzip.com</div>
    <div>© 2026 SOMETHINGHOW. All rights reserved.</div>
  </div>

  <div id="tutorialOverlay">
    <div class="tut-spotlight" id="tutSpot"></div>
    <div class="tut-card" id="tutCard">
      <div class="tut-step" id="tutStep">STEP 1</div>
      <h3 class="tut-title" id="tutTitle">이미지 불러오기</h3>
      <p class="tut-desc" id="tutDesc">설명 텍스트</p>
      <button class="tut-btn" id="tutNext">다음</button>
    </div>
  </div>

  <div id="qrHidden" style="display:none;"></div>

  <script>
    window.addEventListener('DOMContentLoaded', () => {
      const COLORS = {
        box: '#f43f5e',
        draft: '#3b82f6',
        handle: '#ffffff'
      };
      const HANDLE_R = 5;

      const S = {
        img: null,
        w: 0,
        h: 0,
        baseImgSrc: null,
        annos: [],
        draftRect: null,
        activeAnnoId: null,
        state: 'IDLE',
        action: null,
        dragStart: {
          x: 0,
          y: 0
        },
        history: [],
        editingHistoryId: null,
        qrImage: null,
        currentCategory: 'text',
        isFitMode: false,
        zoom: 100,
        tutIndex: 0
      };

      const UI = {

        // =========================================================
        // 🧭 1. Layer / Mode Switching
        // =========================================================
        editorLayer: document.getElementById('editorLayer'),
        viewerLayer: document.getElementById('viewerLayer'),

        editorBtns: document.getElementById('editorBtns'),
        viewerBtns: document.getElementById('viewerBtns'),
        backToEditBtn: document.getElementById('backToEditBtn'),

        // =========================================================
        // 🏷️ 2. Top Header Buttons
        // =========================================================
        exportBtn: document.getElementById('exportBtn'),
        shareBtn: document.getElementById('shareLinkBtn'),

        // =========================================================
        // 📂 3. STEP 01 - Image Upload
        // =========================================================
        btnScreenCapture: document.getElementById('btnScreenCapture'),
        btnOpenImg: document.getElementById('btnOpenImg'),
        fileIn: document.getElementById('fileIn'),

        // =========================================================
        // 🖼️ 4. STEP 02 - Canvas Core
        // =========================================================
        canvas: document.getElementById('mainCanvas'),
        ctx: document.getElementById('mainCanvas').getContext('2d'),
        cWrap: document.getElementById('canvasWrapper'),
        scrollContainer: document.getElementById('scrollContainer'),
        btnZoom: document.getElementById('toggleZoomBtn'),

        // =========================================================
        // 🔗 5. URL + QR System
        // =========================================================
        urlIn: document.getElementById('urlIn'),
        qrVis: document.getElementById('qrVis'),
        qrHidden: document.getElementById('qrHidden'),

        // =========================================================
        // 🏷️ 6. Category Buttons
        // =========================================================
        catBtns: document.querySelectorAll('.cat-btn'),

        // =========================================================
        // 💾 7. Save / Edit Controls
        // =========================================================
        reqDesc: document.getElementById('reqDesc'),
        saveReqBtn: document.getElementById('saveReqBtn'),
        cancelEditBtn: document.getElementById('cancelEditBtn'),

        // =========================================================
        // 📝 8. Memo System
        // =========================================================
        guideText: document.getElementById('guideText'),

        memoPanel: document.getElementById('memoPanel'),
        memoPanelTitle: document.getElementById('memoPanelTitle'),
        memoInput: document.getElementById('memoInput'),

        confirmMemoBtn: document.getElementById('confirmMemoBtn'),
        cancelMemoBtn: document.getElementById('cancelMemoBtn'),
        deleteMemoBtn: document.getElementById('deleteMemoBtn'),

        annoList: document.getElementById('annoList'),

        // =========================================================
        // 📚 9. History Queue
        // =========================================================
        reqList: document.getElementById('reqList'),
        queueCount: document.getElementById('queueCount'),

        // =========================================================
        // 📄 10. Viewer Mode
        // =========================================================
        viewContentArea: document.getElementById('viewContentArea'),
        viewDate: document.getElementById('viewDate'),

        // =========================================================
        // 💬 11. Chat System (PRO)
        // =========================================================
        chatList: document.getElementById('chatList'),
        chatInput: document.getElementById('chatInput'),
        btnSendChat: document.getElementById('btnSendChat'),

        // =========================================================
        // 🎓 12. Tutorial Overlay (LITE)
        // =========================================================
        tutOverlay: document.getElementById('tutorialOverlay'),
        tutSpot: document.getElementById('tutSpot'),
        tutCard: document.getElementById('tutCard'),
        tutStep: document.getElementById('tutStep'),
        tutTitle: document.getElementById('tutTitle'),
        tutDesc: document.getElementById('tutDesc'),
        tutNext: document.getElementById('tutNext')

      };

      // --- 튜토리얼 로직 ---
      const steps = [{
          el: 'step1Panel',
          title: '이미지 불러오기',
          desc: '작업할 홈페이지를 캡처하거나<br>이미지 파일을 업로드하세요.'
        },
        {
          el: 'step2Panel',
          title: '화면 수정 표시',
          desc: '불러온 이미지 위에서 마우스를 드래그해<br>수정할 영역을 박스로 표시하세요.'
        },
        {
          el: 'step3Panel',
          title: '상세 메모 작성',
          desc: '박스에 대한 상세 내용을 적고<br>리스트에 저장하세요.'
        }
      ];

      function showTutorial(idx) {
        if (idx >= steps.length) {
          UI.tutOverlay.style.display = 'none';
          return;
        }
        UI.tutOverlay.style.display = 'block';

        const target = document.getElementById(steps[idx].el);
        const rect = target.getBoundingClientRect();

        UI.tutSpot.style.width = rect.width + 'px';
        UI.tutSpot.style.height = rect.height + 'px';
        UI.tutSpot.style.top = rect.top + 'px';
        UI.tutSpot.style.left = rect.left + 'px';

        UI.tutStep.innerText = `STEP 0${idx + 1}`;
        UI.tutTitle.innerText = steps[idx].title;
        UI.tutDesc.innerHTML = steps[idx].desc;
        UI.tutNext.innerText = idx === steps.length - 1 ? '시작하기' : '다음';

        const cardLeft = window.innerWidth / 2 - 160;
        const cardTop = window.innerHeight / 2 - 100;
        UI.tutCard.style.left = cardLeft + 'px';
        UI.tutCard.style.top = cardTop + 'px';
      }

      setTimeout(() => showTutorial(0), 500);
      UI.tutNext.onclick = () => showTutorial(++S.tutIndex);

      // --- EVENTS ---
      UI.catBtns.forEach(btn => {
        btn.onclick = () => {
          UI.catBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          S.currentCategory = btn.dataset.val;
        };
      });

      function generateQR(url) {
        UI.qrHidden.innerHTML = '';
        if (!url || !url.trim()) {
          UI.qrVis.style.display = 'none';
          S.qrImage = null;
          return;
        }
        new QRCode(UI.qrHidden, {
          width: 200,
          height: 200,
          text: url
        });
        setTimeout(() => {
          const img = UI.qrHidden.querySelector('img');
          if (img) {
            UI.qrVis.innerHTML = '';
            UI.qrVis.appendChild(img.cloneNode());
            UI.qrVis.style.display = 'block';
            S.qrImage = img;
          }
        }, 100);
      }
      UI.urlIn.addEventListener('input', (e) => generateQR(e.target.value));

      // --- Capture & Load ---
      UI.btnScreenCapture.onclick = async () => {
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false
          });
          const video = document.createElement('video');
          video.srcObject = stream;
          video.play();
          video.onloadedmetadata = () => {
            setTimeout(() => {
              const canvas = document.createElement('canvas');
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(video, 0, 0);
              stream.getTracks().forEach(track => track.stop());
              loadImage(canvas.toDataURL('image/png'));
            }, 300);
          };
        } catch (err) {
          console.warn(err);
        }
      };

      function updateZoomMode() {
        if (!S.img) return;
        UI.cWrap.style.display = 'inline-block';
        if (S.isFitMode) {
          UI.cWrap.style.width = '100%';
          UI.cWrap.style.height = 'auto';
          const cw = UI.scrollContainer.clientWidth - 80;
          S.zoom = (cw / S.w) * 100;
        } else {
          UI.cWrap.style.width = S.w + 'px';
          UI.cWrap.style.height = S.h + 'px';
          S.zoom = 100;
        }
        render();
      }
      UI.btnZoom.onclick = () => {
        S.isFitMode = !S.isFitMode;
        updateZoomMode();
      };
      window.addEventListener('resize', () => {
        if (S.isFitMode) updateZoomMode();
      });

      function clearEditingState() {
        S.editingHistoryId = null;
        UI.saveReqBtn.innerText = "리스트 추가하기 ➝";
        UI.saveReqBtn.style.background = "var(--action-pink)";
        UI.cancelEditBtn.style.display = 'none';
        renderQueue();
      }

      function loadImage(src, onLoadCallback) {
        const img = new Image();
        img.onload = () => {
          S.img = img;
          S.w = img.naturalWidth;
          S.h = img.naturalHeight;
          S.baseImgSrc = src;
          UI.canvas.width = S.w;
          UI.canvas.height = S.h;
          S.isFitMode = true;
          updateZoomMode();
          UI.saveReqBtn.disabled = false;
          if (onLoadCallback) {
            onLoadCallback();
          } else {
            S.annos = [];
            S.draftRect = null;
            S.state = 'IDLE';
            S.activeAnnoId = null;
            clearEditingState();
            resetMemoPanel(false);
            updateAnnoListUI();
          }
          render();
          if (UI.urlIn.value) generateQR(UI.urlIn.value);
        };
        img.src = src;
      }
      UI.btnOpenImg.onclick = () => UI.fileIn.click();
      UI.fileIn.onchange = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = (ev) => loadImage(ev.target.result);
        r.readAsDataURL(f);
        e.target.value = '';
      };
      window.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const f = items[i].getAsFile();
            const r = new FileReader();
            r.onload = (ev) => loadImage(ev.target.result);
            r.readAsDataURL(f);
            e.preventDefault();
            break;
          }
        }
      });

      UI.reqDesc.oninput = () => {
        if (UI.cWrap.style.display == 'none') {
          S.img = null;
        }
        if (S.img || UI.reqDesc.value != '') {
          UI.saveReqBtn.disabled = false;
        } else {
          UI.saveReqBtn.disabled = true;
        }
      };

      // --- Canvas Interaction ---
      function getPos(e) {
        const r = UI.canvas.getBoundingClientRect();
        const sx = S.w / r.width;
        const sy = S.h / r.height;
        return {
          x: (e.clientX - r.left) * sx,
          y: (e.clientY - r.top) * sy
        };
      }

      function hitCheck(p, rect) {
        const tol = 12 * (100 / S.zoom);
        const xm = rect.x + rect.w / 2,
          ym = rect.y + rect.h / 2,
          xr = rect.x + rect.w,
          yb = rect.y + rect.h;
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
        if (!S.img) return;
        const p = getPos(e);
        let cursor = 'crosshair';
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
        if (S.state === 'EDITING' && S.action) {
          const anno = S.annos.find(a => a.id === S.activeAnnoId);
          if (!anno) return;
          const dx = p.x - S.dragStart.x;
          const dy = p.y - S.dragStart.y;
          if (S.action === 'move') {
            anno.rect.x += dx;
            anno.rect.y += dy;
          } else {
            let nx = anno.rect.x,
              ny = anno.rect.y,
              nw = anno.rect.w,
              nh = anno.rect.h;
            if (S.action.includes('e')) nw += dx;
            if (S.action.includes('w')) {
              nw -= dx;
              nx += dx;
            }
            if (S.action.includes('s')) nh += dy;
            if (S.action.includes('n')) {
              nh -= dy;
              ny += dy;
            }
            if (nw > 20) {
              anno.rect.x = nx;
              anno.rect.w = nw;
            }
            if (nh > 20) {
              anno.rect.y = ny;
              anno.rect.h = nh;
            }
          }
          S.dragStart = p;
          render();
          return;
        }
        if (S.activeAnnoId) {
          const a = S.annos.find(x => x.id === S.activeAnnoId);
          if (a) {
            const hit = hitCheck(p, a.rect);
            if (hit) cursor = (hit === 'move' ? 'move' : hit + '-resize');
          }
        } else {
          const h = [...S.annos].reverse().find(a => p.x >= a.rect.x && p.x <= a.rect.x + a.rect.w && p.y >= a.rect.y && p.y <= a.rect.y + a.rect.h);
          if (h) cursor = 'pointer';
        }
        UI.canvas.style.cursor = cursor;
      };
      UI.canvas.onmousedown = (e) => {
        if (!S.img || S.state === 'MEMO_WAIT') return;
        const p = getPos(e);
        if (S.activeAnnoId) {
          const a = S.annos.find(x => x.id === S.activeAnnoId);
          if (a) {
            const hit = hitCheck(p, a.rect);
            if (hit) {
              S.state = 'EDITING';
              S.action = hit;
              S.dragStart = p;
              return;
            }
          }
        }
        const clicked = [...S.annos].reverse().find(a => p.x >= a.rect.x && p.x <= a.rect.x + a.rect.w && p.y >= a.rect.y && p.y <= a.rect.y + a.rect.h);
        if (clicked) {
          resetMemoPanel(true);
          openEditPanel(clicked.id);
          S.state = 'EDITING';
          S.action = 'move';
          S.dragStart = p;
          return;
        }
        resetMemoPanel(true);
        S.activeAnnoId = null;
        S.state = 'DRAWING';
        S.dragStart = p;
        S.draftRect = {
          x: p.x,
          y: p.y,
          w: 0,
          h: 0
        };
        render();
      };
      window.onmouseup = (e) => {
        if (S.state === 'DRAWING') {
          if (S.draftRect && S.draftRect.w > 20 && S.draftRect.h > 20) {
            S.state = 'MEMO_WAIT';
            UI.guideText.style.display = 'none';
            UI.memoPanel.classList.add('active');
            UI.memoPanelTitle.innerText = "새 메모 작성";
            UI.confirmMemoBtn.innerText = "확인";
            UI.deleteMemoBtn.style.display = 'none';
            UI.memoInput.value = '';
            UI.memoInput.focus();
          } else {
            S.state = 'IDLE';
            S.draftRect = null;
          }
        } else if (S.state === 'EDITING') {
          S.state = 'IDLE';
          S.action = null;
        }
        render();
      };

      function openEditPanel(id) {
        S.activeAnnoId = id;
        const anno = S.annos.find(a => a.id === id);
        UI.guideText.style.display = 'none';
        UI.memoPanel.classList.add('active');
        UI.memoPanelTitle.innerText = "메모 수정";
        UI.confirmMemoBtn.innerText = "수정 완료";
        UI.deleteMemoBtn.style.display = 'block';
        UI.memoInput.value = anno.text;
        updateAnnoListUI();
        render();
      }
      UI.confirmMemoBtn.onclick = () => {
        const txt = UI.memoInput.value.trim();
        if (!txt) {
          alert("메모를 입력하세요.");
          UI.memoInput.focus();
          return;
        }
        if (S.activeAnnoId) {
          const a = S.annos.find(x => x.id === S.activeAnnoId);
          if (a) a.text = txt;
          S.activeAnnoId = null;
        } else {
          S.annos.push({
            id: Date.now(),
            rect: {
              ...S.draftRect
            },
            text: txt
          });
        }
        resetMemoPanel(false);
        updateAnnoListUI();
        render();
      };
      UI.deleteMemoBtn.onclick = () => {
        if (confirm("삭제하시겠습니까?")) {
          S.annos = S.annos.filter(a => a.id !== S.activeAnnoId);
          S.activeAnnoId = null;
          resetMemoPanel(false);
          updateAnnoListUI();
          render();
        }
      };
      UI.cancelMemoBtn.onclick = () => {
        if (S.activeAnnoId) S.activeAnnoId = null;
        resetMemoPanel(false);
        render();
      };

      function resetMemoPanel(autoSave) {
        if (autoSave && S.activeAnnoId) {
          const a = S.annos.find(x => x.id === S.activeAnnoId);
          if (a) a.text = UI.memoInput.value.trim();
        }
        S.state = 'IDLE';
        S.draftRect = null;
        UI.memoPanel.classList.remove('active');
        UI.guideText.style.display = 'block';
        updateAnnoListUI();
      }

      function updateAnnoListUI() {
        UI.annoList.innerHTML = '';
        S.annos.forEach((a, i) => {
          const el = document.createElement('div');
          el.className = 'anno-item' + (S.activeAnnoId === a.id ? ' selected' : '');
          el.innerHTML = `<div class="anno-badge">${i + 1}</div><div class="anno-text">${a.text}</div>`;
          el.onclick = () => {
            resetMemoPanel(true);
            openEditPanel(a.id);
          };
          UI.annoList.appendChild(el);
        });
      }

      function render(isExport = false) {
        if (!S.img) return;
        const ctx = UI.ctx;
        ctx.clearRect(0, 0, S.w, S.h);
        ctx.drawImage(S.img, 0, 0);
        const sf = 1 / (S.zoom / 100);
        const br = 16 * sf;
        const fs = 15 * sf;
        const lw = 4 * sf;
        const boxColor = '#f43f5e';
        S.annos.forEach((a, i) => {
          const active = S.activeAnnoId === a.id && !isExport;
          ctx.strokeStyle = active ? '#3b82f6' : boxColor;
          ctx.lineWidth = lw;
          if (active) {
            ctx.fillStyle = 'rgba(59,130,246,0.1)';
            ctx.fillRect(a.rect.x, a.rect.y, a.rect.w, a.rect.h);
          }
          ctx.strokeRect(a.rect.x, a.rect.y, a.rect.w, a.rect.h);
          ctx.fillStyle = active ? '#3b82f6' : boxColor;
          ctx.beginPath();
          ctx.arc(a.rect.x, a.rect.y, br, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = `bold ${fs}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(i + 1, a.rect.x, a.rect.y + (1 * sf));
        });
        if (S.draftRect && !isExport) {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = lw;
          ctx.setLineDash([8 * sf, 8 * sf]);
          ctx.strokeRect(S.draftRect.x, S.draftRect.y, S.draftRect.w, S.draftRect.h);
          ctx.setLineDash([]);
        }
        if (isExport && S.qrImage) {
          const QSz = 180;
          const Pad = 20;
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = "white";
          ctx.fillRect(S.w - QSz - Pad - 5, Pad - 5, QSz + 10, QSz + 10);
          ctx.drawImage(S.qrImage, S.w - QSz - Pad, Pad, QSz, QSz);
        }
      }

      // --- 저장/수정 로직 ---
      UI.saveReqBtn.onclick = () => {
        if (S.state === 'MEMO_WAIT' || S.state === 'EDITING') {
          alert("메모를 먼저 저장하세요.");
          return;
        }
        if (S.annos.length === 0 && !confirm("메모 없이 저장하시겠습니까?")) return;
        render(true);
        const full = UI.canvas.toDataURL('image/jpeg', 0.8);
        const thumb = UI.canvas.toDataURL('image/jpeg', 0.2);
        const data = {
          id: Date.now(),
          date: new Date().toLocaleTimeString(),
          thumb,
          full,
          baseImgSrc: S.baseImgSrc,
          annos: JSON.parse(JSON.stringify(S.annos)),
          url: UI.urlIn.value,
          desc: UI.reqDesc.value,
          category: S.currentCategory
        };

        if (S.editingHistoryId) {
          const idx = S.history.findIndex(x => x.id === S.editingHistoryId);
          if (idx !== -1) S.history[idx] = data;
          alert("수정 완료되었습니다.");
        } else {
          S.history.push(data);
          alert("저장되었습니다.");
        }

        UI.cWrap.style.display = 'none';
        UI.saveReqBtn.disabled = true;

        clearEditingState();
        S.annos = [];
        updateAnnoListUI();
        UI.reqDesc.value = '';
        render();
        UI.exportBtn.disabled = false;
        UI.shareBtn.disabled = false;
        renderQueue();
      };

      UI.cancelEditBtn.onclick = () => {
        if (confirm("수정을 취소하시겠습니까?")) {
          clearEditingState();
          S.img = null;
          UI.cWrap.style.display = 'none';
          UI.ctx.clearRect(0, 0, S.w, S.h);
          UI.urlIn.value = '';
          UI.reqDesc.value = '';
          S.annos = [];
          updateAnnoListUI();
          UI.saveReqBtn.disabled = true;
        }
      };

      function renderQueue() {
        UI.reqList.innerHTML = '';
        UI.queueCount.innerText = S.history.length;
        S.history.slice().reverse().forEach((h, i) => {
          const d = document.createElement('div');
          d.className = 'req-card' + (S.editingHistoryId === h.id ? ' editing' : '');
          const catMap = {
            text: '📝 내용 수정',
            layout: '📐 항목 추가',
            func: '🛠️ 기능 수정',
            image: '✨ 기능 개발'
          };
          d.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-size:11px; color:#aaa; margin-bottom:6px;">
                <span>#${S.history.length - i} • ${h.date}</span>
                <div style="display:flex; gap:4px;">
                  <button class="btn-std" style="padding:2px 6px; font-size:10px;">수정</button>
                  <button class="btn-std" style="padding:2px 6px; font-size:10px; color:var(--danger);">삭제</button>
                </div>
            </div>
            <div style="display:flex; gap:6px; margin-bottom:8px;">
              <span class="tag">${catMap[h.category]}</span><span class="tag" style="background:#fff; border:1px solid #ddd;">메모 ${h.annos.length}개</span>
            </div>
            <img src="${h.thumb}">
          `;
          d.querySelectorAll('button')[0].onclick = () => { // 수정
            if (S.img && UI.cWrap.style.display != 'none' && !confirm("현재 작업을 덮어쓰고 수정하시겠습니까?")) return;
            document.querySelectorAll('.req-card.editing').forEach(card => card.classList.remove('editing'));
            d.classList.add('editing');
            S.editingHistoryId = h.id;
            loadImage(h.baseImgSrc, () => {
              S.annos = JSON.parse(JSON.stringify(h.annos));
              UI.urlIn.value = h.url;
              UI.reqDesc.value = h.desc;
              S.currentCategory = h.category;
              UI.catBtns.forEach(b => b.classList.toggle('active', b.dataset.val === h.category));
              generateQR(h.url);
              updateAnnoListUI();
              render();
              UI.saveReqBtn.innerText = "수정 완료 (덮어쓰기)";
              UI.saveReqBtn.style.background = "#10b981";
              UI.cancelEditBtn.style.display = 'block';
            });
          };
          d.querySelectorAll('button')[1].onclick = () => { // 삭제
            if (!confirm("정말 요청사항을 삭제하시겠습니까?")) return;
            S.history = S.history.filter(x => x.id !== h.id);
            if (S.editingHistoryId === h.id) clearEditingState();
            renderQueue();
            if (S.history.length === 0) UI.exportBtn.disabled = true;
          };
          UI.reqList.appendChild(d);
        });
      }

      // --- PDF Export (html2canvas) ---
      function getQrBase64(text) {
        if (!text) return '';
        const div = document.createElement('div');
        new QRCode(div, {
          text,
          width: 80,
          height: 80
        });
        return div.querySelector('canvas').toDataURL();
      }
      UI.exportBtn.onclick = async () => {
        UI.exportBtn.innerText = "생성 중...";
        const {
          jsPDF
        } = window.jspdf;
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
          if (i === 0) {
            basicInfo = `
              <div style="margin-bottom:30px; border:1px solid #000; padding:20px; display:flex; gap:20px;">
                  <div style="flex:1;"><strong>[의뢰인 정보]</strong><br>업체명 : 컴퓨타수선집<br>담당자 : 박준성</div>
                  <div style="flex:1;"><strong>[홈페이지 정보]</strong><br>URL : ${h.url || '-'}<br>호스팅 : AWS</div>
              </div>
            `;
          }

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

          const canvas = await html2canvas(tempDiv, {
            scale: 2,
            useCORS: true
          });
          const imgData = canvas.toDataURL('image/jpeg', 0.9);
          const imgHeight = (canvas.height * 210) / canvas.width;
          doc.addImage(imgData, 'JPEG', 0, 0, 210, imgHeight);
        }
        document.body.removeChild(tempDiv);
        doc.save('의뢰서.pdf');
        UI.exportBtn.innerText = "PDF 다운로드";
      };


      // --- VIEWER LOGIC (v12.1 + Inline Edit) ---
      UI.shareBtn.onclick = () => {
        UI.editorLayer.classList.remove('active');
        UI.viewerLayer.classList.add('active');
        UI.editorBtns.style.display = 'none';
        UI.viewerBtns.style.display = 'flex';
        renderViewerContent();
      };
      UI.backToEditBtn.onclick = () => {
        UI.viewerLayer.classList.remove('active');
        UI.editorLayer.classList.add('active');
        UI.viewerBtns.style.display = 'none';
        UI.editorBtns.style.display = 'flex';
      };

      window.updateItemStatus = (el, id) => {
        const val = el.value;
        el.className = `item-status-select ${val}`;
        const item = S.history.find(h => h.id === id);
        if (item) {
          item.status = val;
          const statusMap = {
            request: '검토요청',
            review: '검토중',
            complete: '검토완료'
          };
          addSystemChat(`${S.history.indexOf(item) + 1}번 항목의 상태가 [${statusMap[val]}]로 변경되었습니다.`);
        }
      };

      // 💡 URL 직접 수정 핸들러
      window.updateItemUrl = (el, id) => {
        const newUrl = el.value.trim();
        const item = S.history.find(h => h.id === id);
        if (item && item.url !== newUrl) {
          item.url = newUrl;
          addSystemChat(`${S.history.indexOf(item) + 1}번 항목의 URL이 수정되었습니다.`);
        }
      };

      function renderViewerContent() {
        UI.viewDate.innerText = new Date().toLocaleDateString();
        UI.viewContentArea.innerHTML = '';
        const catMap = {
          text: '📝 내용 수정',
          layout: '📐 항목 추가',
          func: '🛠️ 기능 수정',
          image: '✨ 기능 개발'
        };

        if (S.history.length === 0) {
          UI.viewContentArea.innerHTML = '<div style="color:#aaa; text-align:center; padding:50px;">저장된 의뢰 내역이 없습니다.</div>';
          return;
        }

        S.history.forEach((h, i) => {
          const memos = h.annos.map((a, idx) => `<div class="view-memo-item"><div class="view-memo-num">[${idx + 1}]</div><div>${a.text}</div></div>`).join('');

          const statusHtml = `
            <select onchange="updateItemStatus(this, ${h.id})" class="item-status-select ${h.status}">
                <option value="request" ${h.status === 'request' ? 'selected' : ''}>🟡 검토요청</option>
                <option value="review" ${h.status === 'review' ? 'selected' : ''}>🔵 검토중</option>
                <option value="complete" ${h.status === 'complete' ? 'selected' : ''}>🟢 검토완료</option>
            </select>
        `;

          const div = document.createElement('div');
          div.className = 'view-content-row';
          div.innerHTML = `
            <div class="view-info-col">
                <div class="view-item-header">
                    <span class="view-cat-badge">#${i + 1}. ${catMap[h.category]}</span>
                    ${statusHtml} 
                </div>
                <div class="view-url-container">
                    <span>🔗</span>
                    <input type="text" class="view-url-input" value="${h.url}" placeholder="대상 URL을 입력하세요" 
                           onblur="updateItemUrl(this, ${h.id})" 
                           onkeydown="if(event.key==='Enter') this.blur()">
                </div>
                <div class="view-memo-box">
                    <div style="font-size:12px; font-weight:800; color:#888; margin-bottom:10px;">상세 메모</div>
                    ${memos || '<div style="color:#aaa">등록된 메모가 없습니다.</div>'}
                </div>
                <div class="view-add-req"><strong>💡 추가 요청사항:</strong><br>${h.desc || "없음"}</div>
            </div>
            <div class="view-img-col"><img src="${h.full}"></div>
        `;
          UI.viewContentArea.appendChild(div);
        });
      }

      function addSystemChat(msg) {
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.innerHTML = `<div class="chat-meta">System • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div><div class="chat-text" style="background:#f3f4f6; color:#555; font-style:italic;">${msg}</div>`;
        UI.chatList.appendChild(bubble);
        UI.chatList.scrollTop = UI.chatList.scrollHeight;
      }

      UI.chatInput.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          UI.btnSendChat.click();
        }
      };
      UI.btnSendChat.onclick = () => {
        const text = UI.chatInput.value.trim();
        if (!text) return;
        const now = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        });
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
    });
  </script>
</body>

</html>