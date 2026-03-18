<?php
include_once('../common.php');
$id_esc = isset($_GET['id']) ? addslashes(trim($_GET['id'])) : '';
$isViewerMode = !empty($id_esc);

// 모바일 기기 감지 (정규식 기반)
$userAgent = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';
$isMobile = preg_match('/Mobile|Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i', $userAgent);

// 뷰어 모드가 아닌 에디터 모드인데 모바일로 접속한 경우 유지보수(maint.html) 페이지를 즉시 출력하고 종료
if (!$isViewerMode && $isMobile) {
    include('maint.html');
    exit;
}

$ogTitle = '“홈페이지 유지보수 의뢰서를 생성해보세요.”';
$pageTitle = $ogTitle;
$ogImage = ''; // Default image or fallback if necessary

if ($isViewerMode) {
    if (function_exists('sql_fetch')) {
        $sql = " SELECT * FROM `g5_jaebong_documents` WHERE `id` = '{$id_esc}' ";
        $row = sql_fetch($sql);
        if ($row) {
            $ogTitle = '“홈페이지 수정사항을 정리하여 보내드립니다. 검토 부탁드립니다.”';
            $pageTitle = $ogTitle;

            // Extract the first image from history_json
            $historyData = json_decode($row['history_json'], true);
            if ($historyData && is_array($historyData)) {
                $historyArray = isset($historyData['history']) ? $historyData['history'] : $historyData;
                if (!empty($historyArray) && is_array($historyArray)) {
                    foreach ($historyArray as $item) {
                        if (!empty($item['thumb'])) {
                            $ogImage = $item['thumb'];
                            break;
                        } elseif (!empty($item['full'])) {
                            $ogImage = $item['full'];
                            break;
                        }
                    }
                }
            }
        }
    }
}
?>
<!doctype html>
<html lang="ko">

<head>
    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-MRQF5TXS');</script>
    <!-- End Google Tag Manager -->

    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title><?= htmlspecialchars($pageTitle) ?></title>
    <meta property="og:title" content="<?= htmlspecialchars($ogTitle) ?>">
    <?php if ($ogImage): ?>
    <meta property="og:image" content="<?= htmlspecialchars($ogImage) ?>">
    <?php endif; ?>

    <!-- PDF 및 QR 관련 스크립트 임시 비활성화 (Task 008, 002) -->
    <!-- <script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script> -->
    <!-- <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script> -->
    <!-- <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script> -->

    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/viewer.css">
<?php if (!$isViewerMode): ?>
    <link rel="stylesheet" href="css/loading.css">
<?php endif; ?>
</head>

