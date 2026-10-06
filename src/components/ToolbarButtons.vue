<script setup lang="ts">
import { STYLE_PACK_IDS, type StylePackId } from "@/utils/stylePacks";
import type { DocumentMode } from "@/interface";
import { useI18n } from "@/i18n";

defineProps<{
  isPreview: boolean | null;
  isScrollSync: boolean | null;
  isVimMode: boolean | null;
  documentMode: DocumentMode;
  stylePack: StylePackId;
  isExportingPdf?: boolean;
}>();

defineEmits<{
  "change-style-pack": [id: string];
  "file-open": [];
  "file-save": [];
  "read-image": [];
  "print-out": [];
  "export-html": [];
  "export-pdf": [];
  "toggle-preview": [];
  "toggle-scroll-sync": [];
  "toggle-tools": [];
  "open-viewer": [];
  "open-slideshow": [];
  "new-instance": [];
  "show-help": [];
  "toggle-vim-mode": [];
  "toggle-locale": [];
  "toggle-document-mode": [];
}>();

const { t, languageLabel } = useI18n();
// Direct PDF rendering currently uses the Windows WebView2 API.
const supportsPdfExport = navigator.userAgent.includes("Windows");
</script>

<template>
  <div class="top-right-zone">
    <label class="style-picker">
      <select
        :value="stylePack"
        :aria-label="t('styles.label')"
        :title="t('styles.hint')"
        @change="$emit('change-style-pack', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="id in STYLE_PACK_IDS" :key="id" :value="id">
          {{ t("styles." + id) }}
        </option>
      </select>
    </label>
    <button
      type="button"
      class="mode-badge"
      :class="`mode-${documentMode}`"
      :title="t(documentMode === 'slides' ? 'toolbar.switchToMarkdown' : 'toolbar.switchToSlides')"
      :aria-label="
        t(documentMode === 'slides' ? 'toolbar.switchToMarkdown' : 'toolbar.switchToSlides')
      "
      @click="$emit('toggle-document-mode')"
    >
      {{ documentMode === "slides" ? t("toolbar.slidesMode") : t("toolbar.markdownMode") }}
    </button>
  </div>
  <div id="btn-head-zone">
    <div id="btn-head-left">
      <button class="btn-head-image" :title="t('toolbar.openFile')" @click="$emit('file-open')">
        <img src="/file_open_24.png" class="btn-img" alt="file_open_24.png" />
      </button>
      <button class="btn-head-image" :title="t('toolbar.saveFile')" @click="$emit('file-save')">
        <img src="/file_save_24.png" class="btn-img" alt="file_save_24.png" />
      </button>
      <button class="btn-head-image" :title="t('toolbar.readImage')" @click="$emit('read-image')">
        <img src="/smartphone_line24.png" class="btn-img" alt="smartphone_line24.png" />
      </button>
      <button
        class="btn-head-image"
        :title="
          t(
            documentMode === 'slides' && supportsPdfExport
              ? 'toolbar.printSlides'
              : 'toolbar.printOut',
          )
        "
        @click="$emit('print-out')"
      >
        <img src="/print_24.png" class="btn-img" alt="print_24.png" />
      </button>
      <button class="btn-head-image" :title="t('toolbar.exportHtml')" @click="$emit('export-html')">
        <img src="/html_24.png" class="btn-img" alt="html_24.png" />
      </button>
      <button
        v-if="documentMode === 'slides' && supportsPdfExport"
        class="btn-head-image"
        :disabled="isExportingPdf"
        :aria-busy="isExportingPdf"
        :aria-label="t(isExportingPdf ? 'export.pdfSaving' : 'toolbar.exportPdf')"
        :title="t(isExportingPdf ? 'export.pdfSaving' : 'toolbar.exportPdf')"
        @click="$emit('export-pdf')"
      >
        <img src="/picture_as_pdf_24.png" class="btn-img" alt="" />
      </button>
      <button
        v-if="isPreview"
        class="btn-head-image"
        :title="t('toolbar.togglePreview')"
        @click="$emit('toggle-preview')"
      >
        <img src="/preview_off_24.png" class="btn-img" alt="preview_off_24.png" />
      </button>
      <button
        v-else
        class="btn-head-image"
        :title="t('toolbar.togglePreview')"
        @click="$emit('toggle-preview')"
      >
        <img src="/preview_on_24.png" class="btn-img" alt="preview_on_24.png" />
      </button>
      <button
        class="btn-head-image"
        :title="t('toolbar.toggleTools')"
        @click="$emit('toggle-tools')"
      >
        <img src="/markdown_24.png" class="btn-img" alt="markdown_24.png" />
      </button>
      <button class="btn-head-image" :title="t('toolbar.openViewer')" @click="$emit('open-viewer')">
        <img src="/new_window_fill24.png" class="btn-img" alt="new_window_fill24.png" />
      </button>
      <button
        v-if="documentMode === 'slides'"
        class="btn-head-image"
        :title="t('toolbar.openSlideshow')"
        @click="$emit('open-slideshow')"
      >
        <img src="/slideshow_24.png" class="btn-img" alt="slideshow_24.png" />
      </button>
      <button
        class="btn-head-image btn-toggle-text"
        :class="{ 'btn-vim-active': isVimMode }"
        :title="t('toolbar.toggleVim')"
        @click="$emit('toggle-vim-mode')"
      >
        Vim
      </button>
      <button
        class="btn-head-image btn-toggle-text"
        :class="{ 'btn-toggle-active': isScrollSync && documentMode === 'markdown' }"
        :title="t('toolbar.toggleScrollSync')"
        @click="$emit('toggle-scroll-sync')"
      >
        Sync
      </button>
    </div>
    <div id="btn-head-right">
      <button
        class="btn-head-text"
        :title="t('app.languageSwitch')"
        @click="$emit('toggle-locale')"
      >
        {{ languageLabel }}
      </button>
      <button class="btn-head-image" :title="t('toolbar.newWindow')" @click="$emit('new-instance')">
        <img src="/new_editor_24.png" class="btn-img" alt="new_editor_24.png" />
      </button>
      <button class="btn-head-image" :title="t('toolbar.help')" @click="$emit('show-help')">
        <img src="/help_24.png" class="btn-img" alt="help_24.png" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.style-picker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  white-space: nowrap;
  font-size: 12px;
  color: #f0f0f0;
}
.style-picker select {
  font: inherit;
  box-sizing: border-box;
  height: 26px;
  padding: 0 8px;
  border: 1px solid #b8c4bf;
  border-radius: 5px;
  background: white;
  color: #253044;
  text-align: center;
}
.style-picker select:focus-visible {
  outline: 2px solid #116956;
  outline-offset: 2px;
  text-align: left;
}
#btn-head-zone,
#btn-head-left,
#btn-head-right {
  flex-wrap: wrap;
}

