<?php
// /api/upload.php : 이미지 업로드 및 정적 URL 반환
include_once('../../common.php');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');


$upload_dir = '../uploads/';
if (!is_dir($upload_dir)) {
    @mkdir($upload_dir, 0777, true);
}

if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['success' => false, 'message' => 'Upload failed']);
    exit;
}

$file_tmp = $_FILES['image']['tmp_name'];
$file_name = $_FILES['image']['name'];
$ext = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));

$allowed_exts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
if (!in_array($ext, $allowed_exts)) {
    echo json_encode(['success' => false, 'message' => 'Invalid file type']);
    exit;
}

// 겹치지 않는 유니크한 파일명 생성
$new_filename = uniqid('img_', true) . '.' . $ext;
$dest = $upload_dir . $new_filename;

if (move_uploaded_file($file_tmp, $dest)) {
    // 프론트엔드가 접근 가능한 URL 주소 반환
    $url = '/jaebong/uploads/' . $new_filename;

    // (옵션) images 테이블에 매핑 데이터 저장
    $doc_id = isset($_POST['document_id']) ? addslashes(trim($_POST['document_id'])) : '';
    if ($doc_id) {
        $url_esc = addslashes($url);
        sql_query("INSERT INTO `g5_jaebong_images` SET `document_id`='{$doc_id}', `url`='{$url_esc}', `created_at`=NOW()");
    }

    echo json_encode(['success' => true, 'url' => $url]);
}
else {
    echo json_encode(['success' => false, 'message' => 'Move file failed']);
}
