<script setup lang="ts">
import { resolveStylePack, normalizeStylePack } from "@/utils/stylePacks";
import { computed, onMounted, ref, watch } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "katex/dist/katex.min.css";

import { useAceEditor } from "@/composables/useAceEditor";
import { useFileOperations } from "@/composables/useFileOperations";
import { useMarkdownPreview } from "@/composables/useMarkdownPreview";
import { useExport } from "@/composables/useExport";
import { useKeyboardShortcuts } from "@/composables/useKeyboardShortcuts";
import { useScrollSync } from "@/composables/useScrollSync";
import { useWindowSize } from "@/composables/useWindowSize";

import ToolbarButtons from "@/components/ToolbarButtons.vue";
import MarkdownTools from "@/components/MarkdownTools.vue";
import HelpModal from "@/components/HelpModal.vue";
import MessageModal from "@/components/MessageModal.vue";

import { openUrl as openExternalUrl } from "@tauri-apps/plugin-opener";
import { handleCopyButtonClick } from "@/utils/clipboard";
import { useLocalStorageStore } from "./stores/localStorages";
import { useRustArgsInitStore } from "./stores/appInits";
import { EDITOR_FOCUS_DELAY_MS, IMAGE_FILE_EXTENSIONS, TEXT_FILE_EXTENSIONS } from "./constants";
import { setLocale, useI18n } from "@/i18n";
import { detectDocumentMode, setDocumentMode } from "@/utils/documentMode";
import type { DocumentMode } from "@/interface";

// ---- Stores ----
const rustArgsStore = useRustArgsInitStore();
const localStorageItem = useLocalStorageStore();

// ---- UI 状態 ----
const isShowTools = ref<boolean | null>(null);
const isPreview = ref<boolean | null>(null);
const isScrollSync = ref<boolean | null>(null);
const isVimMode = ref<boolean | null>(null);
const showHelp = ref(false);
const isMessageModal = ref(false);
const messageText = ref("");
const { t, toggleLocale } = useI18n();

function showMessage(message: string) {
  messageText.value = message;
  isMessageModal.value = true;
}

// ---- ウィンドウサイズ ----
const { isHeightScreen, divHeight } = useWindowSize();

// ---- テンプレート refs ----
const editorRef = ref<HTMLDivElement | null>(null);
const previewArea = ref<HTMLElement | null>(null);

// ---- エディタ内容の管理 ----
const editorContent = ref("");
const selectedStylePack = computed(() =>
  normalizeStylePack(localStorageItem.stylePackFromLocalStorage),
);
const activeStyle = computed(() =>
  resolveStylePack(
    selectedStylePack.value,
    rustArgsStore.rustArgsData.css_data,
    rustArgsStore.rustArgsData.slide_css_data,
  ),
);
const slideCustomCss = computed(() => activeStyle.value.slideCss);
watch(
  () => activeStyle.value.previewCss,
  (css) => {
    let style = document.getElementById("user-css");
    if (!style) {
      style = document.createElement("style");
      style.id = "user-css";
      document.head.appendChild(style);
    }
    style.textContent = css;
  },
  { immediate: true, flush: "sync" },
);

// ---- ファイル操作 ----
const {
  activeFilePath,
  fileOpen,
  fileSave,
  saveHtmlFile,
  confirmUnsaved,
  readFile,
  loadContent,
  trackChange,
  selectFile,
} = useFileOperations(
  () => aceEditor.getValue(),
  (text: string) => {
    editorContent.value = text;
  },
  showMessage,
);

// ---- Ace エディタ ----
const aceEditor = useAceEditor(editorRef, {
  vimMode: isVimMode,
  onSave: () => fileSave(),
  onChange: (value: string) => {
    if (value !== editorContent.value) {
      editorContent.value = value;
    }
  },
  getActiveFilePath: () => activeFilePath.value,
});

watch(editorContent, (newContent) => {
  trackChange(newContent);
  aceEditor.setValue(newContent);
  rustArgsStore.rustArgsData.text_data = newContent;
});

