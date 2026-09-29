import { shallowRef, onMounted, onUnmounted, type Ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import * as ace from "ace-builds";
import type { Ace } from "ace-builds";
import "ace-builds/src-noconflict/ext-searchbox";
import "ace-builds/src-noconflict/ext-language_tools";
import "ace-builds/src-noconflict/mode-markdown";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/keybinding-vim";
import { EDITOR_FONT_SIZE } from "../constants";

export interface UseAceEditorOptions {
  vimMode: Ref<boolean | null>;
  /** `:w` / `:wq` コマンドおよびショートカット保存時に呼ばれるコールバック */
  onSave: () => void;
  onChange: (value: string) => void;
  /** 相対画像パス候補の基準にする、現在編集中のファイルパスを返す。 */
  getActiveFilePath?: () => string;
}

interface ImagePathContext {
  /** 現在カーソル位置までに入力済みの画像パス文字列 */
  pathText: string;
  /** 補完確定時に置き換えるパス部分の開始カラム */
  startColumn: number;
}

export function useAceEditor(editorRef: Ref<HTMLDivElement | null>, options: UseAceEditorOptions) {
  // Ace インスタンスは shallowRef で保持し、内部プロパティの深い追跡を避ける。
  const editor = shallowRef<Ace.Editor | null>(null);

  onMounted(() => {
    if (!editorRef.value) return;

    const ed = ace.edit(editorRef.value);

    ed.getSession().setMode("ace/mode/markdown");
    ed.getSession().setUseWrapMode(true);
    ed.setFontSize(EDITOR_FONT_SIZE);
    ed.setShowPrintMargin(false);
    // Markdown 画像記法と <img src> の入力中だけ動く専用補完を登録する。
    const imagePathCompleter = createImagePathCompleter(options);
    ed.setOptions({
      enableBasicAutocompletion: [imagePathCompleter],
      enableLiveAutocompletion: [imagePathCompleter],
      liveAutocompletionDelay: 120,
      liveAutocompletionThreshold: 0,
    });

    if (options.vimMode.value) {
      ed.setKeyboardHandler("ace/keyboard/vim");
    }

    // Vim の :wq / :w コマンドを Ageha のファイル保存へ接続する。
    const vimApi = ace.require("ace/keyboard/vim");
    vimApi.CodeMirror.Vim.defineEx("wq", "wq", () => {
      options.onSave();
    });
    vimApi.CodeMirror.Vim.defineEx("write", "w", () => {
      options.onSave();
    });

    ed.on("change", () => {
      options.onChange(ed.getValue());
    });

    editor.value = ed;
  });

  onUnmounted(() => {
    // destroy() を呼ばないとリスナーやタイマーがリークする可能性がある。
    editor.value?.destroy();
  });

  function getValue(): string {
    return editor.value?.getValue() ?? "";
  }

  /** 同じ本文の再設定によるカーソル位置の変化を防ぐ。 */
  function setValue(text: string): void {
    if (editor.value && editor.value.getValue() !== text) {
      editor.value.setValue(text, 1);
    }
  }

  function insertAtCursor(text: string): void {
    if (!editor.value) return;
    const cursorPosition = editor.value.getCursorPosition();
    editor.value.session.insert(cursorPosition, text);
    // 挿入後もすぐに入力を続けられるようエディタへフォーカスを戻す。
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

function createImagePathCompleter(options: UseAceEditorOptions): Ace.Completer {
  const completer: Ace.Completer = {
    id: "agehaImagePathCompleter",
    // ファイル名には `-` や `.` なども含まれるため、空白や閉じ括弧までを補完対象にする。
    identifierRegexps: [/[^\s)\]"']+/],
    // パス入力開始やディレクトリ移動のタイミングで候補を開きやすくする。
    triggerCharacters: ["/", "\\", ".", "(", '"', "'"],
    async getCompletions(_editor, session, position, _prefix, callback) {
      const line = session.getLine(position.row);
      const context = getImagePathContext(line, position.column);
      if (!context || isRemoteOrDataPath(context.pathText)) {
        callback(null, []);
        return;
      }

      try {
        const suggestions = await invoke<string[]>("list_image_path_suggestions", {
          inputPath: normalizeImagePathInput(context.pathText),
          baseFilePath: normalizeActiveFilePath(options.getActiveFilePath?.() ?? ""),
        });
        callback(
          null,
          suggestions.map((suggestion) => ({
            caption: suggestion,
            value: suggestion,
            meta: suggestion.endsWith("/") ? "folder" : "image",
            score: suggestion.endsWith("/") ? 1000 : 900,
            skipFilter: true,
            range: {
              start: { row: position.row, column: context.startColumn },
              end: position,
            },
            completer,
          })),
        );
      } catch (error) {
        console.error("Failed to list image path suggestions:", error);
        callback(null, []);
      }
    },
    insertMatch(editor, completion) {
      const range = completion.range;
      const value = completion.value ?? completion.caption ?? "";
      if (range) {
        // Ace 標準の単語置換ではパス区切りをまたげないため、明示した範囲を置換する。
        editor.session.replace(range, value);
      } else {
        editor.insert(value);
      }
    },
  };
  return completer;
}

function getImagePathContext(line: string, column: number): ImagePathContext | null {
  const beforeCursor = line.slice(0, column);
  // Markdown 画像記法 `![alt](path` の `path` 部分を補完対象にする。
  const markdownMatch = /!\[[^\]]*]\(([^)\s]*)$/.exec(beforeCursor);
  if (markdownMatch?.index !== undefined) {
    return {
      pathText: markdownMatch[1],
      startColumn: beforeCursor.length - markdownMatch[1].length,
    };
  }

  // Markdown 内に直接書かれた HTML 画像タグの src 属性も同じ候補を使えるようにする。
  const htmlImageMatch = /<img\b[^>]*\bsrc\s*=\s*["']([^"']*)$/i.exec(beforeCursor);
  if (htmlImageMatch?.index !== undefined) {
    return {
      pathText: htmlImageMatch[1],
      startColumn: beforeCursor.length - htmlImageMatch[1].length,
    };
  }

  return null;
}

function isRemoteOrDataPath(pathText: string): boolean {
  return /^(?:https?:|data:|asset:|blob:)/i.test(pathText);
}

function normalizeImagePathInput(pathText: string): string {
  // Ageha の画像候補では `/` を現在ファイル基準のルートとして扱う。
  if (pathText === "/") {
    return "./";
  }

  // `/images/foo.png` のような入力も、候補検索時は `./images/foo.png` として解釈する。
  if (pathText.startsWith("/") && !pathText.startsWith("//")) {
    return `.${pathText}`;
  }

  return pathText;
}

// アクティブなファイルパスを正規化する。未保存状態では先頭に `*` が付くため、取り除く
function normalizeActiveFilePath(filePath: string): string {
  return filePath.replace(/^\*+/, "");
}
