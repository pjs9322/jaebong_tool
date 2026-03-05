<?php
// /api/docs/read.php : 공유 링크 등으로 문서 열람 시 내용 가져오기
include_once('../../../common.php');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

header('Access-Control-Allow-Methods: GET, OPTIONS');

$id = isset($_GET['id']) ? trim($_GET['id']) : '';
if (!$id) {
    echo json_encode(['success' => false, 'message' => 'Missing Document ID']);
    exit;
}

$id_esc = addslashes($id);
$sql = " SELECT * FROM `g5_jaebong_documents` WHERE `id` = '{$id_esc}' ";
$row = sql_fetch($sql);

if (!$row) {
    echo json_encode(['success' => false, 'message' => 'Document not found']);
    exit;
}

// 클라이언트로 edit_token은 절대 반환하지 않습니다 (보안).
echo json_encode([
    'success' => true,
    'data' => [
        'id' => $row['id'],
        'owner_uuid' => $row['owner_uuid'], // 클라이언트에서 이것과 내 UUID를 비교하여 권한 부여
        'history_json' => $row['history_json'],
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at']
    ]
]);
