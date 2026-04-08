<?php
// jaebong/admin/delete.php : 고아 이미지(참조 없는 파일) 일괄 삭제 도구
include_once('../../common.php');

if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}

// 관리자 인증 확인
if (empty($_SESSION['is_jaebong_admin_auth'])) {
    die("인증되지 않은 접근입니다.");
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

// 1. 모든 문서 및 아이템에서 사용 중인 이미지 URL 추출 (레거시 + 신규 구조 통합)
$used_files = [];

// [신규] g5_jaebong_images 테이블에서 삭제되지 않은 에셋들 추출
$img_res = sql_query(" SELECT url FROM `g5_jaebong_images` WHERE `is_deleted` = 0 ");
while ($img_row = sql_fetch_array($img_res)) {
    if (!empty($img_row['url'])) $used_files[] = parse_url_to_relative($img_row['url']);
}

// [신규] g5_jaebong_items 테이블의 JSON 내에서 URL 추출 (UUID 치환 전 또는 드문 케이스 대비)
$item_res = sql_query(" SELECT item_json FROM `g5_jaebong_items` ");
while ($item_row = sql_fetch_array($item_res)) {
    $item_data = json_decode($item_row['item_json'], true);
    if (!$item_data) continue;
    
    // 재귀적으로 모든 문자열 값에서 URL 패턴 (/jaebong/uploads/...) 탐색
    array_walk_recursive($item_data, function($val) use (&$used_files) {
        if (is_string($val) && strpos($val, '/jaebong/uploads/') !== false) {
            $used_files[] = parse_url_to_relative($val);
        }
    });
}

$used_files = array_unique(array_filter($used_files));






// 이미지 URL을 상대 경로(uploads/...)로 변환하는 유틸리티
function parse_url_to_relative($url) {
    $path = str_replace('/jaebong/uploads/', '', $url);
    return trim($path, '/');
}

// 2. 실제 서버의 uploads 디렉토리 내 모든 파일 스캔 (한 단계 상위에 위치)
$upload_path = realpath('../uploads');
if (!$upload_path) die("업로드 디렉토리를 찾을 수 없습니다.");

$all_files = [];
$it = new RecursiveDirectoryIterator($upload_path, RecursiveDirectoryIterator::SKIP_DOTS);
$files = new RecursiveIteratorIterator($it, RecursiveIteratorIterator::LEAVES_ONLY);

foreach ($files as $file) {
    if ($file->isFile()) {
        $full_path = $file->getRealPath();
        $relative_path = str_replace($upload_path . DIRECTORY_SEPARATOR, '', $full_path);
        $relative_path = str_replace('\\', '/', $relative_path);
        if (basename($relative_path) === 'index.php') continue;
        $all_files[$relative_path] = $full_path;
    }
}

// 3. 고아 파일 추출
$orphan_files = [];
foreach ($all_files as $rel => $abs) {
    if (!in_array($rel, $used_files)) {
        $orphan_files[$rel] = $abs;
    }
}

// 4. 삭제 실행
$deleted_count = 0;
$freed_size = 0;
if ($action === 'delete_all' && !empty($orphan_files)) {
    foreach ($orphan_files as $rel => $abs) {
        $freed_size += filesize($abs);
        if (unlink($abs)) $deleted_count++;
    }
}

function format_size($bytes) {
    if ($bytes >= 1073741824) return number_format($bytes / 1073741824, 2) . ' GB';
    if ($bytes >= 1048576) return number_format($bytes / 1048576, 2) . ' MB';
    if ($bytes >= 1024) return number_format($bytes / 1024, 2) . ' KB';
    return $bytes . ' bytes';
}
?>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>서버 용량 최적화 - 고아 파일 제거</title>
    <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;600;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Pretendard', sans-serif; background: #f3f4f6; padding: 2rem; color: #111827; }
        .card { background: #fff; padding: 2rem; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); max-width: 800px; margin: 0 auto; }
        h1 { font-size: 1.5rem; font-weight: 800; margin-bottom: 1rem; border-bottom: 2px solid #ff1d71; padding-bottom: 0.5rem; }
        .stat-box { display: flex; gap: 1rem; margin-bottom: 2rem; }
        .stat-item { flex: 1; background: #f9fafb; padding: 1.5rem; border-radius: 12px; text-align: center; border: 1px solid #e5e7eb; }
        .stat-value { font-size: 1.8rem; font-weight: 800; color: #ff1d71; margin-bottom: 0.25rem; }
        .stat-label { font-size: 0.85rem; color: #6b7280; font-weight: 600; }
        .btn { display: inline-block; padding: 1rem 2rem; border-radius: 8px; font-weight: 700; text-decoration: none; cursor: pointer; transition: all 0.2s; border: none; font-size: 1rem; }
        .btn-delete { background: #111827; color: #fff; }
        .btn-delete:hover { background: #ff1d71; transform: translateY(-2px); }
        .btn-back { background: #e5e7eb; color: #4b5563; margin-right: 1rem; }
        .file-list { margin-top: 2rem; max-height: 300px; overflow-y: auto; background: #000; color: #33ff33; padding: 1rem; font-family: monospace; font-size: 0.85rem; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="card">
        <h1>서버 저장소 클린업 최적화</h1>
        <?php if ($action === 'delete_all'): ?>
            <div style="background:#ecfdf5; color:#065f46; padding:1rem; border-radius:8px; margin-bottom:1.5rem; font-weight:600;">
                🎉 최적화가 완료되었습니다! 총 <?php echo $deleted_count; ?>개의 파일을 삭제하여 <?php echo format_size($freed_size); ?>의 공간을 확보했습니다.
            </div>
        <?php endif; ?>
        <p style="color: #4b5563; margin-bottom: 1.5rem;">어떠한 의뢰서에서도 참조하고 있지 않은 고아 파일들입니다. 버튼을 누르면 서버에서 영구적으로 삭제됩니다.</p>
        <div class="stat-box">
            <div class="stat-item">
                <div class="stat-value"><?php echo count($orphan_files); ?></div>
                <div class="stat-label">삭제 가능한 고아 파일</div>
            </div>
            <div class="stat-item">
                <div class="stat-value"><?php 
                    $total_orphan_size = 0;
                    foreach($orphan_files as $f) $total_orphan_size += filesize($f);
                    echo format_size($total_orphan_size); 
                ?></div>
                <div class="stat-label">절약 가능한 용량</div>
            </div>
        </div>
        <div style="text-align: right;">
            <a href="index.php" class="btn btn-back">관리자 홈으로</a>
            <?php if (count($orphan_files) > 0): ?>
                <a href="?action=delete_all" class="btn btn-delete" onclick="return confirm('정말 모든 고아 파일을 삭제하시겠습니까?')">지금 즉시 최적화 실행</a>
            <?php endif; ?>
        </div>
        <?php if (count($orphan_files) > 0): ?>
            <div class="file-list">
                [삭제 대상 리스트]<br>
                <?php foreach(array_keys($orphan_files) as $rel): ?> > <?php echo $rel; ?><br> <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>
