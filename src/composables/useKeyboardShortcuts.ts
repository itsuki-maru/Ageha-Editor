import { onMounted, onUnmounted } from "vue";

// キーボードショートカットをここへ集約しておくことで、
// ボタン UI とショートカット定義を疎結合に保てるようにしている。
export interface ShortcutActions {
  fileOpen: () => void;
  fileSave: () => void;
  readImage: () => void;
  printOut: () => void;
  exportHtml: () => void;
  togglePreview: () => void;
  toggleInputTool: () => void;
  toggleHelp: () => void;
  openNewInstance: () => void;
  drawMermaid: () => void;
  toggleVimMode: () => void;
  closeModals: () => void;
}

export function useKeyboardShortcuts(actions: ShortcutActions) {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Ctrl + Alt 系は画面表示や出力など、アプリ全体の補助操作へ割り当てる。
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
      event.preventDefault();
      actions.closeModals();
    }
  };

  onMounted(() => {
    window.addEventListener("keydown", handleKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", handleKeyDown);
  });
}
