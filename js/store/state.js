/**
 * @file state.js
 * @description 애플리케이션의 전역 상태(Global State) 및 색상 등 상수를 관리하는 모듈
 */
export const COLORS = { box: '#f43f5e', purple: '#8b5cf6', draft: '#3b82f6', handle: '#ffffff' };
export const IMG_ICON = `🖼️`;
export const HANDLE_R = 5;

export const S = {
    img: null, w: 0, h: 0, baseImgSrc: null, annos: [], draftRect: null, activeAnnoId: null,
    state: 'IDLE', action: null, dragStart: { x: 0, y: 0 }, fixedPos: { x: null, y: null }, originalAnnoState: null, history: [], editingHistoryId: null, currentHistoryTab: 'INCOMPLETE',
    qrImage: null, currentCategory: null, isFitMode: false, fitScale: 1, zoom: 100, tutIndex: 0,
    myUuid: null, docId: null, editToken: null, isViewerMode: false, memoImg: null,
    maintUrl: null, // 유지보수 대상 홈페이지 대표 URL
    selectedAssets: new Set(), isAssetMode: false,
    editingOriginalData: null,
    importStartTime: null, importSource: null,
    lastImportFailed: false,
    hasEditRights: false // 뷰어 모드에서의 편집 권한 여부
};

export const ASSET_LABELS = {
    'issue-not-open': '홈페이지가 아예 안 열려요',
    'issue-page-error': '특정 페이지가 안 들어가져요',
    'issue-bug': '갑자기 오류가 발생해요',
    'lost-admin': '관리자 로그인 정보를 잊어버렸어요',
    'lost-server-info': 'FTP / 서버 접속 정보를 몰라요',
    'lost-where': '어디서 관리하는지 모르겠어요',
    'perf-slow': '홈페이지가 너무 느려요',
    'perf-loading': '접속은 되는데 로딩이 오래 걸려요',
    'move-site': '홈페이지를 다른 곳으로 옮기고 싶어요',
    'move-hosting': '서버/호스팅을 바꾸고 싶어요',
    'issue-domain': '도메인이 연결이 안 돼요',
    'issue-url-change': '주소를 바꾸고 싶어요',
    'issue-ssl': 'SSL(보안) 경고가 떠요',
    'issue-unknown': '뭐가 문제인지 모르겠어요',
    'issue-consult': '상담이 필요해요'
};