<body>
    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MRQF5TXS"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->

    <div class="topbar">
        <div class="logo-area">
            <img src="/jaebong_v2/assets/img/logo01.png" alt="">
            <div class="beta01">Beta</div>
        </div>
        <div class="top-msg" id="topMessage"><?= $isViewerMode ? htmlspecialchars($pageTitle) : '“홈페이지 유지보수 의뢰서를 생성해보세요.”' ?></div>
        <div class="top-btns">
            <div id="editorBtns" style="display:<?= $isViewerMode ? 'none' : 'flex' ?>; gap:8px;">
                <button class="btn-std" id="btnShowTutorial"
                    style="background:#fff; border:1px solid #ddd; border-radius:100%; padding:0; width:36px; height:36px; display:flex; align-items:center; justify-content:center; color:#555;"
                    title="튜토리얼 다시보기">💡</button>
                <button class="btn-std" id="btnResetAll">의뢰서 초기화</button>
                <!-- PDF 다운로드 버튼 비활성화 (Task 008) -->
                <button class="btn-black" id="exportBtn" disabled style="display:none;">PDF 다운로드</button>
                <button class="btn-blue" id="shareLinkBtn" disabled>🔗 웹 링크 생성 (공유)</button>
            </div>

            <div id="viewerBtns" style="display:none; gap:8px;">
                <button class="btn-std" id="backToEditBtn">✎ 편집 모드로 돌아가기</button>
                <button class="btn-black" id="btnCopyLinkViewer">🔗 공유 링크 복사</button>
            </div>
        </div>
    </div>

    <?php if (!$isViewerMode): ?>
    <div class="layer active" id="editorLayer">
        <div class="workspace">
            <div class="col" id="step1Panel" style="overflow: hidden; display: flex; flex-direction: column;">
                <!-- Tutorial Step 1 Target Area -->
                <div id="tut-step1-area">
                    <div class="col-hd">
                        <div><span class="step-badge">STEP 01</span><span class="col-title">이미지 가져오기</span></div>
                    </div>
                    <div class="col-bd" style="padding-bottom: 10px;">
                        <div style="margin-bottom:12px;">
                            <div style="font-size:12px; font-weight:800; color:#555; margin-bottom:6px;">홈페이지 주소로 자동 캡처 <span style="color:#ef4444;">(현재 무료)</span></div>
                            <input type="text" id="urlCaptureIn" class="url-input" placeholder="https://..."
                                style="width:100%; box-sizing:border-box;">
                            <button class="btn-black" id="btnUrlCapture" style="width:100%; margin-top:8px; padding:12px; font-size:13px;">AI로 페이지 가져오기</button>
                        </div>

                        <div style="display:none; align-items:center; gap:8px; margin: 10px 0; font-size:11px; color:#aaa;">
                            <hr style="flex:1; border:0; border-top:1px solid #eee;">또는 직접 캡처
                            <hr style="flex:1; border:0; border-top:1px solid #eee;">
                        </div>

                        <button class="btn-capture" id="btnScreenCapture" style="display: none;">
                            📸 내 홈페이지 화면 캡처
                            <span style="font-weight:normal; color:#aaa; font-size:11px;">(클릭 후 브라우저 탭 선택)</span>
                        </button>

                        <div style="display:flex; align-items:center; gap:8px; margin: 10px 0; font-size:11px; color:#aaa;">
                            <hr style="flex:1; border:0; border-top:1px solid #eee;">또는
                            <hr style="flex:1; border:0; border-top:1px solid #eee;">
                        </div>

                        <button class="btn-std" id="btnOpenImg"
                            style="width:100%; border:1px solid #ddd; background:#fff; padding:14px;">📂 파일 열기 /
                            Ctrl+V</button>
                        <input type="file" id="fileIn" accept="image/*" style="display:none">
                    </div>
                </div>

                <!-- Tutorial Step 4 Target Area -->
                <div class="col-bd" id="tut-step4-area" style="flex: 1; padding-top: 10px; display: flex; flex-direction: column; overflow: hidden;">
                    <div
                        style="font-size:12px; font-weight:800; color:var(--action-pink); margin-bottom:8px; display:flex; justify-content:space-between; border-bottom:2px solid #eee; padding-bottom:6px;">
                        <span>요청사항 리스트</span>
                        <span id="queueCount">0건</span>
                    </div>
                    <div style="flex: 1; overflow-y: auto;" id="reqList">
                        <div style="text-align:center; padding:30px 10px; color:#9ca3af; font-size:12px;">
                            등록된 요청사항이 없습니다.
                        </div>
                    </div>
                </div>
            </div>

            <div class="col" id="step2Panel">
                <div class="col-hd">
                    <div><span class="step-badge">STEP 02</span><span class="col-title">WORK CANVAS</span></div>
                </div>
                <div class="canvas-controls" style="display:none;">
                    <div>
                        <span class="input-label">Page URL</span>
                        <input type="text" class="url-input" id="urlIn"
                            placeholder="의뢰하실 홈페이지의 주소를 입력해주세요 (예: https://...)">
                    </div>
                </div>

                <div class="canvas-area-wrapper">
                    <div style="display: flex; flex: 1; overflow: hidden; min-height: 0;">
                        <div class="canvas-scroll-container" id="scrollContainer">
                            <div class="canvas-content" id="canvasWrapper">
                                <canvas id="mainCanvas"></canvas>
                                <!-- 자산 모드 오버레이 -->
                                <div id="assetModeOverlay" class="asset-mode-overlay" style="display:none;">
                                    <div class="asset-grid-container">
                                        <div class="asset-group">
                                            <div class="asset-group-title">🌐 인프라 / 서비스</div>
                                            <div class="asset-items">
                                                <div class="asset-item" data-key="domain">
                                                    <span class="asset-icon">🌐</span>
                                                    <span class="asset-name">도메인</span>
                                                </div>
                                                <div class="asset-item" data-key="hosting">
                                                    <span class="asset-icon">☁️</span>
                                                    <span class="asset-name">호스팅</span>
                                                </div>
                                                <div class="asset-item" data-key="server">
                                                    <span class="asset-icon">🖥️</span>
                                                    <span class="asset-name">서버</span>
                                                </div>
                                                <div class="asset-item" data-key="ssl">
                                                    <span class="asset-icon">🔒</span>
                                                    <span class="asset-name">SSL 인증서</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="asset-group">
                                            <div class="asset-group-title">🚚 이전 / 백업</div>
                                            <div class="asset-items">
                                                <div class="asset-item" data-key="migration">
                                                    <span class="asset-icon">🚀</span>
                                                    <span class="asset-name">사이트 이전</span>
                                                </div>
                                                <div class="asset-item" data-key="db">
                                                    <span class="asset-icon">🗄️</span>
                                                    <span class="asset-name">DB 이전</span>
                                                </div>
                                                <div class="asset-item" data-key="backup">
                                                    <span class="asset-icon">💾</span>
                                                    <span class="asset-name">백업/복구</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="asset-group">
                                            <div class="asset-group-title">🔑 계정 정보 분실</div>
                                            <div class="asset-items">
                                                <div class="asset-item" data-key="site-access">
                                                    <span class="asset-icon">🌍</span>
                                                    <span class="asset-name">사이트 접속 불가</span>
                                                </div>
                                                <div class="asset-item" data-key="admin-access">
                                                    <span class="asset-icon">🛡️</span>
                                                    <span class="asset-name">관리자 분실</span>
                                                </div>
                                                <div class="asset-item" data-key="account-lost">
                                                    <span class="asset-icon">👤</span>
                                                    <span class="asset-name">계정/비밀번호 분실</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- VSCode Style Minimap -->
                        <div id="minimapContainer" class="minimap-container">
                            <div id="minimapInner" class="minimap-inner">
                                <canvas id="minimapCanvas"></canvas>
                                <div id="minimapViewport" class="minimap-viewport"></div>
                            </div>
                        </div>
                    </div>

                    <div class="center-footer">
                        <textarea id="reqDesc" class="desc-input" placeholder="이 페이지에 대한 전체적인 참고사항을 입력하세요.
