<?php
/**
 * /api/docs/read.php : 분산 데이터 구조 및 에셋 정규화(UUID) 지원 열람 API
 */
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

// 1. 문서 기본 정보 로드 (history_json 칼럼은 물리적으로 제거됨)
$sql = " SELECT id, owner_uuid, main_url, admin_memo, created_at, updated_at FROM `g5_jaebong_documents` WHERE `id` = '{$id_esc}' ";
$row = sql_fetch($sql);

if (!$row) {
    echo json_encode(['success' => false, 'message' => 'Document not found']);
    exit;
}

// 2. 신규 분산 구조(g5_jaebong_items)에서 해당 문서의 모든 카드 데이터 로드
$items_sql = " SELECT item_json FROM `g5_jaebong_items` WHERE `document_id` = '{$id_esc}' ORDER BY `sort_order` ASC ";
$items_res = sql_query($items_sql);
$history_items = [];

while ($item_row = sql_fetch_array($items_res)) {
    $item_data = json_decode($item_row['item_json'], true);
    if ($item_data) {
        $history_items[] = $item_data;
    }
}

// 3. 에셋 매핑 정보 로드 (UUID -> URL 복원)
$asset_map = [];
$asset_sql = " SELECT image_uuid, url FROM `g5_jaebong_images` 
                WHERE (`document_id` = '{$id_esc}' OR `document_id` IS NULL OR `document_id` = '') 
                AND `is_deleted` = 0 ";
$asset_res = sql_query($asset_sql);

if ($asset_res) {
    while ($asset_row = sql_fetch_array($asset_res)) {
        if (!empty($asset_row['image_uuid']) && !empty($asset_row['url'])) {
            $asset_map['UUID:' . $asset_row['image_uuid']] = $asset_row['url'];
        }
    }
}

// 4. 에셋 식별자 치환 및 최종 JSON 구성
// 프론트엔드 호환성을 위해 { "history": [...] } 형태 유지
$final_payload = [
    'history' => $history_items
];

$reconstructed_json = json_encode($final_payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR);
if (!empty($history_items) && !empty($asset_map)) {
    krsort($asset_map); // 긴 UUID 식별자부터 치환하여 부분 매칭 방지
    foreach ($asset_map as $uuid_key => $real_url) {
        $reconstructed_json = str_ireplace($uuid_key, $real_url, $reconstructed_json);
    }
}

// 5. 최종 결과 반환
echo json_encode([
    'success' => true,
    'data' => [
        'id' => $row['id'],
        'owner_uuid' => $row['owner_uuid'], 
        'main_url' => $row['main_url'],
        'history_json' => $reconstructed_json, // 프론트엔드가 파싱하여 사용
        'admin_memo' => $row['admin_memo'],
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at']
    ]
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);



?>
