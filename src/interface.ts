// ローカルストレージの情報格納
export interface LocalStrageItem {
    isShowToolsFromLocalStrage: boolean | null;
    isPreviewFromLocalStrage: boolean | null;
};

export interface StatusCode {
    status_code: number,
    message: string,
}

// Rustバックエンドから取得したマークダウンファイルの情報
export interface ResponseTextData {
    status: StatusCode,
    text_data: string,
}

// Rustバックエンドから取得したCSSファイルの情報
export interface ResponseCSSData {
    status: StatusCode,
    css: string,
}

// 初期データとの差分を保持
export interface DiffEditorData {
    oldEditorContent: string,
    newEdirotContent: string,
}

// Rust側から受け取ったファイル保持
export interface RustArgsInit {
    status: StatusCode,
    file_abs_path: string;
    text_data: string;
    css_data: string;
};
