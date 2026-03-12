import { defineStore } from "pinia";
import { RustArgsInit } from "../interface";
import { invoke } from "@tauri-apps/api/core";

// アプリ起動時に Rust 側から渡される初期データを保持するストア。
// 開く対象ファイルやユーザー CSS はここを経由して各画面へ渡る。
const DEFAULT_STATE: RustArgsInit = {
  status: {
    status_code: 200,
    message: "",
  },
  file_abs_path: "",
  text_data: "",
  css_data: "",
  slide_css_data: "",
};

interface State {
  rustArgsData: RustArgsInit;
}

export const useRustArgsInitStore = defineStore({
  id: "rustArgs",
  state: (): State => {
    return {
      rustArgsData: DEFAULT_STATE,
    };
  },
  actions: {
    async init(): Promise<void> {
      try {
        const result = await invoke<RustArgsInit | null>("request_launch_args");
        if (result) {
          // 起動時点のファイル本文やユーザー CSS をそのまま保持する。
          this.rustArgsData = result;
        }
      } catch (_error) {}
    },
    // クリア
    clear() {
      this.rustArgsData = DEFAULT_STATE;
    },
  },
});