예시) 이미지는 추후 전달드리겠습니다, 이미지 직접 수급 부탁드립니다, www.susunzip.com 해당 레퍼런스 참고하여 디자인 리뉴얼 부탁드립니다."></textarea>

                        <div class="center-action-row">
                            <div class="cat-wrapper" style="margin-right:12px; padding:4px; background:transparent;">
                                <div class="cat-bar" style="grid-template-columns: repeat(5, 1fr); gap:6px;">
                                    <button class="cat-btn" data-val="text" style="flex-direction:row; padding:6px 10px;">
                                        <span class="cat-icon" style="margin:0;">📝</span>내용 수정
                                    </button>
                                    <button class="cat-btn" data-val="layout" style="flex-direction:row; padding:6px 10px;">
                                        <span class="cat-icon" style="margin:0;">📐</span>항목 추가
                                    </button>
                                    <button class="cat-btn" data-val="func" style="flex-direction:row; padding:6px 10px;">
                                        <span class="cat-icon" style="margin:0;">🛠️</span>기능 수정
                                    </button>
                                    <button class="cat-btn" data-val="image" style="flex-direction:row; padding:6px 10px;">
                                        <span class="cat-icon" style="margin:0;">✨</span>기능 개발
                                    </button>
                                    <button class="cat-btn" data-val="asset" id="catAssetBtn" style="flex-direction:row; padding:6px 10px; border-color:var(--action-pink); color:var(--action-pink);">
                                        <span class="cat-icon" style="margin:0;">🏠</span>자산 관련
                                    </button>
                                </div>
                            </div>

                            <div style="display:flex; gap:8px; flex-shrink:0;">
                                <button class="btn-std" id="toggleZoomBtn" style="display:none;">🔍</button>
                                <button class="btn-std" id="cancelEditBtn"
                                    style="display:none; background:#fee2e2; color:var(--danger); border:none;">수정
                                    취소</button>
                                <button class="btn-pink" id="saveReqBtn" disabled style="padding:10px 20px; width:auto;">← 리스트 추가하기</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col" id="step3Panel">
                <div class="col-hd">
                    <div><span class="step-badge">STEP 03</span><span class="col-title">요청사항 메모 생성</span></div>
                </div>

                <div class="col-bd">
                    <div class="guide-box" id="guideText">
                        <b>캔버스</b>에서 수정하고 싶은 부분을<br>마우스로 드래그하여 박스를 그려주세요.<br><br>
                        <span style="font-size:11px; color:var(--action-pink);">(박스를 클릭하면 다시 수정할 수 있습니다)</span>
                    </div>

                    <div class="memo-panel" id="memoPanel">
                        <div
                            style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <span style="font-weight:800; font-size:13px;" id="memoPanelTitle">선택 영역 메모</span>
                            <button style="background:transparent; color:#ef4444; font-size:11px;" id="deleteMemoBtn"
                                style="display:none;">삭제</button>
                        </div>

                        <textarea id="memoInput" class="memo-input" placeholder="선택 영역에 대한 전/후 내용을 설명해주세요.
