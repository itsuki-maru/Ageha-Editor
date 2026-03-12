import { shallowRef, onMounted, onUnmounted, type Ref } from "vue";
import * as ace from "ace-builds";
import type { Ace } from "ace-builds";
import "ace-builds/src-noconflict/ext-searchbox";
import "ace-builds/src-noconflict/mode-markdown";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/keybinding-vim";
import { EDITOR_FONT_SIZE } from "../constants";

// Ace エディタの初期化と操作 API を composable に閉じ込めることで、
// 画面コンポーネント側では宣言的に扱えるようにしている。
export interface UseAceEditorOptions {
  vimMode: Ref<boolean | null>;
  onSave: () => void;
  onChange: (value: string) => void;
}

export function useAceEditor(
  editorRef: Ref<HTMLDivElement | null>,
  options: UseAceEditorOptions,
) {
  const editor = shallowRef<Ace.Editor | null>(null);

  onMounted(() => {
    if (!editorRef.value) return;

    // まず対象 DOM に対して Ace インスタンスを作成する。
    const ed = ace.edit(editorRef.value);
    // Ageha は Markdown 編集専用なので、モードや折り返しをここで固定する。
    ed.getSession().setMode("ace/mode/markdown");
    ed.getSession().setUseWrapMode(true);
    ed.setFontSize(EDITOR_FONT_SIZE);
    ed.setShowPrintMargin(false);

    // Vimモードの適用
    if (options.vimMode.value) {
      // 永続化された設定が有効なら初期化時点で Vim キーバインドへ切り替える。
      ed.setKeyboardHandler("ace/keyboard/vim");
    }

    // Vim の :wq / :w コマンドをカスタマイズ
    const vimApi = ace.require("ace/keyboard/vim");
    vimApi.CodeMirror.Vim.defineEx("wq", "wq", () => {
      options.onSave();
    });
    vimApi.CodeMirror.Vim.defineEx("write", "w", () => {
      options.onSave();
    });

    // editorの変更を監視
    ed.on("change", () => {
      // Ace 内部ではなく Vue 側の本文を正にするため、毎回コールバックで返す。
      options.onChange(ed.getValue());
    });

    editor.value = ed;
  });

  onUnmounted(() => {
    editor.value?.destroy();
  });

  function getValue(): string {
    return editor.value?.getValue() ?? "";
  }

  function setValue(text: string): void {
    if (editor.value && editor.value.getValue() !== text) {
      // 同じ内容を無駄に流し込むとカーソル位置が飛びやすいため、
      // 値が本当に変わったときだけ Ace 側へ反映する。
      editor.value.setValue(text, 1);
    }
  }

  function insertAtCursor(text: string): void {
    if (!editor.value) return;
    const cursorPosition = editor.value.getCursorPosition();
    // ツールボタンなどからの挿入は現在カーソル位置へ差し込み、そのまま編集を続けられるようにする。
    editor.value.session.insert(cursorPosition, text);
    editor.value.focus();
  }

  function setVimMode(enabled: boolean): void {
    if (!editor.value) return;
    // Ace では空文字を渡すと標準キーバインドへ戻せる。
    editor.value.setKeyboardHandler(enabled ? "ace/keyboard/vim" : "");
  }

  function focus(): void {
    editor.value?.focus();
  }

  function getSession(): Ace.EditSession | undefined {
    return editor.value?.getSession();
  }

  function getRenderer(): Ace.VirtualRenderer | undefined {
    return editor.value?.renderer;
  }

  return {
    editor,
    getValue,
    setValue,
    insertAtCursor,
    setVimMode,
    focus,
    getSession,
    getRenderer,
  };
}
