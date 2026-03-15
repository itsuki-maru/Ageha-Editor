<script setup lang="ts">
import type { DocumentMode } from "@/interface";

// ツールバーは見た目とイベント通知に専念させ、
// 実際の処理内容は Editor.vue 側でまとめて制御する構成にしている。
defineProps<{
  isPreview: boolean | null;
  isVimMode: boolean | null;
  documentMode: DocumentMode;
}>();

defineEmits<{
  "file-open": [];
  "file-save": [];
  "read-image": [];
  "print-out": [];
  "export-html": [];
  "toggle-preview": [];
  "toggle-tools": [];
  "open-viewer": [];
  "new-instance": [];
  "show-help": [];
  "toggle-vim-mode": [];
}>();
</script>

<template>
  <div class="top-right-zone">
    <button
      class="btn-head-text"
      :class="{ 'btn-vim-active': isVimMode }"
      title="Vimモード切り替え&#10;ショートカット: Ctrl + ,"
      @click="$emit('toggle-vim-mode')"
    >
      Vim
    </button>
    <span class="mode-badge" :class="`mode-${documentMode}`">
      {{ documentMode === "slides" ? "Slides" : "Markdown" }}
    </span>
  </div>
  <div id="btn-head-zone">
    <div id="btn-head-left">
      <button
        class="btn-head-image"
        title="ファイルを開く&#10;ショートカット: Ctrl + o"
        @click="$emit('file-open')"
      >
        <img src="/file_open_24.png" class="btn-img" alt="file_open_24.png" />
      </button>
      <button
        class="btn-head-image"
        title="保存&#10;ショートカット: Ctrl + s"
        @click="$emit('file-save')"
      >
        <img src="/file_save_24.png" class="btn-img" alt="file_save_24.png" />
      </button>
      <button
        class="btn-head-image"
        title="画像読み込み&#10;ショートカット: Ctrl + r"
        @click="$emit('read-image')"
      >
        <img src="/smartphone_line24.png" class="btn-img" alt="smartphone_line24.png" />
      </button>
      <button
        class="btn-head-image"
        title="出力（PDFまたは紙）&#10;ショートカット: Ctrl + Alt + p"
        @click="$emit('print-out')"
      >
        <img src="/print_24.png" class="btn-img" alt="print_24.png" />
      </button>
      <button
        class="btn-head-image"
        title="HTML出力&#10;ショートカット: Ctrl + Alt + f"
        @click="$emit('export-html')"
      >
        <img src="/html_24.png" class="btn-img" alt="html_24.png" />
      </button>
      <button
        v-if="isPreview"
        class="btn-head-image"
        title="プレビュー切り替え&#10;ショートカット: Ctrl + Alt + /"
        @click="$emit('toggle-preview')"
      >
        <img src="/preview_off_24.png" class="btn-img" alt="preview_off_24.png" />
      </button>
      <button
        v-else
        class="btn-head-image"
        title="プレビュー切り替え&#10;ショートカット: Ctrl + Alt + /"
        @click="$emit('toggle-preview')"
      >
        <img src="/preview_on_24.png" class="btn-img" alt="preview_on_24.png" />
      </button>
      <button
        class="btn-head-image"
        title="マークダウン入力ツール&#10;ショートカット: Ctrl + Alt + i"
        @click="$emit('toggle-tools')"
      >
        <img src="/markdown_24.png" class="btn-img" alt="markdown_24.png" />
      </button>
      <button
        class="btn-head-image"
        title="別ウィンドウ&#10;ショートカット: Ctrl + Alt + w"
        @click="$emit('open-viewer')"
      >
        <img src="/new_window_fill24.png" class="btn-img" alt="new_window_fill24.png" />
      </button>
    </div>
    <div id="btn-head-right">
      <button
        class="btn-head-image"
        title="新しいエディターを起動&#10;ショートカット: Ctrl + Alt + n"
        @click="$emit('new-instance')"
      >
        <img src="/new_editor_24.png" class="btn-img" alt="new_editor_24.png" />
      </button>
      <button
        class="btn-head-image"
        title="書き方のヘルプを表示&#10;ショートカット: Ctrl + Alt + h"
        @click="$emit('show-help')"
      >
        <img src="/help_24.png" class="btn-img" alt="help_24.png" />
      </button>
    </div>
  </div>
</template>

<style scoped>
#btn-head-zone {
  display: flex;
  justify-content: space-between;
}

#btn-head-left {
  display: flex;
  align-items: center;
}

.top-right-zone {
  position: fixed;
  top: 12px;
  right: 14px;
  z-index: 30;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-right: 10px;
}

.mode-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 94px;
  height: 36px;
  padding: 0 4px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 5px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.btn-head-text {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  padding: 0 8px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 5px;
  background: transparent;
  color: #c0c0c0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
}

.btn-head-text:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.45);
}

.btn-vim-active {
  background: linear-gradient(135deg, #116956, #2c8f77);
  color: #ffffff;
  border-color: #2c8f77;
}

.btn-vim-active:hover {
  background: linear-gradient(135deg, #0e5a49, #247a65);
  color: #ffffff;
}

.mode-markdown {
  color: #114f69;
  background: linear-gradient(135deg, #e7f4ff, #d8eaf7);
}

.mode-slides {
  color: #f5fffb;
  background: linear-gradient(135deg, #116956, #2c8f77);
}
</style>
