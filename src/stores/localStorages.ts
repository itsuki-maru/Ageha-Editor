import { defineStore } from "pinia";
import { LazyStore } from "@tauri-apps/plugin-store";
import type { LocalStrageItem } from "../interface";


const store = new LazyStore("settings.json");

const STORAGE_KEY = "app/localStorageItem";
const DEFAULT_STATE: LocalStrageItem = {
    isViewerModeFromLocalStrage: "true",
    isPreviewFromLocalStrage: "true",
    isShowToolsFromLocalStrage: "true",
};

function safeParse(json: string | null): LocalStrageItem {
    try {
        return json ? { ...DEFAULT_STATE, ...JSON.parse(json) } : { ...DEFAULT_STATE };
    } catch {
        // 壊れたJSONは破棄してデフォルト値へ戻す
        return { ...DEFAULT_STATE };
    }
};

export const useLocalStorageStore = defineStore({
    id: "localStorage",
    state: (): LocalStrageItem => ({ ...DEFAULT_STATE }),
    getters: {
        isLoggedIn: (s) => !!s.isPreviewFromLocalStrage && !!s.isShowToolsFromLocalStrage && !!s.isViewerModeFromLocalStrage,
    },
    actions: {
        init(): void {
            const loaded = safeParse(localStorage.getItem(STORAGE_KEY));
            this.$patch(loaded);
            // 以降の変更を自動保存
            this.$subscribe(
                (_mutation, state) => {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
                },
                { detached: true }
            );
            // タブ/ウィンドウ間での同期（別タブで変更されたら即反映）
            window.addEventListener("storage", (e) => {
                if (e.key === STORAGE_KEY) {
                    const next = safeParse(e.newValue);
                    this.$patch(next);
                }
            });
        },

        // 値の更新
        setViewerMode(isViewerMode: boolean | null) {
            if (isViewerMode) {
                this.isViewerModeFromLocalStrage = "true";
            } else {
                this.isViewerModeFromLocalStrage = "false";
            }
        },
        setPreview(isPreview: boolean | null) {
            if (isPreview) {
                this.isPreviewFromLocalStrage = "true";
            } else {
                this.isPreviewFromLocalStrage = "false";
            }
        },
        setMarkdownTools(isMarkdownTools: boolean | null) {
            if (isMarkdownTools) {
                this.isShowToolsFromLocalStrage = "true";
            } else {
                this.isShowToolsFromLocalStrage = "false";
            }
        },

        // クリア
        clear() {
            this.$patch({ ...DEFAULT_STATE });
            localStorage.removeItem(STORAGE_KEY);
        }
    }
});
