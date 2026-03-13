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
$history_json = isset($input['history_json']) ? $input['history_json'] : '';

if (!$edit_token || !$doc_id) {
    echo json_encode(['success' => false, 'message' => 'Missing ID or Token in body']);
    exit;
}

$doc_id_esc = addslashes($doc_id);

// 권한 확인 (토큰 일치)
$sql = " SELECT edit_token FROM `g5_jaebong_documents` WHERE `id` = '{$doc_id_esc}' ";
$row = sql_fetch($sql);

if (!$row || $row['edit_token'] !== $edit_token) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$history_json_esc = addslashes($history_json);
$sql_update = " UPDATE `g5_jaebong_documents` 
                SET `history_json` = '{$history_json_esc}',
                    `updated_at` = NOW()
                WHERE `id` = '{$doc_id_esc}' ";
sql_query($sql_update);

echo json_encode(['success' => true, 'updated_at' => date('Y-m-d H:i:s')]);
