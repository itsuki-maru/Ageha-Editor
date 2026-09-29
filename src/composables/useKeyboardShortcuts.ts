import { onMounted, onUnmounted } from "vue";

export interface ShortcutActions {
  fileOpen: () => void;
  fileSave: () => void;
  readImage: () => void;
  printOut: () => void;
  exportHtml: () => void;
  openViewer: () => void;
  togglePreview: () => void;
  toggleInputTool: () => void;
  toggleHelp: () => void;
  openNewInstance: () => void;
  openSlideshow: () => void;
  drawMermaid: () => void;
  toggleVimMode: () => void;
  closeModals: () => void;
}

export function useKeyboardShortcuts(actions: ShortcutActions) {
  const handleKeyDown = (event: KeyboardEvent) => {
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
        case "s":
          event.preventDefault();
          actions.openSlideshow();
          return;
      }
    }

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
