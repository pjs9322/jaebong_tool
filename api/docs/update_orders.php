<?php
/**
 * /api/docs/update_orders.php : 카드 리스트 정렬 순서 일괄 업데이트
 */
include_once('../../../common.php');
header('Content-Type: application/json; charset=utf-8');

$post_body = file_get_contents('php://input');
$input = json_decode($post_body, true);

$doc_id = isset($input['id']) ? trim($input['id']) : '';
$edit_token = isset($input['edit_token']) ? trim($input['edit_token']) : '';
$orders = isset($input['orders']) ? $input['orders'] : []; // Array of { item_uuid, sort_order }

if (!$doc_id || !$edit_token || !is_array($orders)) {
    echo json_encode(['success' => false, 'message' => 'Missing ID, Token or Orders']);
    exit;
}

// 1. 권한 확인
$doc_id_esc = addslashes($doc_id);
$row = sql_fetch(" SELECT edit_token FROM `g5_jaebong_documents` WHERE `id` = '{$doc_id_esc}' ");
if (!$row || $row['edit_token'] !== $edit_token) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

// 2. 일괄 업데이트 (루프 내 쿼리 실행)
foreach ($orders as $o) {
    if (isset($o['item_uuid']) && isset($o['sort_order'])) {
        $uuid_esc = addslashes($o['item_uuid']);
        $order_esc = (int)$o['sort_order'];
        sql_query(" UPDATE `g5_jaebong_items` SET `sort_order` = '{$order_esc}' WHERE `document_id` = '{$doc_id_esc}' AND `item_uuid` = '{$uuid_esc}' ");
    }
}

// 문서 최종 갱신 시간 업데이트
sql_query(" UPDATE `g5_jaebong_documents` SET `updated_at` = NOW() WHERE `id` = '{$doc_id_esc}' ");

echo json_encode(['success' => true]);
?>
