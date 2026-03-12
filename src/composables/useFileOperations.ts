import { ref, watch } from "vue";
import { open, save, confirm } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { ResponseTextData, StatusCode } from "../interface";

// ファイルの読み書き、ダイアログ表示、未保存状態の管理をまとめる。
// 画面側から見ると「開く・保存する」という意図だけで扱えるようにしている。
export function useFileOperations(
  getEditorContent: () => string,
  setEditorContent: (text: string) => void,
  showMessage: (msg: string) => void,
) {
  const activeFilePath = ref("");
  const isEdit = ref(false);
  // 初期データとの差分を保持
  let oldContent = "";
  let newContent = "";

  // ファイルパスが変わったらウィンドウタイトルを更新
  watch(activeFilePath, async (path) => {
    const window = getCurrentWindow();
    // タイトルバーに現在の対象ファイルを反映し、未保存マークも見えるようにする。
    await window.setTitle(path === "" ? "Ageha" : path);
  });

  // 変更検知
  function trackChange(content: string) {
    newContent = content;
    if (oldContent === newContent) {
      if (activeFilePath.value.includes("*")) {
        // 保存済み状態へ戻ったら、先頭の `*` を外す。
        activeFilePath.value = activeFilePath.value.replace(/\*/g, "");
        isEdit.value = false;
      }
    } else {
      if (!activeFilePath.value.includes("*")) {
        // 変更が入った瞬間に未保存マークを付ける。
        activeFilePath.value = `*${activeFilePath.value}`;
        isEdit.value = true;
      }
    }
  }

  // 未保存確認ダイアログ
  async function confirmUnsaved(): Promise<boolean> {
    // 未保存変更がなければ確認ダイアログは不要。
    if (!isEdit.value) return true;
    return await confirm("ファイルが保存されていません。よろしいですか??", {
      title: "保存の確認",
      kind: "warning",
    });
  }

  // Rust側でのマークダウンファイル読取処理
  async function readFile(filePath: string): Promise<string | undefined> {
    try {
      // 実ファイル読み込みは Rust 側コマンドへ委譲する。
      const response: ResponseTextData = await invoke("read_file", { targetFile: filePath });
      return response.text_data;
    } catch (error) {
      console.error("Failed to read file:", error);
      return undefined;
    }
  }

  // ファイル内容のロードとエディタへの反映
  function loadContent(textData: string, filePath: string) {
    // 新しいファイルを読み込んだ直後はその内容を基準値にし、
    // 以後の変更だけを未保存差分として判定できるようにする。
    setEditorContent(textData);
    oldContent = textData;
    newContent = textData;
    activeFilePath.value = filePath;
    isEdit.value = false;
  }

  // ファイルを開く
  async function fileOpen(): Promise<void> {
    if (!(await confirmUnsaved())) return;

    const filePath = await selectFile("Markdown File", ["md", "txt"]);
    if (!filePath) return;

    // ファイル選択後に読み込み、成功した場合だけエディタ状態を置き換える。
    const textData = await readFile(filePath);
    if (textData !== undefined) {
      loadContent(textData, filePath);
    }
  }

  // ファイル選択ダイアログ
  async function selectFile(
    name: string,
    extensions: string[],
  ): Promise<string | undefined> {
    try {
      // ダイアログ側で拡張子フィルタを付けて誤選択を防ぐ。
      const selectedFilePath = await open({
        directory: false,
        multiple: false,
        filters: [{ name: name, extensions: extensions }],
      });
      return selectedFilePath ?? undefined;
    } catch (error) {
      console.error("Failed to select file:", error);
      showMessage("ファイル選択時にエラーが発生しました");
      return undefined;
    }
  }

  // Rust側での保存処理
  async function callSave(savePath: string, data: string): Promise<StatusCode> {
    try {
      // 保存自体は Rust 側で行い、ここでは結果だけを受け取る。
      return await invoke<StatusCode>("save_file", {
        savePath: savePath,
        markdownTextData: data,
      });
    } catch (error) {
      return { status_code: 500, message: `${error}` };
    }
  }

  // ファイル保存
  async function fileSave(): Promise<void> {
    const markdownText = getEditorContent();

    if (activeFilePath.value === "*" || (markdownText === "" && activeFilePath.value === "")) {
      // 新規ファイル保存
      const path = await save({
        filters: [{ name: "markdowntext", extensions: ["md"] }],
      });
      if (!path) return;

      const status = await callSave(path, markdownText);
      if (status.status_code !== 200) return;
      // 新規保存では保存先が決まった時点で現在ファイルパスを更新する。
      activeFilePath.value = path;
    } else {
      // 上書き保存
      const trimSavePath = activeFilePath.value.replace(/\*/g, "");
      const status = await callSave(trimSavePath, getEditorContent());
      if (status.status_code !== 200) return;
      activeFilePath.value = trimSavePath;
    }

    // 保存成功後は現在内容を新しい基準値として持ち直す。
    oldContent = getEditorContent();
    newContent = oldContent;
    isEdit.value = false;
  }

  // HTMLファイル保存
  async function saveHtmlFile(htmlContent: string): Promise<void> {
    const path = await save({
      filters: [{ name: "html", extensions: ["html"] }],
    });
    if (!path) return;

    // HTML も保存コマンド自体は共通化している。
    const status = await callSave(path, htmlContent);
    if (status.status_code !== 200) return;
  }

  return {
    activeFilePath,
    isEdit,
    fileOpen,
    fileSave,
    saveHtmlFile,
    confirmUnsaved,
    readFile,
    loadContent,
    trackChange,
    selectFile,
  };
}
