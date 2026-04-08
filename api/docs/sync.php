<?php
// /api/docs/sync.php : 작업 내역 주기적 동기화 (Debounce patch)
include_once('../../../common.php');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

header('Access-Control-Allow-Methods: PATCH, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$post_body = file_get_contents('php://input');
$input = json_decode($post_body, true);
$doc_id = isset($input['id']) ? trim($input['id']) : '';
$edit_token = isset($input['edit_token']) ? trim($input['edit_token']) : '';

if (!$edit_token || !$doc_id) {
    echo json_encode(['success' => false, 'message' => 'Missing ID or Token in body']);
    exit;
}

$doc_id_esc = addslashes($doc_id);

// 1. 문서 기본 정보 로드 (history_json 칼럼은 물리적으로 제거됨)
$sql = " SELECT id, owner_uuid, edit_token, main_url, admin_memo, created_at, updated_at FROM `g5_jaebong_documents` WHERE `id` = '{$doc_id_esc}' ";
$row = sql_fetch($sql);

if (!$row || $row['edit_token'] !== $edit_token) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

// [핵심] 테이블 구조 최적화: history_json 칼럼이 물리적으로 제거되었으므로 
// 이제 문서 동기화 시에는 타임스탬프와 (제공 시) 메인 URL만 갱신합니다. (아이템은 개별 sync_item.php에서 처리됨)
$main_url = isset($input['main_url']) ? trim($input['main_url']) : '';
$main_url_sql = $main_url ? ", `main_url` = '" . addslashes($main_url) . "'" : "";

$sql_update = " UPDATE `g5_jaebong_documents` 
                SET `updated_at` = NOW() 
                    {$main_url_sql}
                WHERE `id` = '{$doc_id_esc}' ";
sql_query($sql_update);

echo json_encode([
    'success' => true, 
    'data' => [
        'id' => $row['id'],
        'owner_uuid' => $row['owner_uuid'], 
        'main_url' => $main_url ?: $row['main_url'],
        'admin_memo' => $row['admin_memo'],
        'created_at' => $row['created_at'],
        'updated_at' => date('Y-m-d H:i:s')
    ]
]);
