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

            // history_json 칼럼이 제거되었으므로, 직접 아이템 테이블에서 첫 번째 이미지 추출
            $item_sql = " SELECT item_json FROM `g5_jaebong_items` WHERE `document_id` = '{$id_esc}' ORDER BY `sort_order` ASC LIMIT 1 ";
            $item_row = sql_fetch($item_sql);
            if ($item_row) {
                $itemData = json_decode($item_row['item_json'], true);
                if ($itemData) {
                    // 이미지 UUID -> 실제 URL 변환 시도 ( images 테이블 조회 )
                    $thumb_url = !empty($itemData['thumb']) ? $itemData['thumb'] : (!empty($itemData['full']) ? $itemData['full'] : '');

                    if (strpos($thumb_url, 'UUID:') === 0) {
                        $uuid = str_replace('UUID:', '', $thumb_url);
                        $asset_row = sql_fetch(" SELECT url FROM `g5_jaebong_images` WHERE `image_uuid` = '{$uuid}' AND `is_deleted` = 0 ");
                        if ($asset_row) {
                            $thumb_url = $asset_row['url'];
                        }
                    }
                    $ogImage = $thumb_url;
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
    <script>(function (w, d, s, l, i) {
            w[l] = w[l] || []; w[l].push({
                'gtm.start':
                    new Date().getTime(), event: 'gtm.js'
            }); var f = d.getElementsByTagName(s)[0],
                j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : ''; j.async = true; j.src =
                    'https://www.googletagmanager.com/gtm.js?id=' + i + dl; f.parentNode.insertBefore(j, f);
        })(window, document, 'script', 'dataLayer', 'GTM-MRQF5TXS');</script>
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
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MRQF5TXS" height="0" width="0"
            style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->

    <div class="topbar">
        <div class="logo-area">
            <img src="/jaebong/img/logo01.png" alt="">
            <div class="beta01">Beta</div>
        </div>
        <div class="top-msg" id="topMessage">
            <?= $isViewerMode ? htmlspecialchars($pageTitle) : '“홈페이지 유지보수 의뢰서를 생성해보세요.”' ?>
        </div>
        <div class="top-btns">
            <div id="editorBtns" style="display:<?= $isViewerMode ? 'none' : 'flex' ?>; gap:8px;">
                <button class="btn-std" id="btnShowTutorial"
                    style="background:#fff; border:1px solid #ddd; border-radius:8px; padding:0 12px; height:36px; display:flex; align-items:center; justify-content:center; color:#555; font-size:12px; font-weight:700;"
                    title="튜토리얼 다시보기"><span style="font-size:16px; margin-right:4px;">💡</span>재봉툴 사용법</button>
                <!-- PDF 다운로드 버튼 비활성화 (Task 008) -->

                <button class="btn-black" id="exportBtn" disabled style="display:none;">PDF 다운로드</button>
                <button class="btn-blue" id="shareLinkBtn" disabled
                    style="padding:0 16px; height:36px; font-weight:800;">🔗 홈페이지 유지보수 의뢰서 생성하기</button>
            </div>

            <div id="viewerBtns" style="display:<?= $isViewerMode ? 'flex' : 'none' ?>; gap:8px;">
                <button class="btn-blue" id="btnLandingCreate" onclick="location.href='/jaebong/'"
                    style="padding:0 16px; height:36px; font-weight:800; display:none; background:#DD600B;">홈페이지 유지보수
                    의뢰서 생성해보기</button>
            </div>
        </div>
    </div>

    <?php if (!$isViewerMode): ?>
        <div class="layer active" id="editorLayer">
            <div class="workspace">
                <div style="display:flex; flex-direction:column; gap:20px; overflow:hidden;">
                    <div class="col" id="step1Panel" style="display: flex; flex-direction: column;">
                        <!-- Tutorial Step 1 Target Area -->
                        <div id="tut-step1-area">
                            <div class="col-hd">
                                <div><span class="step-badge">STEP 01</span><span class="col-title">요청사항 생성하기</span></div>
                            </div>
                            <div class="col-bd" style="padding-bottom: 20px;">
                                <div style="display:none; margin-bottom:12px;">
                                    <div style="font-size:12px; font-weight:800; color:#555; margin-bottom:6px;">홈페이지 주소로 자동
                                        캡처 <span style="color:#ef4444;">(현재 무료)</span></div>
                                    <input type="text" id="urlCaptureIn" class="url-input" placeholder="https://..."
                                        style="width:100%; box-sizing:border-box;">
                                    <button class="btn-black" id="btnUrlCapture"
                                        style="width:100%; margin-top:8px; padding:12px; font-size:13px;">AI로 페이지
                                        가져오기</button>
                                </div>

                                <div
                                    style="display:none; align-items:center; gap:8px; margin: 10px 0; font-size:11px; color:#aaa;">
                                    <hr style="flex:1; border:0; border-top:1px solid #eee;">또는 직접 캡처
                                    <hr style="flex:1; border:0; border-top:1px solid #eee;">
                                </div>

                                <button class="btn-capture" id="btnScreenCapture" style="display: none;">
                                    📸 내 홈페이지 화면 캡처
                                    <span style="font-weight:normal; color:#aaa; font-size:11px;">(클릭 후 브라우저 탭 선택)</span>
                                </button>

                                <div
                                    style="display:none; align-items:center; gap:8px; margin: 10px 0; font-size:11px; color:#aaa;">
                                    <hr style="flex:1; border:0; border-top:1px solid #eee;">또는
                                    <hr style="flex:1; border:0; border-top:1px solid #eee;">
                                </div>

                                <button class="btn-std" id="btnOpenImg"
                                    style="width:100%; color: #fff; background:#000; padding:14px;">
                                    이미지 불러오기 (여러장 가능)
                                </button>
                                <button class="btn-std" id="btnOtherIssues"
                                    style="width:100%; color: #fff; background:#000; padding:12px; font-size:12px;">
                                    🛠️ 홈페이지 다른 문제</button>
                                <input type="file" id="fileIn" accept="image/*" multiple style="display:none">
                            </div>
                        </div>
                    </div>

                    <!-- Tutorial Step 4 Target Area -->
                    <div class="col" id="tut-step4-area"
                        style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
                        <div class="col-bd queue-container">
                            <div class="queue-header">
                                <span>요청사항 목록</span>
                                <button id="btnResetAll"
                                    style="padding:4px 10px; font-size:11px; color:#ef4444; background:#fef2f2; border:1px solid #fee2e2; border-radius:6px; font-weight:800; cursor:pointer;">초기화</button>
                            </div>

                            <div class="queue-tabs-row">
                                <div class="history-tabs"
                                    style="display:flex; background:#f3f4f6; border-radius:8px; padding:3px; gap:2px;">
                                    <div class="history-tab active" id="tabIncomplete"
                                        style="padding:6px 12px; font-size:11px; font-weight:800; cursor:pointer; border-radius:6px; border:1px solid transparent; transition:0.2s;">
                                        작성중</div>
                                    <div class="history-tab" id="tabComplete"
                                        style="padding:6px 12px; font-size:11px; font-weight:800; cursor:pointer; border-radius:6px; border:1px solid transparent; transition:0.2s; color:#9ca3af;">
                                        작성 완료</div>
                                </div>
                                <div id="queueCount">
                                    0건</div>
                            </div>

                            <div id="reqList">
                                <div></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col" id="step2Panel">
                    <div class="col-hd">
                        <div><span class="step-badge">STEP 02</span><span class="col-title">요청사항 작업화면</span><span
                                id="currentEditingNum"
                                style="margin-left:8px; font-weight:800; color:var(--text-muted); font-size:13px;"></span>
                        </div>
                        <div id="zoomControls" style="display:none; align-items:center; gap:10px; padding-right:4px;">
                            <button id="btnZoomOut"
                                style="width:24px; height:24px; padding:0; background:#f3f4f6; color:#666; font-size:14px; border:1px solid #d1d5db; border-radius:4px;">-</button>
                            <input type="range" id="zoomRange" min="50" max="200" value="100" step="1"
                                style="width:80px; height:4px; cursor:pointer; -webkit-appearance:none; border-radius:10px; background:#e5e7eb; outline:none;">
                            <button id="btnZoomIn"
                                style="width:24px; height:24px; padding:0; background:#f3f4f6; color:#666; font-size:14px; border:1px solid #d1d5db; border-radius:4px;">+</button>
                            <span id="zoomPct"
                                style="font-size:11px; font-weight:800; color:#6b7280; width:46px; text-align:right; cursor:pointer; user-select:none;">100%</span>
                        </div>
                    </div>


                    <div class="canvas-controls" style="display:none;"></div>

                    <div class="canvas-area-wrapper">
                        <div style="display: flex; flex: 1; overflow: hidden; min-height: 0;">
                            <div class="canvas-scroll-container" id="scrollContainer">
                                <div class="canvas-content" id="canvasWrapper">
                                    <canvas id="mainCanvas"></canvas>
                                    <!-- 자산 모드 오버레이 -->
                                    <div id="assetModeOverlay" class="asset-mode-overlay" style="display:none;">
                                        <div class="asset-grid-container">
                                            <div class="asset-group"
                                                style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
                                                <div class="asset-group-title"
                                                    style="color: #1e293b; font-size: 14px; margin-bottom: 16px;">❓ 접속/오류 관련
                                                </div>
                                                <div class="asset-items">
                                                    <div class="asset-item" data-key="issue-not-open">
                                                        <span class="asset-icon">🚫</span>
                                                        <span class="asset-name">홈페이지가 아예 안 열려요</span>
                                                    </div>
                                                    <div class="asset-item" data-key="issue-page-error">
                                                        <span class="asset-icon">🚧</span>
                                                        <span class="asset-name">특정 페이지가 안 들어가져요</span>
                                                    </div>
                                                    <div class="asset-item" data-key="issue-bug">
                                                        <span class="asset-icon">⚠️</span>
                                                        <span class="asset-name">갑자기 오류가 발생해요</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="asset-group"
                                                style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
                                                <div class="asset-group-title"
                                                    style="color: #1e293b; font-size: 14px; margin-bottom: 16px;">🔐 계정/정보
                                                    분실</div>
                                                <div class="asset-items">
                                                    <div class="asset-item" data-key="lost-admin">
                                                        <span class="asset-icon">👤</span>
                                                        <span class="asset-name">관리자 로그인 정보를 잊어버렸어요</span>
                                                    </div>
                                                    <div class="asset-item" data-key="lost-server-info">
                                                        <span class="asset-icon">🛡️</span>
                                                        <span class="asset-name">FTP / 서버 접속 정보를 몰라요</span>
                                                    </div>
                                                    <div class="asset-item" data-key="lost-where">
                                                        <span class="asset-icon">🧭</span>
                                                        <span class="asset-name">어디서 관리하는지 모르겠어요</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="asset-group"
                                                style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
                                                <div class="asset-group-title"
                                                    style="color: #1e293b; font-size: 14px; margin-bottom: 16px;">⚡ 속도/성능 문제
                                                </div>
                                                <div class="asset-items">
                                                    <div class="asset-item" data-key="perf-slow">
                                                        <span class="asset-icon">🐌</span>
                                                        <span class="asset-name">홈페이지가 너무 느려요</span>
                                                    </div>
                                                    <div class="asset-item" data-key="perf-loading">
                                                        <span class="asset-icon">⏳</span>
                                                        <span class="asset-name">접속은 되는데 로딩이 오래 걸려요</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="asset-group"
                                                style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
                                                <div class="asset-group-title"
                                                    style="color: #1e293b; font-size: 14px; margin-bottom: 16px;">🚚 이전/이사
                                                </div>
                                                <div class="asset-items">
                                                    <div class="asset-item" data-key="move-site">
                                                        <span class="asset-icon">🚀</span>
                                                        <span class="asset-name">홈페이지를 다른 곳으로 옮기고 싶어요</span>
                                                    </div>
                                                    <div class="asset-item" data-key="move-hosting">
                                                        <span class="asset-icon">☁️</span>
                                                        <span class="asset-name">서버/호스팅을 바꾸고 싶어요</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="asset-group"
                                                style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
                                                <div class="asset-group-title"
                                                    style="color: #1e293b; font-size: 14px; margin-bottom: 16px;">🌐 도메인/주소
                                                    문제</div>
                                                <div class="asset-items">
                                                    <div class="asset-item" data-key="issue-domain">
                                                        <span class="asset-icon">🔗</span>
                                                        <span class="asset-name">도메인이 연결이 안 돼요</span>
                                                    </div>
                                                    <div class="asset-item" data-key="issue-url-change">
                                                        <span class="asset-icon">📍</span>
                                                        <span class="asset-name">주소를 바꾸고 싶어요</span>
                                                    </div>
                                                    <div class="asset-item" data-key="issue-ssl">
                                                        <span class="asset-icon">🔒</span>
                                                        <span class="asset-name">SSL(보안) 경고가 떠요</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="asset-group"
                                                style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
                                                <div class="asset-group-title"
                                                    style="color: #1e293b; font-size: 14px; margin-bottom: 16px;">💬 기타
                                                </div>
                                                <div class="asset-items">
                                                    <div class="asset-item" data-key="issue-unknown">
                                                        <span class="asset-icon">🤔</span>
                                                        <span class="asset-name">뭐가 문제인지 모르겠어요</span>
                                                    </div>
                                                    <div class="asset-item" data-key="issue-consult">
                                                        <span class="asset-icon">📞</span>
                                                        <span class="asset-name">상담이 필요해요</span>
                                                    </div>
                                                    <div class="asset-item" id="btnAssetDirect">
                                                        <span class="asset-icon">✍️</span>
                                                        <span class="asset-name">직접 입력할게요</span>
                                                        <input type="text" class="asset-direct-input"
                                                            placeholder="문제를 직접 입력해주세요"
                                                            style="display:none; flex:1; border:none; outline:none; font-size:13px; background:transparent;">
                                                        <div class="asset-direct-controls" style="display:none; gap:6px;">
                                                            <button class="btn-asset-direct delete"
                                                                style="display:none; padding:4px 10px; font-size:11px; background:#fee2e2; color:#ef4444; border-radius:6px; font-weight:700;">삭제</button>
                                                            <button class="btn-asset-direct cancel"
                                                                style="padding:4px 10px; font-size:11px; background:#f1f5f9; color:#64748b; border-radius:6px; border:1px solid #e2e8f0;">취소</button>
                                                            <button class="btn-asset-direct confirm"
                                                                style="padding:4px 10px; font-size:11px; background:#DD600B; color:#fff; border-radius:6px;">확인</button>
                                                        </div>
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
                            <div class="center-action-row" id="centerActionRow" style="display:flex; gap:8px;">
                                <button class="btn-std" id="toggleZoomBtn" style="display:none;">🔍</button>
                                <button class="btn-std" id="cancelEditBtn" disabled
                                    style="flex:1; background:#fee2e2; color:var(--danger); border:none; padding:12px; font-weight:700;">작업
                                    취소</button>
                                <button class="btn-std" id="saveReqBtn" disabled
                                    style="flex:4; background:#DD600B; color:#fff; border:none; padding:12px; font-weight:700;">저장하기</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col" id="step3Panel">
                    <div class="col-hd">
                        <div><span class="step-badge">STEP 03</span><span class="col-title">요청사항 설명 도구</span></div>
                    </div>

                    <div class="col-bd">
                        <div id="normalSubtitleWrapper"
                            style="margin-bottom: 20px; padding: 0 10px; font-weight: 800; font-size: 14px; color: #555; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                            메모 생성하기
                        </div>
                        <div class="guide-box" id="guideText">
                            <b>좌측의 요청사항 작업화면</b>에서 수정하고 싶은<br> 부분을 마우스로 드래그하여 박스를 그려주세요.<br><br>
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

                            <div id="memoImgPreviewArea"
                                style="display:none; margin-top:8px; position:relative; border-radius:8px; overflow:hidden; border:1px solid #ddd;">
                                <img id="memoImgPreview" src="" style="width:100%; display:block;">
                                <button id="btnDelMemoImg"
                                    style="position:absolute; top:5px; right:5px; background:rgba(0,0,0,0.5); color:#fff; border:none; border-radius:100%; width:24px; height:24px; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center;">&times;</button>
                            </div>

                            <button class="btn-std" id="btnAttachMemoImg"
                                style="width:100%; margin-top:8px; border:1px solid #ddd; background:#fff; font-size:12px; padding:8px;">🖼️
                                참고 이미지 첨부</button>
                            <input type="file" id="memoFileIn" accept="image/*" style="display:none">

                            <div style="display:flex; gap:8px; margin-top:8px;">
                                <button class="btn-std" id="cancelMemoBtn" style="flex:1;">취소</button>
                                <button class="btn-black" id="confirmMemoBtn" style="flex:2;">확인</button>
                            </div>
                        </div>

                        <div class="anno-list-container" id="annoList"></div>

                        <div id="reqDescWrapper" style="display:none;">
                            <!-- 1. Page URL (Required) -->
                            <div style="margin-bottom:20px;">
                                <div
                                    style="font-size:12px; font-weight:800; color:#555; margin-bottom:8px; padding-left:2px;">
                                    Page URL (필수)<span style="color: var(--action-pink);">*</span></div>
                                <input type="text" class="url-input" id="urlIn"
                                    placeholder="홈페이지 주소를 입력해주세요. (예: https://...)">
                            </div>

                            <!-- 2. Additional Description (Optional) -->
                            <div style="margin-bottom:20px;">
                                <div
                                    style="font-size:12px; font-weight:800; color:#555; margin-bottom:8px; padding-left:2px;">
                                    요청사항 추가설명 (선택)</div>
                                <textarea id="reqDesc" class="desc-input" placeholder="선택한 문제 상황에 대한 상세 내용을 입력해 주세요.
예시) 갑자기 홈페이지 접속이 안 됩니다, 관리자 비밀번호를 잊어버렸습니다, 사이트를 다른 서버로 옮기고 싶습니다." style="height:100px;"></textarea>
                            </div>

                            <!-- 3. Other Issues List (Synced) -->
                            <div>
                                <div
                                    style="font-size:12px; font-weight:800; color:#555; margin-bottom:8px; padding-left:2px;">
                                    다른문제 리스트</div>
                                <div id="assetSelectionList"
                                    style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px; min-height:60px; display:flex; flex-direction:column; gap:6px;">
                                    <div style="color:#94a3b8; font-size:12px; text-align:center; padding:15px;"
                                        id="assetSelectionEmpty">선택된 항목이 없습니다.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>


        <div id="captureLayer" class="overlay-layer">
            <div class="load-card" style="width:440px; padding: 60px 40px; text-align:center;">
                <div class="ring-wrap" style="width: 140px; height: 140px; margin: 0 auto 40px;">
                    <div class="track" style="border-width: 2px; opacity: 0.1;"></div>

                    <!-- Infinite Radar Effect -->
                    <div class="radar-pulse" style="animation-delay: 0s;"></div>
                    <div class="radar-pulse" style="animation-delay: 0.8s;"></div>
                    <div class="radar-pulse" style="animation-delay: 1.6s;"></div>

                    <div class="load-center-wrap">
                        <div class="center-circle"
                            style="width: 60px; height: 60px; background: #fff; border: 2px solid var(--action-pink); animation: pulse-soft 2s infinite;">
                            <span class="center-label" style="font-size: 11px; font-weight: 800;">SCAN</span>
                        </div>
                    </div>
                </div>
                <h2 class="main-title" id="captureStatusText"
                    style="font-size: 20px; font-weight: 800; color:var(--primary); margin-bottom: 12px;">주소를 검색하는 중</h2>
                <p class="sub-title" style="margin-bottom: 0; font-size: 14px; opacity: 0.7;">페이지 길이와 이미지 수에 따라 시간이 조금 더 걸릴
                    수 있습니다.</p>
                <button class="btn-std" id="btnCancelCapture"
                    style="margin-top: 24px; border:1px solid #ddd; background:#fff; padding:8px 24px; border-radius:8px; cursor:pointer; font-weight:600; font-size:14px; transition:background 0.2s;"
                    onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='#fff'">캡처 취소하기
                    ✖</button>
            </div>
        </div>

        <div id="loadingLayer" class="overlay-layer">
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
                    <div class="paper-header" style="justify-content: space-between;">
                        <div class="paper-title">웹사이트 유지보수 의뢰서</div>
                        <div class="paper-sub" style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                            <div>작성일: <span id="viewDate">-</span></div>
                        </div>
                    </div>

                    <div id="viewMaintInfo" class="view-maint-info" style="display:none;">
                        <div class="view-maint-item">유지보수 홈페이지 URL : <span id="viewMaintUrlBold">-</span></div>
                        <div class="view-maint-item">요청사항 총 <span id="viewTotalCountBold">0</span>개</div>
                    </div>

                    <div id="viewContentArea">
                    </div>
                </div>
            </div>

            <div class="view-action-sidebar" style="display: none;">
                <div class="side-action-title">의뢰서 관리</div>
                <div class="side-action-list">
                    <button class="btn-side-action pink" id="btnCopyLinkViewer">
                        <span class="side-icon">🔗</span>
                        <div class="side-text">
                            <strong>유지보수 의뢰서 링크 복사</strong>
                            <span>현재 의뢰서의 링크를 복사합니다.</span>
                        </div>
                    </button>
                    <button class="btn-side-action blue" id="backToEditBtn">
                        <span class="side-icon">✏️</span>
                        <div class="side-text">
                            <strong>편집 모드로 돌아가기</strong>
                            <span>수정사항을 다시 편집합니다.</span>
                        </div>
                    </button>
                </div>
            </div>

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

    <!-- 메모 첨부 이미지 크게보기 팝업 (보조 팝업) -->
    <div id="memoImageModal" class="viewer-img-modal secondary" style="display:none; z-index:10015;">
        <span class="viewer-img-close" id="closeMemoImageModal" style="z-index:10020;">&times;</span>
        <div class="viewer-modal-container">
            <img class="viewer-img-content" id="memoModalImg" style="width:auto; max-width:100%; height:auto; display:block; margin:0 auto; border-radius:8px; box-shadow:0 10px 40px rgba(0,0,0,0.3);">
        </div>
    </div>

    <!-- 메모 안내 헤더 (스크롤 영향을 받지 않도록 밖으로 이동) -->
    <div class="memo-modal-header" id="memoModalHeader" style="position:fixed; bottom:30px; left:50%; transform:translateX(-50%); background:rgba(255,255,255,0.95); padding:12px 24px; border-radius:16px; z-index:10025; font-size:13px; box-shadow:0 8px 30px rgba(0,0,0,0.2); backdrop-filter:blur(10px); border:1px solid #ddd; display:none; flex-direction:column; gap:8px; color:#333; width:30vw; min-width:300px; line-height:1.5; pointer-events:auto; opacity:0; transition:opacity 0.3s ease;">
    </div>

    <!-- Tooltip/Memo Popup (Desktop) - Out of scroll container to fix position:fixed -->
    <div id="viewerMemoTooltip" class="viewer-memo-tooltip" style="display:none;"></div>

    <!-- Mobile Bottom Sheet - Out of scroll container to fix position:fixed -->
    <div id="viewerMobileBottomSheet" class="viewer-bottom-sheet">
        <div class="sheet-handle"></div>
        <button id="btnCloseSheet" class="sheet-close-btn"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L13 13M1 13L13 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <div class="sheet-content" id="viewerSheetContent"></div>
    </div>

    <div class="app-footer">
        <div><strong>JAEBONGTOOL</strong> | Contact: contact@susunzip.com</div>
        <div>© 2026 SOMETHINGHOW. All rights reserved.</div>
    </div>

    <?php if (!$isViewerMode): ?>
        <div id="introOverlay"
            style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; z-index:10000; background:rgba(255,255,255,0.8); backdrop-filter:blur(12px); align-items:center; justify-content:center; color:#111827; text-align:center; padding:20px;">
            <div style="max-width:400px; animation: slideUp 0.5s ease-out;">
                <div style="margin-bottom:20px;">
                    <img src="/jaebong/img/logo01.png" alt="재봉툴" style="width: 180px;">
                </div>
                <h2 style="font-size:24px; font-weight:900; margin-bottom:12px; letter-spacing:-1px;">홈페이지 수정, 쉽게 요청하세요</h2>
                <p style="font-size:15px; line-height:1.6; color:#4b5563; margin-bottom:30px; word-break:keep-all;">수정이 필요한
                    홈페이지를 이미지로 불러와서<br>요청사항을 작성하면 의뢰서 형태로 업체에 전달할 수 있어요</p>
                <div style="display:flex; flex-direction:column; gap:12px;">
                    <button class="tut-btn" id="btnStartTutorial"
                        style="background:var(--primary); color:#fff; border:none; padding:16px; border-radius:12px; font-size:16px; font-weight:800; cursor:pointer; box-shadow:0 10px 20px rgba(0,0,0,0.2); width:100%;">튜토리얼
                        보기</button>
                    <button class="tut-btn tut-btn-skip" id="btnSkipTutorial"
                        style="background:transparent; color:#6b7280; border:none; padding:10px; font-size:14px; font-weight:700; cursor:pointer; width:100%;">재봉툴
                        바로 시작하기</button>
                </div>
            </div>
        </div>

        <div id="tutorialOverlay">
            <svg id="tutorialSvgMask"
                style="position:fixed; inset:0; width:100%; height:100%; pointer-events:none; z-index:1;">
                <defs>
                    <mask id="tutMask">
                        <rect width="100%" height="100%" fill="white" />
                        <rect id="mask1" rx="12" fill="black" />
                        <rect id="mask2" rx="12" fill="black" />
                    </mask>
                </defs>
                <rect id="tutorialBg" width="100%" height="100%" fill="rgba(0,0,0,0.7)" mask="url(#tutMask)"
                    style="pointer-events:auto;" />
            </svg>
            <div class="tut-spotlight" id="tutSpot"></div>
            <div class="tut-spotlight" id="tutSpot2"></div>
            <div class="tut-card" id="tutCard">
                <div class="tut-step" id="tutStep">STEP 1</div>
                <h3 class="tut-title" id="tutTitle">이미지 불러오기</h3>
                <p class="tut-desc" id="tutDesc">설명 텍스트</p>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; min-width: 44px;">
                        <button class="tut-back-btn" id="tutPrev" style="display:none;">
                            <svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor"
                                stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M7 1L1 7L7 13" />
                            </svg>
                        </button>
                        <button class="tut-btn tut-btn-skip" id="tutSkip"
                            style="display:none; background:transparent; color:var(--action-pink); font-weight:700; padding:10px 0;">Skip</button>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="tut-btn" id="tutNext" style="padding:10px 24px;">다음</button>
                    </div>
                </div>
            </div>
        </div>
    <?php endif; ?>

    <div id="sharePopupLayer" class="overlay-layer share-popup-layer">
        <div class="share-popup-card">
            <h2 class="share-popup-title">의뢰서 생성</h2>
            <div class="share-popup-divider"></div>

            <div class="share-popup-input-group">
                <div class="share-popup-input-label">유지보수 홈페이지 URL</div>
                <input type="text" id="maintUrlIn" class="url-input" placeholder="홈페이지 주소를 입력해주세요. (예: https://...)">
            </div>

            <div class="share-popup-stats">
                <div class="share-popup-stat-item">
                    <span class="share-popup-stat-label">작성중</span>
                    <span id="cntIncomplete" class="share-popup-stat-value" style="color:#ff0000;">0</span>
                </div>
                <div class="share-popup-stat-item">
                    <span class="share-popup-stat-label">작성완료</span>
                    <span id="cntComplete" class="share-popup-stat-value">0</span>
                </div>
                <div class="share-popup-stat-item">
                    <span class="share-popup-stat-label">다른문제</span>
                    <span id="cntAsset" class="share-popup-stat-value">0</span>
                </div>
                <div class="share-popup-stat-divider"></div>
                <div class="share-popup-stat-item">
                    <span class="share-popup-stat-label">합계</span>
                    <span id="cntTotal" class="share-popup-stat-value">0</span>
                </div>
            </div>

            <p class="share-popup-notice">작성중인 요청사항은 의뢰서에 저장되지 않습니다.</p>

            <button class="btn-black btn-share-start" id="btnStartShare" disabled>시작</button>

            <button class="btn-popup-close" onclick="document.getElementById('sharePopupLayer').classList.remove('active')">&times;</button>
        </div>
    </div>

    <div id="confirmModal"
        style="display:none; position:fixed; inset:0; z-index:20000; background:rgba(0,0,0,0.5); align-items:center; justify-content:center; padding:20px;">
        <div class="tut-card"
            style="position:relative; height:auto; transform:none; animation: slideUp 0.3s ease-out; gap: 8px;">
            <div class="tut-step" id="confirmModalStep" style="display:none;">CONFIRM</div>
            <h3 class="tut-title" id="confirmModalTitle">확인</h3>
            <p class="tut-desc" id="confirmModalDesc" style="height:auto; margin:10px 0; min-height: 60px;">설명 텍스트</p>
            <div style="display:flex; gap:12px; margin-top:10px;">
                <button class="tut-btn tut-btn-skip" id="btnConfirmCancel"
                    style="flex:1; background:#f3f4f6; color:#6b7280;">아니오</button>
                <button class="tut-btn" id="btnConfirmOk" style="flex:3;">네</button>
            </div>
        </div>
    </div>

    <!-- QR 숨김 영역 비활성화 (Task 002) -->
    <!-- <div id="qrHidden" style="display:none;"></div> -->

    <!-- 드래그 앤 드롭 정렬 라이브러리 -->
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>

    <?php if ($isViewerMode): ?>
        <script type="module" src="js/viewer-main.js"></script>
    <?php else: ?>
        <script type="module" src="js/main.js"></script>
    <?php endif; ?>
</body>

</html>