// ---- マークダウンプレビュー ----
const {
  parsedHtml,
  previewFrameHtml,
  documentMode,
  slideRender,
  drawMermaid,
  renderMermaidToSvg,
  renderMarkdownHtmlForExport,
  renderMarkdownHtmlForViewer,
  renderSlidesDocumentForExport,
} = useMarkdownPreview(editorContent, activeFilePath, slideCustomCss, isPreview);
const previewTitle = computed(() =>
  documentMode.value === "slides" ? t("editor.slidePreview") : t("editor.preview"),
);
const isScrollSyncEnabled = computed(
  () => documentMode.value === "markdown" && isScrollSync.value === true,
);

// ---- エクスポート ----
const { printOut, exportHtml, exportPdf, isExportingPdf, openViewer, openSlideshow } = useExport(
  editorContent,
  documentMode,
  parsedHtml,
  previewFrameHtml,
  slideRender,
  () => activeStyle.value.markdownCss,
  () => activeStyle.value.slideCss,
  renderMermaidToSvg,
  renderMarkdownHtmlForExport,
  renderMarkdownHtmlForViewer,
  saveHtmlFile,
  showMessage,
  renderSlidesDocumentForExport,
);

// ---- スクロール同期 ----
useScrollSync(
  () => aceEditor.getSession(),
  () => aceEditor.getRenderer(),
  previewArea,
  isScrollSyncEnabled,
);

// ---- ローカルストレージ初期化 ----
onMounted(async () => {
  isShowTools.value = localStorageItem.isShowToolsFromLocalStorage;
  isPreview.value = localStorageItem.isPreviewFromLocalStorage;
  isScrollSync.value = localStorageItem.isScrollSyncFromLocalStorage;
  isVimMode.value = localStorageItem.isVimModeFromLocalStorage;
  setLocale(localStorageItem.localeFromLocalStorage ?? "ja");
});

// ---- 起動時のファイル読み込み ----
onMounted(async () => {
  try {
    const textData = rustArgsStore.rustArgsData.text_data;
    const filePath = rustArgsStore.rustArgsData.file_abs_path;
    if (textData || filePath) {
      loadContent(textData, filePath);
      editorContent.value = textData;
    }
    // 初期描画直後は Ace がまだ安定していないため、少し待ってからフォーカスする。
    setTimeout(() => {
      aceEditor.focus();
      aceEditor.setVimMode(isVimMode.value!);
    }, EDITOR_FOCUS_DELAY_MS);
  } catch (error) {
    console.error("Failed to initialize editor with launch args:", error);
  }
});

// ---- コピーボタン・外部リンクのグローバルクリックハンドラ ----
onMounted(() => {
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;

    if (target.classList.contains("copy-btn")) {
      // v-html 経由で描画されたコピー用ボタンもここで拾って処理する。
      handleCopyButtonClick(target);
    }

    // <strong> や <code> などリンク内の子要素がクリックされる場合に備え closest で祖先を探す。
    // anchor.href はブラウザが絶対 URL に解決した値を返すため、タウリ内部 URL との混在を防ぐため
    // 生属性値 getAttribute("href") を使って検証する。
    const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
    if (anchor) {
      const href = anchor.getAttribute("href") ?? "";
      if (href.startsWith("https://") || href.startsWith("http://")) {
        e.preventDefault();
        openExternalUrl(href).catch(console.error);
      }
    }
  });
});

// ---- スライド iframe からの外部リンク postMessage ブリッジ ----
// スライドプレビュー iframe 内のリンクは Tauri コンテキスト外のため直接 opener を呼べない。
// iframe 側から postMessage で通知を受け取り、メインウィンドウから opener.open を呼ぶ。
onMounted(() => {
  window.addEventListener("message", (e) => {
    if (!e.data || e.data.type !== "open-external") return;
    const url = String(e.data.url ?? "");
    // http(s):// 以外のプロトコル（javascript: / file:// 等）を確実に弾く。
    if (url.startsWith("https://") || url.startsWith("http://")) {
      openExternalUrl(url).catch(console.error);
    }
  });
});

// ---- ウィンドウクローズ時の確認 ----
onMounted(async () => {
  await getCurrentWindow().onCloseRequested(async (event) => {
    if (!(await confirmUnsaved())) {
      event.preventDefault();
    }
  });
});

