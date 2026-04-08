<?php
// jaebong/admin/index.php : 관리자 대시보드 메인 (분산 구조 최적화 및 프리미엄 UI)
include_once('../../common.php');

if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}

// 1. 로그인/로그아웃/메모 업데이트 액션
if (isset($_POST['admin_password'])) {
    if ($_POST['admin_password'] === '1123') {
        $_SESSION['is_jaebong_admin_auth'] = true;
        header("Location: index.php");
        exit;
    } else {
        $login_error = "비밀번호가 일치하지 않습니다.";
    }
}
if (isset($_GET['logout'])) {
    unset($_SESSION['is_jaebong_admin_auth']);
    header("Location: index.php");
    exit;
}
if (isset($_POST['update_admin_memo'])) {
    $memo_id = addslashes($_POST['doc_id']);
    $new_memo = addslashes($_POST['admin_memo']);
    sql_query(" UPDATE `g5_jaebong_documents` SET `admin_memo` = '{$new_memo}' WHERE `id` = '{$memo_id}' ");
    header("Location: index.php");
    exit;
}

// 2. 인증 확인
if (empty($_SESSION['is_jaebong_admin_auth'])) {
?>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>JAEBONG | ADMIN LOGIN</title>
    <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Pretendard', sans-serif; }
        body { background: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; overflow:hidden; }
        .login-card { background: #fff; padding: 50px 40px; border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); width: 100%; max-width: 380px; text-align: center; }
        .brand { font-size: 1.5rem; font-weight: 800; color: #111827; margin-bottom: 1.5rem; }
        .brand span { color: #ff1d71; }
        .login-input { width: 100%; padding: 14px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 1rem; margin-bottom: 1rem; outline: none; transition: 0.2s; }
        .login-input:focus { border-color: #ff1d71; box-shadow: 0 0 0 4px rgba(255, 29, 113, 0.1); }
        .login-btn { width: 100%; padding: 14px; background: #111827; color: #fff; border: none; border-radius: 12px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .login-btn:hover { background: #ff1d71; }
        .error { color: #ef4444; font-size: 0.85rem; margin-bottom: 1rem; font-weight: 600; }
    </style>
</head>
<body>
    <div class="login-card">
        <div class="brand">JAEBONG <span>ADMIN</span></div>
        <?php if (!empty($login_error)): ?><div class="error"><?= $login_error ?></div><?php endif; ?>
        <form method="POST">
            <input type="password" name="admin_password" class="login-input" placeholder="Password" required autofocus>
            <button type="submit" class="login-btn">로그인</button>
        </form>
    </div>
</body>
</html>
<?php
    exit;
}

// 3. 데이터 로드 및 통계 (분산 구조 기반)
$sql = " SELECT * FROM `g5_jaebong_documents` ORDER BY updated_at DESC ";
$documents = [];
$result = sql_query($sql);

if ($result) {
    while ($row = sql_fetch_array($result)) {
        $doc_id = $row['id'];
        $doc_id_esc = addslashes($doc_id);

        // [분산 구조 통계] g5_jaebong_items 테이블에서 카운트
        $items_count_row = sql_fetch(" SELECT COUNT(*) as cnt FROM `g5_jaebong_items` WHERE `document_id` = '{$doc_id_esc}' ");
        $req_cnt = (int)$items_count_row['cnt'];

        // [이미지 통계] g5_jaebong_images 테이블에서 카운트 (삭제되지 않은 것)
        $images_count_row = sql_fetch(" SELECT COUNT(*) as cnt FROM `g5_jaebong_images` WHERE `document_id` = '{$doc_id_esc}' AND `is_deleted` = 0 ");
        $img_cnt = (int)$images_count_row['cnt'];

        // [미리보기용 대표 URL] 첫 번째 아이템의 URL 추출 시도
        $first_item = sql_fetch(" SELECT item_json FROM `g5_jaebong_items` WHERE `document_id` = '{$doc_id_esc}' ORDER BY `sort_order` ASC LIMIT 1 ");
        $preview_text = '작성된 내역 없음';
        if ($first_item) {
            $fdata = json_decode($first_item['item_json'], true);
            $url = !empty($fdata['url']) ? $fdata['url'] : '웹사이트';
            if (mb_strlen($url) > 40) $url = mb_substr($url, 0, 40) . '...';
            $preview_text = ($req_cnt == 1) ? htmlspecialchars($url) : htmlspecialchars($url) . ' 외 ' . ($req_cnt - 1) . '건';
        } else if (!empty($row['history_json']) && $row['history_json'] !== '{"history":[]}') {
            // 아직 마이그레이션되지 않은 레거시 데이터가 있는 경우
            $preview_text = '<span style="color:#f59e0b; font-weight:700;">⚠️ 마이그레이션 대기 중</span>';
        }

        $row['req_cnt'] = $req_cnt;
        $row['img_cnt'] = $img_cnt;
        $row['preview_text'] = $preview_text;
        $documents[] = $row;
    }
}
?>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>관리자 대시보드 | JAEBONG</title>
    <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root { --primary: #0f172a; --secondary: #1e293b; --action-pink: #ff1d71; --bg: #f8fafc; --card: #ffffff; --border: #e2e8f0; --text: #334155; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Pretendard', sans-serif; }
        body { background: var(--bg); color: var(--text); }
        .top-nav { background: var(--primary); padding: 14px 30px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .logo { color: #fff; font-weight: 800; font-size: 1.1rem; letter-spacing: -0.5px; }
        .logo span { color: var(--action-pink); }
        .nav-links { display: flex; gap: 12px; }
        .nav-btn { color: #cbd5e1; text-decoration: none; font-size: 0.85rem; font-weight: 600; padding: 8px 14px; border-radius: 8px; border: 1px solid #334155; transition: 0.2s; }
        .nav-btn:hover { background: #334155; color: #fff; }
        .nav-btn.logout { border-color: #ef4444; color: #f87171; }

        .container { max-width: 1400px; margin: 40px auto; padding: 0 20px; }
        .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .title { font-size: 1.5rem; font-weight: 800; color: var(--primary); }
        .badge { background: var(--action-pink); color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; margin-left: 8px; vertical-align: middle; }

        .table-card { background: var(--card); border-radius: 16px; border: 1px solid var(--border); overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f1f5f9; text-align: left; padding: 14px 20px; font-size: 0.8rem; font-weight: 700; color: #64748b; border-bottom: 2px solid var(--border); }
        td { padding: 16px 20px; border-bottom: 1px solid var(--border); font-size: 0.9rem; vertical-align: middle; }
        tr:last-child td { border-bottom: none; }
        tr:hover { background: #fdf2f8; }

        .item-id { font-weight: 700; color: var(--primary); font-size: 0.85rem; }
        .summary-text { color: #64748b; line-height: 1.4; }
        .stats-wrap { display: flex; gap: 10px; }
        .stat-pill { background: #f1f5f9; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; color: #475569; border: 1px solid #e2e8f0; }
        
        .memo-box { background: #f8fafc; border: 1px solid var(--border); border-radius: 10px; padding: 10px; width: 100%; }
        .memo-input { width: 100%; border: none; background: transparent; font-size: 0.8rem; resize: vertical; min-height: 50px; outline: none; margin-bottom: 6px; }
        .memo-save { background: var(--secondary); color: #fff; border: none; padding: 5px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; cursor: pointer; }
        .memo-save:hover { background: var(--action-pink); }

        .action-btn { background: var(--primary); color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 10px; font-size: 0.85rem; font-weight: 700; transition: 0.2s; display: inline-block; }
        .action-btn:hover { background: var(--action-pink); transform: translateY(-2px); }
        
        .time { font-size: 0.8rem; color: #94a3b8; }
    </style>
</head>
<body>
    <nav class="top-nav">
        <div class="logo">JAEBONG <span>ADMIN</span></div>
        <div class="nav-links">
            <a href="delete.php" class="nav-btn">⚙️ 용량 최적화</a>
            <a href="?logout=1" class="nav-btn logout">로그아웃</a>
        </div>
    </nav>

    <main class="container">
        <div class="header-row">
            <h1 class="title">의뢰서 대시보드 <span class="badge"><?= count($documents) ?>건</span></h1>
        </div>

        <div class="table-card">
            <?php if (count($documents) > 0): ?>
            <table>
                <thead>
                    <tr>
                        <th width="140">ID</th>
                        <th>유지보수 요약</th>
                        <th width="180">항목 통계</th>
                        <th width="300">관리자 전용 메모</th>
                        <th width="160">최종 수정</th>
                        <th width="120" style="text-align:right;">액션</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($documents as $doc): ?>
                    <tr>
                        <td><span class="item-id"><?= htmlspecialchars($doc['id']) ?></span></td>
                        <td class="summary-text"><?= $doc['preview_text'] ?></td>
                        <td>
                            <div class="stats-wrap">
                                <span class="stat-pill">📋 <?= $doc['req_cnt'] ?>건</span>
                                <span class="stat-pill">🖼️ <?= $doc['img_cnt'] ?>개</span>
                            </div>
                        </td>
                        <td>
                            <form method="POST" class="memo-box">
                                <input type="hidden" name="doc_id" value="<?= htmlspecialchars($doc['id']) ?>">
                                <textarea name="admin_memo" class="memo-input" placeholder="메모할 내용을 입력하세요..."><?= htmlspecialchars($doc['admin_memo']) ?></textarea>
                                <button type="submit" name="update_admin_memo" class="memo-save">저장</button>
                            </form>
                        </td>
                        <td class="time"><?= $doc['updated_at'] ?></td>
                        <td style="text-align:right;">
                            <a href="../index.php?id=<?= urlencode($doc['id']) ?>" class="action-btn" target="_blank">📄 열기</a>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            <?php else: ?>
            <div style="padding:100px; text-align:center; color:#94a3b8;">생성된 의뢰서가 아직 없습니다.</div>
            <?php endif; ?>
        </div>
    </main>
</body>
</html>
