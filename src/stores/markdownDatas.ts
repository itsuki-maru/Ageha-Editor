import { defineStore } from "pinia";
import { RustArgs } from "../interface";
import { invoke } from "@tauri-apps/api/core";


const DEFAULT_STATE: RustArgs = {
    status: {
        status_code: 200,
        message: "",
    },
    file_abs_path: "",
    text_data: "",
};

interface State {
    rustArgsData: RustArgs
};


export const useRustArgsStore = defineStore({
    id: "rustArgs",
    state: (): State => {
        return {
            rustArgsData: DEFAULT_STATE
        };
    },
    actions: {
        async init(): Promise<void> {
            try {
                const result = await invoke<RustArgs | null>("request_launch_args");
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
