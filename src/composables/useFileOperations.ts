import { ref, watch } from "vue";
import { open, save, confirm } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { ResponseTextData, StatusCode } from "../interface";

// ファイルの読み書き・ダイアログ表示・未保存状態の追跡を一手に管理する composable。
// コンポーネント側からは「開く・保存する」という意図だけで扱えるようにし、
// Tauri API の呼び出しやパス操作はここへ閉じ込める。

/**
 * ファイル操作に関連するすべての状態とアクションを提供する composable。
 * @param getEditorContent - エディタの現在の本文テキストを返すコールバック
 * @param setEditorContent - エディタの本文テキストを差し替えるコールバック
 * @param showMessage - エラーメッセージをユーザーへ表示するコールバック
 */
export function useFileOperations(
  getEditorContent: () => string,
  setEditorContent: (text: string) => void,
  showMessage: (msg: string) => void,
) {
  /** 現在編集中のファイルの絶対パス。未保存時は先頭に `*` が付く。新規時は空文字。 */
  const activeFilePath = ref("");
  /** 最後に保存した内容から変更があるかどうかのフラグ */
  const isEdit = ref(false);

  // 未保存判定のための基準値と現在値を保持する。
  // これらを ref にしない理由: テンプレートには公開せず、変更検知ロジック内だけで使うため。
  let oldContent = "";
  let newContent = "";

  // ファイルパスが変わったらウィンドウタイトルバーを更新する。
  // ファイル未選択時は "Ageha" のみ表示し、パスがある場合はパスをそのまま表示する。
  watch(activeFilePath, async (path) => {
    const window = getCurrentWindow();
    await window.setTitle(path === "" ? "Ageha" : path);
  });

  /**
   * エディタの現在テキストを受け取り、基準値との差分で未保存状態を更新する。
   * 変更があればパスに `*` を付加し、基準値に戻れば `*` を取り除く。
   * @param content - エディタの最新テキスト
   */
  function trackChange(content: string) {
    newContent = content;
    if (oldContent === newContent) {
      if (activeFilePath.value.includes("*")) {
        // 保存済み状態へ戻ったら未保存マークを除去する。
        activeFilePath.value = activeFilePath.value.replace(/\*/g, "");
        isEdit.value = false;
      }
    } else {
      if (!activeFilePath.value.includes("*")) {
        // 変更が入った瞬間に未保存マークを付与する。
        activeFilePath.value = `*${activeFilePath.value}`;
        isEdit.value = true;
      }
    }
  }

  /**
   * 未保存の変更がある場合、ユーザーへ確認ダイアログを表示する。
   * @returns ユーザーが操作を続行することを承認した場合 true
   */
  async function confirmUnsaved(): Promise<boolean> {
    // 変更がなければ確認なしで続行する。
    if (!isEdit.value) return true;
    return await confirm("ファイルが保存されていません。よろしいですか??", {
      title: "保存の確認",
      kind: "warning",
    });
  }

  /**
   * Rust の `read_file` コマンドを呼び出してファイルを読み込む。
   * @param filePath - 読み込む対象ファイルの絶対パス
   * @returns ファイルの本文テキスト。読み込み失敗時は undefined。
   */
  async function readFile(filePath: string): Promise<string | undefined> {
    try {
      const response: ResponseTextData = await invoke("read_file", { targetFile: filePath });
      return response.text_data;
    } catch (error) {
      console.error("Failed to read file:", error);
      return undefined;
    }
  }

  /**
   * 新しいファイルの本文と絶対パスをエディタへ反映し、未保存状態をリセットする。
   * ファイルを開いた直後、およびドラッグ&ドロップ時に呼ぶ。
   * @param textData - ファイルの本文テキスト
   * @param filePath - ファイルの絶対パス
   */
  function loadContent(textData: string, filePath: string) {
    setEditorContent(textData);
    // 読み込んだ内容を基準値にセットし、以後の差分だけを未保存差分とする。
    oldContent = textData;
    newContent = textData;
    activeFilePath.value = filePath;
    isEdit.value = false;
  }

  /**
   * ファイルを開くダイアログを表示し、選択されたファイルをエディタへ読み込む。
   * 未保存変更がある場合は先に確認ダイアログを出す。
   */
  async function fileOpen(): Promise<void> {
    if (!(await confirmUnsaved())) return;

    const filePath = await selectFile("Markdown File", ["md", "txt"]);
    if (!filePath) return;

    const textData = await readFile(filePath);
    if (textData !== undefined) {
      loadContent(textData, filePath);
    }
  }

  /**
   * ファイル選択ダイアログを開き、選択されたファイルパスを返す汎用関数。
   * @param name - ダイアログに表示するフィルタ名称
   * @param extensions - 選択を許可するファイル拡張子の配列
   * @returns 選択されたファイルの絶対パス。キャンセル時は undefined。
   */
  async function selectFile(
    name: string,
    extensions: string[],
  ): Promise<string | undefined> {
    try {
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

  /**
   * Rust の `save_file` コマンドを呼び出してファイルを保存する内部関数。
   * @param savePath - 保存先のファイルパス
   * @param data - 保存するテキストデータ
   * @returns Rust 側が返す StatusCode
   */
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

  /**
   * エディタの現在内容をファイルへ保存する。
   * - 新規ファイル（パスなし）の場合: 名前を付けて保存ダイアログを表示する。
   * - 既存ファイルの場合: 現在のパスへ上書き保存する。
   */
  async function fileSave(): Promise<void> {
    const markdownText = getEditorContent();

    if (activeFilePath.value === "*" || (markdownText === "" && activeFilePath.value === "")) {
      // 新規ファイルとして保存先を決める。
      const path = await save({
        filters: [{ name: "markdowntext", extensions: ["md"] }],
      });
      if (!path) return;

      const status = await callSave(path, markdownText);
      if (status.status_code !== 200) return;
      // 保存先が決まったら activeFilePath を確定し、次回から上書き保存へ切り替える。
      activeFilePath.value = path;
    } else {
      // 既存パスへ上書き保存する。パスに残っている `*` は事前に取り除く。
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

  /**
   * 現在の HTML を名前を付けて保存ダイアログ経由でエクスポートする。
   * Markdown モード・スライドモードどちらの HTML エクスポートでも共通で使う。
   * @param htmlContent - 保存する HTML 文字列
   */
  async function saveHtmlFile(htmlContent: string): Promise<void> {
    const path = await save({
      filters: [{ name: "html", extensions: ["html"] }],
    });
    if (!path) return;

    // 保存処理は Markdown ファイルと共通の callSave を再利用する。
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