// ---- ドラッグ＆ドロップ ----
listen("tauri://drag-drop", async (event) => {
  const paths = (event.payload as { paths: string[] }).paths;
  // いったん先頭の 1 ファイルだけを対象にする。
  const dropFilePath = paths[0];
  const extension = dropFilePath?.split(".").pop()?.toLowerCase();
  if (!extension) return;

  if ((TEXT_FILE_EXTENSIONS as readonly string[]).includes(extension)) {
    if (!(await confirmUnsaved())) return;

    const textData = await readFile(dropFilePath);
    if (textData !== undefined) {
      loadContent(textData, dropFilePath);
      editorContent.value = textData;
      rustArgsStore.rustArgsData.text_data = textData;
      rustArgsStore.rustArgsData.file_abs_path = dropFilePath;
    }
  }

  if ((IMAGE_FILE_EXTENSIONS as readonly string[]).includes(extension)) {
    const replacePath = dropFilePath?.replace(/\\/g, "/");
    const fileName = getFileName(replacePath);
    aceEditor.insertAtCursor(`![${fileName}](${replacePath})`);
  }
});

// ---- トグルハンドラ ----
function changeDocumentMode(mode: DocumentMode) {
  aceEditor.applyContentEdit(setDocumentMode(aceEditor.getValue(), mode));
}

function toggleDocumentMode() {
  changeDocumentMode(detectDocumentMode(aceEditor.getValue()) === "slides" ? "markdown" : "slides");
}

function handleInputTool() {
  isShowTools.value = !isShowTools.value;
  localStorageItem.setMarkdownTools(isShowTools.value);
}

function handlePreview() {
  isPreview.value = !isPreview.value;
  localStorageItem.setPreview(isPreview.value);
}

function handleScrollSync() {
  isScrollSync.value = !isScrollSync.value;
  localStorageItem.setScrollSync(isScrollSync.value);
}

function handleVimMode() {
  isVimMode.value = !isVimMode.value;
  localStorageItem.setVimMode(isVimMode.value);
  aceEditor.setVimMode(isVimMode.value!);
}

function handleLocaleToggle() {
  const next = toggleLocale();
  localStorageItem.setLocale(next);
}

// ---- 画像ファイル読み込み ----
async function readImage() {
  const imageFilePath = await selectFile(t("file.imageFilter"), ["png", "jpg", "jpeg", "svg"]);
  if (!imageFilePath) return;
  const fileName = getFileName(imageFilePath);
  aceEditor.insertAtCursor(`![${fileName}](${imageFilePath})`);
}

// ---- 新規インスタンス起動 ----
async function openNewInstance() {
  await invoke("spawn_self", { args: ["--new-window"] });
}

// ---- ユーティリティ ----
function getFileName(path: string): string {
  // Windows / POSIX どちらの区切り文字でも末尾ファイル名を取り出せるようにする。
  const segments = path.split(/[/\\]/);
  return segments[segments.length - 1];
}

// ---- キーボードショートカット ----
useKeyboardShortcuts({
  fileOpen,
  fileSave,
  readImage,
  printOut,
  exportHtml,
  openViewer,
  togglePreview: handlePreview,
  toggleInputTool: handleInputTool,
  toggleHelp: () => {
    showHelp.value = !showHelp.value;
  },
  openNewInstance,
  openSlideshow,
  drawMermaid,
  toggleVimMode: handleVimMode,
  closeModals: () => {
    isMessageModal.value = false;
    showHelp.value = false;
  },
});
</script>

