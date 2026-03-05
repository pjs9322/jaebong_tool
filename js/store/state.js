/**
 * @file state.js
 * @description 애플리케이션의 전역 상태(Global State) 및 색상 등 상수를 관리하는 모듈
 */
export const COLORS = { box: '#f43f5e', draft: '#3b82f6', handle: '#ffffff' };
export const HANDLE_R = 5;

export const S = {
    img: null, w: 0, h: 0, baseImgSrc: null, annos: [], draftRect: null, activeAnnoId: null,
    state: 'IDLE', action: null, dragStart: { x: 0, y: 0 }, history: [], editingHistoryId: null,
    qrImage: null, currentCategory: 'text', isFitMode: false, zoom: 100, tutIndex: 0,
    myUuid: null, docId: null, editToken: null, isViewerMode: false
};
