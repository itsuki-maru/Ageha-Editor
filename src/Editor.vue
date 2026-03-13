<script setup lang="ts">
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

import { handleCopyButtonClick } from "@/utils/clipboard";
import { useLocalStorageStore } from "./stores/localStorages";
import { useRustArgsInitStore } from "./stores/appInits";
import { EDITOR_FOCUS_DELAY_MS, IMAGE_FILE_EXTENSIONS, TEXT_FILE_EXTENSIONS } from "./constants";

// このコンポーネントがアプリ本体であり、
// エディタ・プレビュー・保存・出力まわりの処理を組み合わせて画面を構成する。
// ---- Stores ----
const rustArgsStore = useRustArgsInitStore();
const localStorageItem = useLocalStorageStore();

// ---- UI 状態 ----
const isShowTools = ref<boolean | null>(null);
const isPreview = ref<boolean | null>(null);
const isVimMode = ref<boolean | null>(null);
const showHelp = ref(false);
const isMessageModal = ref(false);
const messageText = ref("");

function showMessage(message: string) {
  // どの処理からでも同じ手順でメッセージモーダルを開けるようにしている。
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
const slideCustomCss = computed(() => rustArgsStore.rustArgsData.slide_css_data);

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
});

// editorContent の変化を Ace エディタに反映
watch(editorContent, (newContent) => {
  // 変更差分の検知を更新する。
  trackChange(newContent);
  // 外部から本文が差し替わった場合でも Ace 側と表示内容がずれないようにする。
  aceEditor.setValue(newContent);
  // 最新の本文は起動引数ストアにも残し、再利用しやすくする。
  rustArgsStore.rustArgsData.text_data = newContent;
});

// ---- マークダウンプレビュー ----
const { parsedHtml, previewFrameHtml, documentMode, slideRender, drawMermaid, renderMermaidToSvg } =
  useMarkdownPreview(editorContent, activeFilePath, slideCustomCss);
const previewTitle = computed(() => (documentMode.value === "slides" ? "Slides" : "Preview"));
const isScrollSyncEnabled = computed(() => documentMode.value === "markdown");

// editorContent 変化時に Mermaid を再描画
watch(editorContent, () => {
  // Markdown モード時だけ drawMermaid 内で再描画される。
  drawMermaid();
});

// ---- エクスポート ----
const { printOut, exportHtml, openViewer } = useExport(
  editorContent,
  documentMode,
  parsedHtml,
  previewFrameHtml,
  slideRender,
  () => rustArgsStore.rustArgsData.css_data,
  () => rustArgsStore.rustArgsData.slide_css_data,
  renderMermaidToSvg,
  saveHtmlFile,
  showMessage,
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
  // 前回保存した UI 設定を最初に復元する。
  await localStorageItem.init();
  isShowTools.value = localStorageItem.isShowToolsFromLocalStorage;
  isPreview.value = localStorageItem.isPreviewFromLocalStorage;
  isVimMode.value = localStorageItem.isVimModeFromLocalStorage;
});

// ---- 起動時のファイル読み込み ----
onMounted(async () => {
  try {
    const textData = rustArgsStore.rustArgsData.text_data;
    const filePath = rustArgsStore.rustArgsData.file_abs_path;
    if (textData || filePath) {
      // 起動時に指定された文書があれば、その内容をそのまま編集対象として読み込む。
      loadContent(textData, filePath);
      editorContent.value = textData;
    }
    // 初期描画直後は Ace がまだ安定していないため、少し待ってからフォーカスする。
    setTimeout(() => aceEditor.focus(), EDITOR_FOCUS_DELAY_MS);
  } catch (error) {
    console.error("Failed to initialize editor with launch args:", error);
  }
});

// ---- コピーボタンのグローバルクリックハンドラ ----
onMounted(() => {
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains("copy-btn")) {
      // v-html 経由で描画されたコピー用ボタンもここで拾って処理する。
      handleCopyButtonClick(target);
    }
  });
});