예시) 고객센터 -> 고객문의로 변경해주세요."></textarea>

                        <div id="memoImgPreviewArea" style="display:none; margin-top:8px; position:relative; border-radius:8px; overflow:hidden; border:1px solid #ddd;">
                            <img id="memoImgPreview" src="" style="width:100%; display:block;">
                            <button id="btnDelMemoImg" style="position:absolute; top:5px; right:5px; background:rgba(0,0,0,0.5); color:#fff; border:none; border-radius:100%; width:24px; height:24px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center;">&times;</button>
                        </div>

                        <button class="btn-std" id="btnAttachMemoImg" style="width:100%; margin-top:8px; border:1px solid #ddd; background:#fff; font-size:12px; padding:8px;">🖼️ 참고 이미지 첨부</button>
                        <input type="file" id="memoFileIn" accept="image/*" style="display:none">

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


    <div class="layer" id="captureLayer" style="background: rgba(243, 244, 246, 0.9); backdrop-filter: blur(8px); z-index: 10000; display:none; flex-direction:column; align-items:center; justify-content:center; position:fixed; inset:0;">
        <div class="load-card" style="width: 420px; padding: 60px 40px; text-align:center;">
            <div class="ring-wrap" style="width: 140px; height: 140px; margin: 0 auto 40px;">
                <div class="track" style="border-width: 2px; opacity: 0.1;"></div>
                
                <!-- Infinite Radar Effect -->
                <div class="radar-pulse" style="animation-delay: 0s;"></div>
                <div class="radar-pulse" style="animation-delay: 0.8s;"></div>
                <div class="radar-pulse" style="animation-delay: 1.6s;"></div>

                <div class="load-center-wrap">
                    <div class="center-circle" style="width: 60px; height: 60px; background: #fff; border: 2px solid var(--action-pink); animation: pulse-soft 2s infinite;">
                        <span class="center-label" style="font-size: 11px; font-weight: 800;">SCAN</span>
                    </div>
                </div>
            </div>
            <h2 class="main-title" id="captureStatusText" style="font-size: 20px; font-weight: 800; color:var(--primary); margin-bottom: 12px;">주소를 검색하는 중</h2>
            <p class="sub-title" style="margin-bottom: 0; font-size: 14px; opacity: 0.7;">AI가 홈페이지를 검색하고, 분석하여, 캡쳐해 옵니다.<br>페이지 길이에 따라 최대 1분이 소요될 수 있습니다.</p>
        </div>
    </div>

    <div class="layer" id="loadingLayer">
        <div class="load-card">
            <!-- 링 -->
            <div class="ring-wrap">
                <div class="track"></div>
                <div class="track t2"></div>

                <!-- 호형 진행바 SVG -->
                <svg class="arc-svg" viewBox="0 0 200 200">
                    <circle class="arc-bg" cx="100" cy="100" r="90" />
                    <circle class="arc-fill" cx="100" cy="100" r="90" />
                </svg>

                <!-- 바깥 회전 심볼 링 -->
                <div class="disk cw" id="outerDisk"></div>
                <!-- 안쪽 역방향 링 -->
                <div class="disk ccw" id="innerRing"></div>

                <!-- 중앙 -->
                <div class="load-center-wrap">
                    <div class="center-circle">
                        <span class="center-pct" id="loadPct">0%</span>
                        <span class="center-label">GEN</span>
                    </div>
                </div>
            </div>

            <!-- 텍스트 -->
            <p class="main-title">유지보수 의뢰서 페이지를 생성중입니다.</p>
            <p class="sub-title">잠시만 기다려주세요.</p>

            <!-- 스텝 리스트 -->
            <div class="load-steps" id="loadStepList">
                <div class="step-row active" id="s0">
                    <div class="step-icon">⋯</div>
                    <span class="step-text">이미지 및 URL 정보 수집</span>
                    <span class="step-tag">IN PROGRESS</span>
                </div>
                <div class="step-row idle" id="s1">
                    <div class="step-icon">·</div>
                    <span class="step-text">요청사항 카테고리 분석</span>
                    <span class="step-tag">WAITING</span>
                </div>
                <div class="step-row idle" id="s2">
                    <div class="step-icon">·</div>
                    <span class="step-text">문서 구조 렌더링</span>
                    <span class="step-tag">WAITING</span>
                </div>
                <div class="step-row idle" id="s3">
                    <div class="step-icon">·</div>
                    <span class="step-text">공유 링크 생성</span>
                    <span class="step-tag">WAITING</span>
                </div>
            </div>

            <!-- 결과 확인 버튼 -->
            <button class="loading-result-btn" id="btnCompleteLoad" disabled>결과 확인하기 ➔</button>
        </div>
    </div>
    <?php endif; ?>

    <div class="layer <?= $isViewerMode ? 'active' : '' ?>" id="viewerLayer">
        <div class="viewer-layout">
            <div class="view-main">
                <div class="view-paper" id="viewPaper">
                    <div class="paper-header">
                        <div>
                            <div class="paper-title">웹사이트 유지보수 의뢰서</div>
                            <div class="paper-sub">작성일: <span id="viewDate">-</span> | 작성자: Client (Guest)</div>
                        </div>
                        <div style="text-align:right;">
                            <img src="/jaebong_v2/assets/img/logo01.png" alt="재봉툴">
                        </div>
                    </div>

                    <div id="viewContentArea">
                    </div>
                </div>
            </div>

            <!-- 채팅 사이드바 비활성화 (Task 009) -->
            <div class="view-sidebar" style="display:none;">
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
    <div id="imageModalViewer" class="viewer-img-modal" style="display:none;">
        <span class="viewer-img-close" id="closeViewerModal">&times;</span>
        <div class="viewer-modal-container">
            <div id="viewerCanvasWrapper" class="viewer-canvas-wrapper">
                <img class="viewer-img-content" id="viewerModalImg">
                <div id="viewerAnnoOverlay" class="viewer-anno-overlay"></div>
            </div>
        </div>
    </div>

    <!-- Tooltip/Memo Popup (Desktop) - Out of scroll container to fix position:fixed -->
    <div id="viewerMemoTooltip" class="viewer-memo-tooltip" style="display:none;"></div>

    <!-- Mobile Bottom Sheet - Out of scroll container to fix position:fixed -->
    <div id="viewerMobileBottomSheet" class="viewer-bottom-sheet">
        <div class="sheet-handle"></div>
        <button id="btnCloseSheet" class="sheet-close-btn">&times;</button>
        <div class="sheet-content" id="viewerSheetContent"></div>
    </div>

    <div class="app-footer">
        <div><strong>JAEBONGTOOL</strong> | Contact: contact@susunzip.com</div>
        <div>© 2026 SOMETHINGHOW. All rights reserved.</div>
    </div>

    <?php if (!$isViewerMode): ?>
    <div id="tutorialOverlay">
        <div id="tutorialBg"></div>
        <div class="tut-spotlight" id="tutSpot"></div>
        <div class="tut-spotlight" id="tutSpot2"></div>
        <div class="tut-card" id="tutCard">
            <div class="tut-step" id="tutStep">STEP 1</div>
            <h3 class="tut-title" id="tutTitle">이미지 불러오기</h3>
            <p class="tut-desc" id="tutDesc">설명 텍스트</p>
            <div style="display: flex; justify-content: flex-end; gap: 8px;">
                <button class="tut-btn" id="tutNext">다음</button>
                <button class="tut-btn tut-btn-skip" id="tutSkip">Skip</button>
            </div>
        </div>
    </div>
    <?php endif; ?>

    <!-- QR 숨김 영역 비활성화 (Task 002) -->
    <!-- <div id="qrHidden" style="display:none;"></div> -->

    <?php if ($isViewerMode): ?>
        <script type="module" src="js/viewer-main.js"></script>
    <?php else: ?>
        <script type="module" src="js/main.js"></script>
    <?php endif; ?>
</body>

</html>