#btn-head-zone {
  display: flex;
  justify-content: space-between;
}

#btn-head-left {
  display: flex;
  align-items: center;
}

#btn-head-right {
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
  cursor: pointer;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 94px;
  height: 26px;
  padding: 0 4px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 5px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.mode-badge:hover {
  filter: brightness(1.08);
}

.mode-badge:focus-visible {
  outline: 2px solid #116956;
  outline-offset: 3px;
}

.btn-head-text {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 30px;
  padding: 3px 8px;
  margin-top: 3px;
  margin-right: 10px;
  margin-bottom: 3px;
  margin-left: 5px;
  border: 1px solid transparent;
  border-radius: 15px;
  background: white;
  box-shadow: 3px 3px 5px 0 rgba(75, 75, 75, 0.5);
  color: #2f2f2f;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    background-color 0.3s,
    color 0.15s,
    border-color 0.15s;
}

.btn-head-text:hover {
  background: rgb(192, 192, 192);
  color: #1f1f1f;
}

.btn-toggle-text {
  color: black;
  font-weight: bold;
  font-size: 0.72rem;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
}

.btn-toggle-active {
  background: linear-gradient(135deg, #116956, #2c8f77);
  color: #ffffff;
  border-color: #2c8f77;
}

.btn-toggle-active:hover {
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

.btn-toggle-vim {
  min-width: 44px;
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
</style>
