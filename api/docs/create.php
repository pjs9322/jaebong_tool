<?php
// /api/docs/create.php : 초기 진입 (단일 문서 정책에 따른 생성 또는 리다이렉트)
include_once('../../../common.php');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$post_body = file_get_contents('php://input');
$input = json_decode($post_body, true);
$owner_uuid = isset($input['owner_uuid']) ? trim($input['owner_uuid']) : '';

if (!$owner_uuid) {
    echo json_encode(['success' => false, 'message' => 'Invalid UUID']);
    exit;
}

$owner_uuid_esc = addslashes($owner_uuid);

// 이미 작성한 단일 문서가 있는지 확인 (MVP 정책: 단일 문서 강제)
$sql_check = " SELECT id, edit_token FROM `g5_jaebong_documents` WHERE `owner_uuid` = '{$owner_uuid_esc}' ORDER BY created_at DESC LIMIT 1 ";
$row = sql_fetch($sql_check);

if ($row) {
    // 기존에 작성하던 문서 반환 (이어하기)
    echo json_encode([
        'success' => true,
        'data' => [
            'id' => $row['id'],
            'edit_token' => $row['edit_token'],
            'is_new' => false
        ]
    ]);
    exit;
}

// 처음 접속하는 익명 사용자이므로 새 문서와 토큰 발급
$doc_id = 'DOC-' . strtoupper(substr(md5(uniqid(rand(), true)), 0, 10));
$edit_token = bin2hex(random_bytes(16));

$sql = " INSERT INTO `g5_jaebong_documents` 
            SET `id` = '{$doc_id}',
                `owner_uuid` = '{$owner_uuid_esc}',
                `edit_token` = '{$edit_token}',
                `created_at` = NOW(),
                `updated_at` = NOW() ";
sql_query($sql);





echo json_encode([
    'success' => true,
    'data' => [
        'id' => $doc_id,
        'edit_token' => $edit_token,
        'is_new' => true
    ]
]);
