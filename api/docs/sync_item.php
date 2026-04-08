<?php
/**
 * /api/docs/sync_item.php : 정규화(UUID) 지원 개별 카드 동기화 API
 */
include_once('../../../common.php');
header('Content-Type: application/json; charset=utf-8');

$post_body = file_get_contents('php://input');
$input = json_decode($post_body, true);

$doc_id = isset($input['id']) ? trim($input['id']) : '';
$edit_token = isset($input['edit_token']) ? trim($input['edit_token']) : '';
$action = isset($input['action']) ? $input['action'] : 'save';

if (!$doc_id || !$edit_token) {
    echo json_encode(['success' => false, 'message' => 'Missing ID or Token']);
    exit;
}

// 1. 권한 확인
$doc_id_esc = addslashes($doc_id);
$row = sql_fetch(" SELECT edit_token FROM `g5_jaebong_documents` WHERE `id` = '{$doc_id_esc}' ");
if (!$row || $row['edit_token'] !== $edit_token) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

switch ($action) {
    case 'save':
        $item_uuid = isset($input['item_uuid']) ? trim($input['item_uuid']) : '';
        $item_json_raw = isset($input['item_json']) ? $input['item_json'] : '';
        $item_data = json_decode($item_json_raw, true); // 배열로 변환하여 처리
        $is_comp = (isset($input['is_completed']) && $input['is_completed']) ? 1 : 0;
        $sort_order = isset($input['sort_order']) ? (int)$input['sort_order'] : 0;

        if (!$item_uuid || empty($item_data)) {
            echo json_encode(['success' => false, 'message' => 'Incomplete data']);
            exit;
        }

        // [핵심] 저장 전 서버 측에서 URL을 다시 UUID 식별자로 정규화 (치환)
        $process_to_uuid = function($url) use ($doc_id_esc) {
            if (empty($url) || strpos($url, '/jaebong/uploads/') === false) return $url;
            if (strpos($url, 'UUID:') === 0) return $url; // 이미 UUID인 경우 통과
            
            $url_esc = addslashes($url);
            $img = sql_fetch(" SELECT image_uuid FROM `g5_jaebong_images` WHERE `url` = '{$url_esc}' ");
            
            if ($img && !empty($img['image_uuid'])) {
                return "UUID:" . $img['image_uuid'];
            } else {
                // 신규 이미지인데 매핑이 없는 경우 (드문 케이스)
                $new_uuid = 'img_' . uniqid();
                $new_uuid_esc = addslashes($new_uuid);
                sql_query(" INSERT INTO `g5_jaebong_images` SET `document_id` = '{$doc_id_esc}', `image_uuid` = '{$new_uuid_esc}', `url` = '{$url_esc}', `created_at` = NOW() ");
                return "UUID:" . $new_uuid;
            }
        };

        if (isset($item_data['thumb'])) $item_data['thumb'] = $process_to_uuid($item_data['thumb']);
        if (isset($item_data['full'])) $item_data['full'] = $process_to_uuid($item_data['full']);
        if (isset($item_data['baseImgSrc'])) $item_data['baseImgSrc'] = $process_to_uuid($item_data['baseImgSrc']);
        if (!empty($item_data['annos'])) {
            foreach ($item_data['annos'] as &$anno) {
                if (isset($anno['img'])) $anno['img'] = $process_to_uuid($anno['img']);
            }
        }

        $item_uuid_esc = addslashes($item_uuid);
        $item_json_esc = addslashes(json_encode($item_data, JSON_UNESCAPED_UNICODE));

        $sql = " INSERT INTO `g5_jaebong_items` 
                 SET `document_id` = '{$doc_id_esc}', `item_uuid` = '{$item_uuid_esc}', `item_json` = '{$item_json_esc}', `is_completed` = '{$is_comp}', `sort_order` = '{$sort_order}'
                 ON DUPLICATE KEY UPDATE `item_json` = '{$item_json_esc}', `is_completed` = '{$is_comp}', `sort_order` = '{$sort_order}', `updated_at` = NOW() ";
        sql_query($sql);
        sql_query(" UPDATE `g5_jaebong_documents` SET `updated_at` = NOW() WHERE `id` = '{$doc_id_esc}' ");

        echo json_encode(['success' => true, 'data' => ['updated_at' => date('Y-m-d H:i:s')]]);
        break;

    case 'delete':
        $item_uuid = isset($input['item_uuid']) ? trim($input['item_uuid']) : '';
        $item_uuid_esc = addslashes($item_uuid);
        
        // Soft Delete: 관련된 이미지들의 삭제 상태 업데이트 (누락 추적용)
        $item_row = sql_fetch(" SELECT item_json FROM `g5_jaebong_items` WHERE `item_uuid` = '{$item_uuid_esc}' ");
        if ($item_row) {
            // 이 카드에서 쓰던 UUID들을 추출하여 '삭제됨' 마킹 (정규표현식 활용)
            preg_match_all('/UUID:(img_[a-z0-9]+)/', $item_row['item_json'], $matches);
            if (!empty($matches[1])) {
                foreach ($matches[1] as $u) {
                    $u_esc = addslashes($u);
                    sql_query(" UPDATE `g5_jaebong_images` SET `is_deleted` = 1, `deleted_at` = NOW() WHERE `image_uuid` = '{$u_esc}' ");
                }
            }
        }

        // 실제 카드 로우 삭제
        sql_query(" DELETE FROM `g5_jaebong_items` WHERE `document_id` = '{$doc_id_esc}' AND `item_uuid` = '{$item_uuid_esc}' ");
        sql_query(" UPDATE `g5_jaebong_documents` SET `updated_at` = NOW() WHERE `id` = '{$doc_id_esc}' ");

        echo json_encode(['success' => true, 'data' => ['updated_at' => date('Y-m-d H:i:s')]]);
        break;
}
?>
