import { defineStore } from "pinia";
import { RustArgsInit } from "../interface";
import { invoke } from "@tauri-apps/api/core";


const DEFAULT_STATE: RustArgsInit = {
    status: {
        status_code: 200,
        message: "",
    },
    file_abs_path: "",
    text_data: "",
    css_data: "",
};

interface State {
    rustArgsData: RustArgsInit
};


export const useRustArgsInitStore = defineStore({
    id: "rustArgs",
    state: (): State => {
        return {
            rustArgsData: DEFAULT_STATE
        };
    },
    actions: {
        async init(): Promise<void> {
            try {
                const result = await invoke<RustArgsInit | null>("request_launch_args");
                if (result) {
                    this.rustArgsData = result;
                }
            } catch (error) {

            }
        },
        // クリア
        clear() {
            this.rustArgsData = DEFAULT_STATE;
        }
    }
});
