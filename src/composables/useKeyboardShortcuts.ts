import { onMounted, onUnmounted } from "vue";

// アプリ全体のキーボードショートカットを一か所で管理する composable。
// ボタン UI とショートカットを疎結合に保ち、
// 「どのキーを押したか」と「何をするか」を分離する設計にしている。
// 新しいショートカットを追加する際は ShortcutActions にアクションを追記し、
// handleKeyDown に case を足すだけで対応できる。

/** useKeyboardShortcuts に渡すアクションのインターフェイス。
 *  各プロパティは Editor.vue 側で実装した関数をそのまま渡す。 */
export interface ShortcutActions {
  /** Ctrl+O: ファイルを開くダイアログを表示する */
  fileOpen: () => void;
  /** Ctrl+S: 現在の内容をファイルへ保存する */
  fileSave: () => void;
  /** Ctrl+R: 画像ファイルを選択してエディタへ挿入する */
  readImage: () => void;
  /** Ctrl+Alt+P: 印刷 / PDF 出力ダイアログを開く */
  printOut: () => void;
  /** Ctrl+Alt+F: HTML ファイルとしてエクスポートする */
  exportHtml: () => void;
  /** Ctrl+Alt+W: 現在のプレビュー内容を別ウィンドウで表示する */
  openViewer: () => void;
  /** Ctrl+Alt+/: プレビューエリアの表示/非表示をトグルする */
  togglePreview: () => void;
  /** Ctrl+Alt+I: マークダウン入力ツールパネルの表示/非表示をトグルする */
  toggleInputTool: () => void;
  /** Ctrl+Alt+H: ヘルプモーダルの表示/非表示をトグルする */
  toggleHelp: () => void;
  /** Ctrl+Alt+N: 新しいエディタウィンドウを起動する */
  openNewInstance: () => void;
  /** Ctrl+M: Mermaid ダイアグラムを再描画する（Markdown モード専用） */
  drawMermaid: () => void;
  /** Ctrl+,: Vim キーバインドの有効/無効をトグルする */
  toggleVimMode: () => void;
  /** Escape: 開いているモーダル類をすべて閉じる */
  closeModals: () => void;
}

export function useKeyboardShortcuts(actions: ShortcutActions) {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Ctrl + Alt 系は画面表示や出力など、アプリ全体の補助操作へ割り当てる。
    // 単純な Ctrl 系と重複しないよう、補助キーの組み合わせで整理している。
    if (event.ctrlKey && event.altKey) {
      switch (event.key) {
        case "p":
          event.preventDefault();
          actions.printOut();
          return;
        case "f":
          event.preventDefault();
          actions.exportHtml();
          return;
        case "w":
          // プレビューと同じ内容を別ウィンドウで閲覧するためのショートカット。
          event.preventDefault();
          actions.openViewer();
          return;
        case "/":
          event.preventDefault();
          actions.togglePreview();
          return;
        case "i":
          event.preventDefault();
          actions.toggleInputTool();
          return;
        case "h":
          event.preventDefault();
          actions.toggleHelp();
          return;
        case "n":
          event.preventDefault();
          actions.openNewInstance();
          return;
      }
    }

    // Ctrl 単体はファイル操作や編集補助のショートカットとして扱う。
    if (event.ctrlKey) {
      switch (event.key) {
        case "o":
          event.preventDefault();
          actions.fileOpen();
          return;
        case "s":
          event.preventDefault();
          actions.fileSave();
          return;
        case "r":
          event.preventDefault();
          actions.readImage();
          return;
        case "m":
          // Mermaid 再描画は Markdown モード時のみ実際に処理される。
          // preventDefault しないのは意図的（他ブラウザ動作を妨げない）。
          actions.drawMermaid();
          return;
        case ",":
          event.preventDefault();
          actions.toggleVimMode();
          return;
      }
    }

    if (event.key === "Escape") {
      // モーダル類を一括で閉じられる退避キーとして使う。
      // ヘルプとメッセージモーダルが対象。
      event.preventDefault();
      actions.closeModals();
    }
  };

  onMounted(() => {
    // コンポーネントがマウントされたタイミングでグローバルに登録する。
    window.addEventListener("keydown", handleKeyDown);
  });

  onUnmounted(() => {
    // メモリリークを防ぐため、コンポーネント破棄時にリスナーを必ず外す。
    window.removeEventListener("keydown", handleKeyDown);
  });
}
