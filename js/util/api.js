/**
 * 백엔드(PHP) API 통신을 담당하는 유틸리티 모듈
 * Task 1 (서버 기반 실시간 동기화) 전용
 */

const API_BASE = '/jaebong/api';

export const SyncAPI = {
    /**
     * 루트(/) 접속 시 문서 검증 및 UUID 매핑
     * 이미 진행 중인 단일 문서가 있다면 해당 문서 정보 반환 (MVP 방식)
     * 
     * @param {string} ownerUuid 로컬스토리지에 저장된 사용자 UUID 식별자
     * @returns {Promise<Object>} 문서 생성/탐색 결과 { success, data: { id, edit_token, is_new } }
     */
    initDocument: async (ownerUuid) => {
        try {
            const res = await fetch(`${API_BASE}/docs/create.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner_uuid: ownerUuid })
            });
            return await res.json();
        } catch (err) {
            console.error('API Error (initDocument):', err);
            return { success: false };
        }
    },

    /**
     * 공유 링크(/?id=XXX)로 들어왔을 때 해당 문서의 내용을 조회
     * 조회 후 문서의 owner_uuid와 접속자의 로컬 UUID가 일치 시 에디터 모드로 진입
     * 
     * @param {string} docId 문서 번호 (예: DOC-XYZ)
     * @returns {Promise<Object>} 불러온 문서 결과 { success, data: { id, owner_uuid, history_json } }
     */
    readDocument: async (docId) => {
        try {
            const res = await fetch(`${API_BASE}/docs/read.php?id=${encodeURIComponent(docId)}`);
            return await res.json();
        } catch (err) {
            console.error('API Error (readDocument):', err);
            return { success: false };
        }
    },

    /**
     * 디바운싱(Debounce)을 통해 주기적으로 현재 상태를 DB에 반영 (저장)
     * Auth 헤더로 수정 권한 토큰(`edit_token`)을 제출해야만 갱신됨
     * 
     * @param {string} docId 문서 번호
     * @param {string} editToken 서버에서 발급한 비밀 토큰
     * @param {string} historyJson S.history 배열을 직렬화(JSON)시킨 데이터
     */
    syncDocument: async (docId, editToken, historyJson) => {
        try {
            console.log('[SyncAPI] syncDocument request with token in body:', editToken);
            const res = await fetch(`${API_BASE}/docs/sync.php`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: docId, edit_token: editToken, history_json: historyJson })
            });
            return await res.json();
        } catch (err) {
            console.error('API Error (syncDocument):', err);
            return { success: false };
        }
    },

    /**
     * 원본 이미지를 업로드하여 서버 스토리지(uploads)에 저장하고 정적 URL 취득
     * DB 부하(1MB 제한) 방지를 위해 Base64를 쓰지 않고 이 URL로 변환하여 history에 기록함
     * 
     * @param {Blob|File} imageFile 캔버스/업로드에서 추출된 이미지 바이너리
     * @param {string} [docId] 연관된 문서 번호 (DB 매핑용)
     * @returns {Promise<Object>} 파일 업로드 결과 { success, url }
     */
    uploadImage: async (imageFile, docId = '') => {
        try {
            const formData = new FormData();
            formData.append('image', imageFile);
            if (docId) formData.append('document_id', docId);

            const res = await fetch(`${API_BASE}/upload.php`, {
                method: 'POST',
                body: formData
            });
            return await res.json();
        } catch (err) {
            console.error('API Error (uploadImage):', err);
            return { success: false };
        }
    }
};
