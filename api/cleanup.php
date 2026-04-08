<?php
// /api/cleanup.php : 삭제된 요청사항의 이미지 파일 물리적 제거 및 문서 초기화 시 폴더 정리
include_once('../../common.php');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$post_body = file_get_contents('php://input');
$input = json_decode($post_body, true);

$doc_id = isset($input['id']) ? trim($input['id']) : '';
$edit_token = isset($input['edit_token']) ? trim($input['edit_token']) : '';
$mode = isset($input['mode']) ? $input['mode'] : 'single'; // 'single' (파일별) or 'all' (문서 전체 폴더)
$files = isset($input['files']) ? $input['files'] : [];    // 삭제할 URL 목록 (배열)

if (!$doc_id || !$edit_token) {
    echo json_encode(['success' => false, 'message' => 'Missing ID or Token']);
    exit;
}

// 1. 권한 확인 (g5_jaebong_documents 테이블)
$doc_id_esc = addslashes($doc_id);
$sql = " SELECT edit_token FROM `g5_jaebong_documents` WHERE `id` = '{$doc_id_esc}' ";
$row = sql_fetch($sql);

if (!$row || $row['edit_token'] !== $edit_token) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$upload_root = realpath('../uploads');
if (!$upload_root) {
    echo json_encode(['success' => false, 'message' => 'Upload directory not found']);
    exit;
}

$deleted_count = 0;

if ($mode === 'all') {
    // 1. DB 클린업: 해당 문서의 모든 아이템 및 이미지 매핑 데이터 정리
    // 아이템 테이블 데이터 삭제
    sql_query(" DELETE FROM `g5_jaebong_items` WHERE `document_id` = '{$doc_id_esc}' ");
    
    // 이미지 테이블 데이터 삭제 (또는 소프트 삭제)
    sql_query(" UPDATE `g5_jaebong_images` SET `is_deleted` = 1, `deleted_at` = NOW() WHERE `document_id` = '{$doc_id_esc}' ");

    // 2. 물리 파일 클린업: uploads/{doc_id}/ 폴더 전체 삭제
    $safe_doc_id = preg_replace('/[^a-zA-Z0-9_\-]/', '', $doc_id);
    $target_dir = $upload_root . DIRECTORY_SEPARATOR . $safe_doc_id;

    if (is_dir($target_dir)) {
        // 내부 파일 및 디렉토리 재귀적 삭제
        $it = new RecursiveDirectoryIterator($target_dir, RecursiveDirectoryIterator::SKIP_DOTS);
        $files_in_dir = new RecursiveIteratorIterator($it, RecursiveDirectoryIterator::CHILD_FIRST);
        foreach($files_in_dir as $file) {
            $realpath = $file->getRealPath();
            if ($file->isDir()){
                rmdir($realpath);
            } else {
                unlink($realpath);
                $deleted_count++;
            }
        }
        rmdir($target_dir);
    }
} else {
    // 1. 개별 파일 물리적 삭제 및 DB 동기화
    if (!empty($files) && is_array($files)) {
        foreach ($files as $url) {
            // URL에서 실제 파일 경로 추출 (예: /jaebong/uploads/...)
            $path_part = str_replace('/jaebong/uploads/', '', $url);
            if (!$path_part) continue;

            $file_path = realpath($upload_root . DIRECTORY_SEPARATOR . $path_part);

            // 보안: 실제 경로가 uploads 디렉토리 내부에 있는지 확인 (Path Traversal 방지)
            if ($file_path && strpos($file_path, $upload_root) === 0 && is_file($file_path)) {
                if (unlink($file_path)) {
                    $deleted_count++;
                    
                    // DB에서도 해당 이미지 매핑을 삭제됨으로 표시
                    $url_esc = addslashes($url);
                    sql_query(" UPDATE `g5_jaebong_images` SET `is_deleted` = 1, `deleted_at` = NOW() WHERE `url` = '{$url_esc}' ");
                }
            }
        }
    }
}




echo json_encode([
    'success' => true, 
    'deleted_count' => $deleted_count, 
    'message' => 'Cleanup complete'
]);
