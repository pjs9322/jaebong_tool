/**
 * @file gtm.js
 * @description Google Tag Manager dataLayer 푸시를 위한 유틸리티
 */
import { S } from '../store/state.js';

export const GTM = {
    /**
     * dataLayer에 이벤트 푸시
     * @param {string} eventName 
     * @param {Object} params 
     */
    push: (eventName, params = {}) => {
        if (!window.dataLayer) {
            console.warn('GTM dataLayer not found');
            return;
        }

        // 설계서 규격에 따른 공통 파라미터 구성
        const commonParams = {
            workspace_id: S.docId,
            share_link_id: S.docId, // 현재는 1:1 매핑
            user_uuid: S.myUuid,
            user_role: S.isViewerMode ? 'reviewer' : 'creator',
            is_viewer_mode: S.isViewerMode,
            timestamp: new Date().toISOString()
        };

        // 이벤트명 정규화 (jt_ 접두어 누락 시 자동 추가, 단 표준 이벤트 제외)
        const standardEvents = ['tutorial_begin', 'tutorial_complete', 'share', 'app_init'];
        let finalEventName = eventName;
        if (!standardEvents.includes(eventName) && !eventName.startsWith('jt_')) {
            finalEventName = 'jt_' + eventName;
        }

        window.dataLayer.push({
            event: finalEventName,
            ...commonParams,
            ...params
        });
    }
};