// ---- ウィンドウクローズ時の確認 ----
onMounted(async () => {
  await getCurrentWindow().onCloseRequested(async (event) => {
    if (!(await confirmUnsaved())) {
      // ユーザーがキャンセルした場合はクローズ自体を止める。
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
      // テキスト系ファイルはそのまま開き直す扱いにする。
      loadContent(textData, dropFilePath);
      editorContent.value = textData;
      rustArgsStore.rustArgsData.text_data = textData;
      rustArgsStore.rustArgsData.file_abs_path = dropFilePath;
    }
  }

  if ((IMAGE_FILE_EXTENSIONS as readonly string[]).includes(extension)) {
    // 画像ファイルは本文へ Markdown 記法として挿入する。
    const replacePath = dropFilePath?.replace(/\\/g, "/");
    const fileName = getFileName(replacePath);
    aceEditor.insertAtCursor(`![${fileName}](${replacePath})`);
  }
});

// ---- トグルハンドラ ----
function handleInputTool() {
  // 画面状態と永続化ストアを同時に更新する。
  isShowTools.value = !isShowTools.value;
  localStorageItem.setMarkdownTools(isShowTools.value);
}

function handlePreview() {
  // プレビューの表示状態は次回起動時にも復元したいので保存しておく。
  isPreview.value = !isPreview.value;
  localStorageItem.setPreview(isPreview.value);
}

function handleVimMode() {
  // UI 状態と Ace のキーバインドを同じタイミングで切り替える。
  isVimMode.value = !isVimMode.value;
  localStorageItem.setVimMode(isVimMode.value);
  aceEditor.setVimMode(isVimMode.value!);
  showMessage(isVimMode.value ? "Vimモードをオンにしました" : "Vimモードをオフにしました");
}

// ---- 画像ファイル読み込み ----
async function readImage() {
  const imageFilePath = await selectFile("Image File", ["png", "jpg", "jpeg", "svg"]);
  if (!imageFilePath) return;
  // 選んだ画像は絶対パス付き Markdown 画像記法で挿入する。
  const fileName = getFileName(imageFilePath);
  aceEditor.insertAtCursor(`![${fileName}](${imageFilePath})`);
}

// ---- 新規インスタンス起動 ----
async function openNewInstance() {
  // 実行ファイル自身をもう一度起動して新しいウィンドウを開く。
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
  drawMermaid,
  toggleVimMode: handleVimMode,
  closeModals: () => {
    isMessageModal.value = false;
    showHelp.value = false;
  },
});
</script>

<template>
  <!-- 機能ボタン -->
  <ToolbarButtons
    :is-preview="isPreview"
    :document-mode="documentMode"
    @file-open="fileOpen"
    @file-save="fileSave"
    @read-image="readImage"
    @print-out="printOut"
    @export-html="exportHtml"
    @toggle-preview="handlePreview"
    @toggle-tools="handleInputTool"
    @open-viewer="openViewer"
    @new-instance="openNewInstance"
    @show-help="showHelp = true"
  />

  <!-- エディタとプレビュー -->
  <div class="contents-area" :style="{ height: divHeight + 'px' }">
    <!-- エディター -->
    <div
      class="left-area-isprev"
      :style="{ width: isPreview ? '50%' : '100%', marginRight: isPreview ? '10px' : '0px' }"
    >
      <div class="left-h3">
        <h3 class="editor-and-preview-title" id="title_h3_1">Editor</h3>
      </div>
      <div class="edit-area" :style="{ height: divHeight + 'px' }">
        <div
          ref="editorRef"
          class="editor-div"
          id="editor"
          title="作成したい文書をマークダウンで記述します。&#10;作成はリアルタイムで左側のプレビューエリアに反映されます。"
        ></div>
      </div>
    </div>
    <!-- プレビュー -->
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
          title="Slide preview"
        ></iframe>
        <section v-else class="markdown-body" v-html="parsedHtml"></section>
      </div>
    </div>
  </div>

  <!-- マークダウン入力支援ボタン -->
  <MarkdownTools
    v-show="isShowTools"
    :is-preview="isPreview"
    :is-height-screen="isHeightScreen"
    @insert="aceEditor.insertAtCursor"
  />

  <!-- ヘルプモーダル -->
  <HelpModal :visible="showHelp" @close="showHelp = false" />

  <!-- メッセージモーダル -->
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

/* 画面左側エリア */
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

/* 画面右側エリア */
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
    linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(234, 242, 250, 0.92)),
    #eff4f9;
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
