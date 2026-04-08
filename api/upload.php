<?php
// /api/upload.php : 이미지 업로드 및 정적 URL 반환
include_once('../../common.php');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');


$upload_root_dir = '../uploads/';
$doc_id = isset($_POST['document_id']) ? addslashes(trim($_POST['document_id'])) : '';

if ($doc_id) {
    // 보안을 위해 doc_id에서 위험한 문자 제거 (./ .. 등)
    $safe_doc_id = preg_replace('/[^a-zA-Z0-9_\-]/', '', $doc_id);
    $upload_dir = $upload_root_dir . $safe_doc_id . '/';
} else {
    $upload_dir = $upload_root_dir;
}

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
    $url_path = ($doc_id) ? $safe_doc_id . '/' . $new_filename : $new_filename;
    $url = '/jaebong/uploads/' . $url_path;
    $url_esc = addslashes($url);
    
    $uuid = 'img_' . uniqid();
    $uuid_esc = addslashes($uuid);

    // 에셋 매핑 데이터 저장
    if ($doc_id) {
        sql_query("INSERT INTO `g5_jaebong_images` SET `document_id`='{$doc_id}', `image_uuid`='{$uuid_esc}', `url`='{$url_esc}', `created_at`=NOW()");
    }

    echo json_encode(['success' => true, 'url' => $url, 'image_uuid' => $uuid]);
}
else {
    echo json_encode(['success' => false, 'message' => 'Move file failed']);
}
