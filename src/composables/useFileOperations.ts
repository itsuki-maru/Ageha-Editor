import { ref, watch } from "vue";
import { open, save, confirm } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { ResponseTextData, StatusCode } from "../interface";
import { translate } from "@/i18n";

export function useFileOperations(
  getEditorContent: () => string,
  setEditorContent: (text: string) => void,
  showMessage: (msg: string) => void,
) {
  /** 現在編集中のファイルの絶対パス。未保存時は先頭に `*` が付く。新規時は空文字。 */
  const activeFilePath = ref("");
  const isEdit = ref(false);

  // これらを ref にしない理由: テンプレートには公開せず、変更検知ロジック内だけで使うため。
  let oldContent = "";
  let newContent = "";

  watch(activeFilePath, async (path) => {
    const window = getCurrentWindow();
    await window.setTitle(path === "" ? "Ageha" : path);
  });

  function trackChange(content: string) {
    newContent = content;
    if (oldContent === newContent) {
      if (activeFilePath.value.includes("*")) {
        activeFilePath.value = activeFilePath.value.replace(/\*/g, "");
        isEdit.value = false;
      }
    } else {
      if (!activeFilePath.value.includes("*")) {
        activeFilePath.value = `*${activeFilePath.value}`;
        isEdit.value = true;
      }
    }
  }

  async function confirmUnsaved(): Promise<boolean> {
    if (!isEdit.value) return true;
    return await confirm(translate("dialog.unsavedMessage"), {
      title: translate("dialog.unsavedTitle"),
      kind: "warning",
    });
  }

  async function readFile(filePath: string): Promise<string | undefined> {
    try {
      const response: ResponseTextData = await invoke("read_file", { targetFile: filePath });
      return response.text_data;
    } catch (error) {
      console.error("Failed to read file:", error);
      return undefined;
    }
  }

  function loadContent(textData: string, filePath: string) {
    setEditorContent(textData);
    // 読み込んだ内容を基準値にセットし、以後の差分だけを未保存差分とする。
    oldContent = textData;
    newContent = textData;
    activeFilePath.value = filePath;
    isEdit.value = false;
  }

  async function fileOpen(): Promise<void> {
    if (!(await confirmUnsaved())) return;

    const filePath = await selectFile(translate("file.markdownFilter"), ["md", "txt"]);
    if (!filePath) return;

    const textData = await readFile(filePath);
    if (textData !== undefined) {
      loadContent(textData, filePath);
    }
  }

  async function selectFile(name: string, extensions: string[]): Promise<string | undefined> {
    try {
      const selectedFilePath = await open({
        directory: false,
        multiple: false,
        filters: [{ name: name, extensions: extensions }],
      });
      return selectedFilePath ?? undefined;
    } catch (error) {
      console.error("Failed to select file:", error);
      showMessage(translate("dialog.fileSelectError"));
      return undefined;
    }
  }

  async function callSave(savePath: string, data: string): Promise<StatusCode> {
    try {
      return await invoke<StatusCode>("save_file", {
        savePath: savePath,
        markdownTextData: data,
      });
    } catch (error) {
      return { status_code: 500, message: `${error}` };
    }
  }

  async function fileSave(): Promise<void> {
    const markdownText = getEditorContent();

    if (activeFilePath.value === "*" || activeFilePath.value === "") {
      const path = await save({
        filters: [{ name: translate("file.markdownSaveFilter"), extensions: ["md"] }],
      });
      if (!path) return;

      const status = await callSave(path, markdownText);
      if (status.status_code !== 200) return;
      activeFilePath.value = path;
    } else {
      const trimSavePath = activeFilePath.value.replace(/\*/g, "");
      const status = await callSave(trimSavePath, getEditorContent());
      if (status.status_code !== 200) return;
      activeFilePath.value = trimSavePath;
    }

    // 保存成功後は現在内容を新しい基準値として保持し直す。
    oldContent = getEditorContent();
    newContent = oldContent;
    isEdit.value = false;
  }

  async function saveHtmlFile(htmlContent: string): Promise<void> {
    const path = await save({
      filters: [{ name: translate("file.htmlSaveFilter"), extensions: ["html"] }],
    });
    if (!path) return;

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
