// アプリ全体で使い回す定数をここに集約しておくことで、
// UI の微調整や対応拡張子の追加を一か所で管理できるようにしている。
// ファイル拡張子
export const TEXT_FILE_EXTENSIONS = ["md", "txt"] as const;
export const IMAGE_FILE_EXTENSIONS = ["jpg", "jpeg", "png", "svg", "webp"] as const;

// UI 設定
export const EDITOR_FONT_SIZE = 16;
export const EDITOR_FOCUS_DELAY_MS = 250;
export const SCROLL_SYNC_DELAY_MS = 50;
export const TOOLTIP_DISPLAY_MS = 1000;
export const TOOLTIP_FADE_MS = 300;
