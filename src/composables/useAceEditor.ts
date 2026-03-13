import { shallowRef, onMounted, onUnmounted, type Ref } from "vue";
import * as ace from "ace-builds";
import type { Ace } from "ace-builds";
import "ace-builds/src-noconflict/ext-searchbox";
import "ace-builds/src-noconflict/mode-markdown";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/keybinding-vim";
import { EDITOR_FONT_SIZE } from "../constants";

// Ace エディタの初期化と操作 API を composable に閉じ込める。
// Editor.vue 側では宣言的にエディタを扱えるようにし、
// Ace 固有の API がコンポーネントに漏れ出ないようにする。
// shallowRef を使っているのは、Ace インスタンス内部プロパティを
// Vue のリアクティブシステムが深く追跡しないようにするためである。

/** useAceEditor に渡す設定オプション */
export interface UseAceEditorOptions {
  /** 起動時の Vim モード有効状態（ストアから渡す） */
  vimMode: Ref<boolean | null>;
  /** `:w` / `:wq` コマンドおよびショートカット保存時に呼ばれるコールバック */
  onSave: () => void;
  /** エディタの内容が変化するたびに呼ばれるコールバック。新しい本文テキストを受け取る。 */
  onChange: (value: string) => void;
}

/**
 * Ace エディタを指定 DOM 要素に初期化し、操作 API を返す composable。
 * @param editorRef - エディタをマウントする div 要素への ref
 * @param options - 保存コールバック、変更コールバック、Vim モード初期値
 */
export function useAceEditor(
  editorRef: Ref<HTMLDivElement | null>,
  options: UseAceEditorOptions,
) {
  // Ace インスタンスは shallowRef で保持し、内部プロパティの深い追跡を避ける。
  const editor = shallowRef<Ace.Editor | null>(null);

  onMounted(() => {
    if (!editorRef.value) return;

    // 対象 DOM 要素に Ace インスタンスを生成する。
    const ed = ace.edit(editorRef.value);

    // Ageha は Markdown 専用エディタなので、シンタックスモードと折り返しを固定する。
    ed.getSession().setMode("ace/mode/markdown");
    ed.getSession().setUseWrapMode(true);
    ed.setFontSize(EDITOR_FONT_SIZE);
    // 印刷マージンの縦線はテキストエディタには不要なので非表示にする。
    ed.setShowPrintMargin(false);

    // 永続化された設定が有効なら初期化時点で Vim キーバインドへ切り替える。
    if (options.vimMode.value) {
      ed.setKeyboardHandler("ace/keyboard/vim");
    }

    // Vim の :wq / :w コマンドを Ageha のファイル保存へ接続する。
    // defineEx の第 1 引数がコマンド名、第 2 引数が省略エイリアスである。
    const vimApi = ace.require("ace/keyboard/vim");
    vimApi.CodeMirror.Vim.defineEx("wq", "wq", () => {
      options.onSave();
    });
    vimApi.CodeMirror.Vim.defineEx("write", "w", () => {
      options.onSave();
    });

    // Ace 内部ではなく Vue 側の `editorContent` を正とするため、
    // 変更のたびに getValue() で最新テキストをコールバックへ返す。
    ed.on("change", () => {
      options.onChange(ed.getValue());
    });

    editor.value = ed;
  });

  onUnmounted(() => {
    // Ace インスタンスはコンポーネント破棄時に明示的に解放する。
    // destroy() を呼ばないとリスナーやタイマーがリークする可能性がある。
    editor.value?.destroy();
  });

  /** エディタの現在の本文テキストを返す。エディタ未初期化時は空文字。 */
  function getValue(): string {
    return editor.value?.getValue() ?? "";
  }

  /**
   * エディタの本文テキストを外部から差し替える。
   * 同一内容の場合はカーソル位置保護のためスキップする。
   * @param text - セットしたいテキスト
   */
  function setValue(text: string): void {
    if (editor.value && editor.value.getValue() !== text) {
      // setValue の第 2 引数に 1 を渡すとカーソルをテキスト末尾へ移動させない。
      // 外部からの反映（ファイル開きなど）でもカーソルが先頭に飛ばないようにする。
      editor.value.setValue(text, 1);
    }
  }

  /**
   * 現在のカーソル位置にテキストを挿入する。
   * ツールバーやマークダウン入力ツールからの記法挿入に使う。
   * @param text - 挿入するテキスト
   */
  function insertAtCursor(text: string): void {
    if (!editor.value) return;
    const cursorPosition = editor.value.getCursorPosition();
    editor.value.session.insert(cursorPosition, text);
    // 挿入後もすぐに入力を続けられるようエディタへフォーカスを戻す。
    editor.value.focus();
  }

  /**
   * Vim モードの有効・無効を切り替える。
   * @param enabled - true: Vim キーバインド / false: デフォルトキーバインド
   */
  function setVimMode(enabled: boolean): void {
    if (!editor.value) return;
    // Ace では空文字を渡すと標準キーバインドへ戻せる。
    editor.value.setKeyboardHandler(enabled ? "ace/keyboard/vim" : "");
  }

  /** エディタへフォーカスを当てる。ファイルロード後などに呼ぶ。 */
  function focus(): void {
    editor.value?.focus();
  }

  /** スクロール同期で使う Ace の EditSession を返す。 */
  function getSession(): Ace.EditSession | undefined {
    return editor.value?.getSession();
  }

  /** スクロール同期で使う Ace の VirtualRenderer を返す。 */
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
