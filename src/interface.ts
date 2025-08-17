// ローカルストレージの情報格納
export interface LocalStrageItem {
    isViewerModeFromLocalStrage: string | null;
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

// Rust側から受け取ったファイル保持
export interface RustArgs {
    status: StatusCode,
    file_abs_path: string;
    text_data: string;
};