<template>
  <ToolbarButtons
    :is-preview="isPreview"
    :is-scroll-sync="isScrollSync"
    :is-vim-mode="isVimMode"
    :document-mode="documentMode"
    :style-pack="selectedStylePack"
    @change-style-pack="localStorageItem.setStylePack"
    @file-open="fileOpen"
    @file-save="fileSave"
    @read-image="readImage"
    @print-out="printOut"
    @export-pdf="exportPdf"
    :is-exporting-pdf="isExportingPdf"
    @export-html="exportHtml"
    @toggle-preview="handlePreview"
    @toggle-scroll-sync="handleScrollSync"
    @toggle-tools="handleInputTool"
    @open-viewer="openViewer"
    @open-slideshow="openSlideshow"
    @new-instance="openNewInstance"
    @show-help="showHelp = true"
    @toggle-vim-mode="handleVimMode"
    @toggle-locale="handleLocaleToggle"
    @toggle-document-mode="toggleDocumentMode"
  />

  <div class="contents-area" :style="{ height: divHeight + 'px' }">
    <div
      class="left-area-isprev"
      :style="{ width: isPreview ? '50%' : '100%', marginRight: isPreview ? '10px' : '0px' }"
    >
      <div class="left-h3">
        <h3 class="editor-and-preview-title" id="title_h3_1">{{ t("editor.title") }}</h3>
      </div>
      <div class="edit-area" :style="{ height: divHeight + 'px' }">
        <div
          ref="editorRef"
          class="editor-div"
          id="editor"
          :title="t('editor.editorTooltip')"
        ></div>
      </div>
    </div>
    <div class="right-area-preview" v-if="isPreview">
      <div class="right-h3">
        <h3 class="editor-and-preview-title" id="title_h3_2">{{ previewTitle }}</h3>
      </div>
      <div
        class="preview-area"
        :class="{ 'slide-preview-host': documentMode === 'slides' }"
        id="result"
        ref="previewArea"
        :style="{ height: divHeight + 'px' }"
      >
        <iframe
          v-if="documentMode === 'slides'"
          class="slide-preview-frame"
          :srcdoc="previewFrameHtml"
          :title="t('editor.slidePreview')"
        ></iframe>
        <section v-else class="markdown-body" v-html="parsedHtml"></section>
      </div>
    </div>
  </div>

  <MarkdownTools
    v-show="isShowTools"
    :is-preview="isPreview"
    :is-height-screen="isHeightScreen"
    @insert="aceEditor.insertAtCursor"
    @enable-slides="changeDocumentMode('slides')"
  />

  <HelpModal :visible="showHelp" @close="showHelp = false" />

  <MessageModal :visible="isMessageModal" :message="messageText" @close="isMessageModal = false" />
</template>

<style scoped>
h3 {
  text-align: left;
  margin-bottom: 0;
}

.contents-area {
  display: flex;
}

.left-area-isprev {
  width: 50%;
  height: 100%;
}

.left-h3 {
  width: 100%;
}

h3#title_h3_1 {
  color: #f0f0f0;
  position: relative;
  padding-left: 25px;
  margin-bottom: 10px;
  border-bottom: 0;
  text-shadow: 2px 1px 2px rgb(165, 165, 165);
  margin: 10px 0 10px;
}

h3#title_h3_1:before {
  position: absolute;
  content: "";
  bottom: -1px;
  left: 0;
  width: 0;
  height: 0;
  border: none;
  border-left: solid 15px transparent;
  border-bottom: solid 15px rgb(17, 105, 86);
}

h3#title_h3_1:after {
  position: absolute;
  content: "";
  bottom: -3px;
  left: 0px;
  width: 100%;
  border-bottom: solid 3px rgb(17, 105, 86);
}

/* Aceエディタの上にモーダルを出した際の崩れを解消 */
.ace_editor {
  z-index: 0;
  height: 100%;
  isolation: isolate;
}

#editor {
  border: solid 1px rgb(184, 184, 184);
}

.editor-div {
  border-radius: 5px;
  border: solid 0.5px;
}

.editor-and-preview-title {
  font-size: 16px;
}

.right-h3 {
  width: 100%;
}

h3#title_h3_2 {
  color: #f0f0f0;
  position: relative;
  padding-left: 25px;
  margin-bottom: 2%;
  border-bottom: 0;
  text-shadow: 2px 1px 2px rgb(165, 165, 165);
  margin: 10px 0 10px;
}

h3#title_h3_2:before {
  position: absolute;
  content: "";
  bottom: -1px;
  left: 0;
  width: 0;
  height: 0;
  border: none;
  border-left: solid 15px transparent;
  border-bottom: solid 15px rgb(17, 105, 86);
}

h3#title_h3_2:after {
  position: absolute;
  content: "";
  bottom: -3px;
  left: 0px;
  width: 100%;
  border-bottom: solid 3px rgb(17, 105, 86);
}

.right-area-preview {
  width: 52%;
  height: 100%;
}

.preview-area {
  overflow-y: auto;
  border-radius: 5px;
  padding: 0 20px;
  background-color: #ffffff;
}

.slide-preview-host {
  padding: 0;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(234, 242, 250, 0.92)), #eff4f9;
}

.slide-preview-frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: #f4f7fb;
  border-radius: 5px;
}
</style>
