// ローカルストレージの情報格納
export interface LocalStrageItem {
    isShowToolsFromLocalStrage: string | null;
    isPreviewFromLocalStrage: string | null;
};

export interface StatusCode {
    status_code: number,
    message: string,
}

// Rustバックエンドから取得したマークダウンファイルの情報
export interface ResponseTextData {
    status: StatusCode,
    text_data:string,
}

// 初期データとの差分を保持
export interface DiffEditorData {
    oldEditorContent: string,
    newEdirotContent: string,
}