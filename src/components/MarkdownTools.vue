<script setup lang="ts">
import { useI18n } from "@/i18n";

// よく使う Markdown 記法をワンクリックで挿入するための補助パネル。
// 実際の文字列挿入は親コンポーネント側の Ace エディタへ委譲する。
defineProps<{
  isPreview: boolean | null;
  isHeightScreen: boolean;
}>();

const emit = defineEmits<{
  insert: [text: string];
}>();

function insert(text: string) {
  emit("insert", text);
}

const { t } = useI18n();
</script>

<template>
  <div
    class="input-tools"
    :style="[
      isPreview ? { right: '54%' } : { right: '6%' },
      isHeightScreen ? { height: '60%' } : { height: '50%' },
    ]"
  >
    <button class="btn-input-tools" :title="t('tools.h1')" @click="insert('# ')">
      <img src="/format_h1_24.png" class="btn-input-tools-img" alt="format_h1_24.png" />
    </button>
    <button class="btn-input-tools" :title="t('tools.h2')" @click="insert('## ')">
      <img src="/format_h2_24.png" class="btn-input-tools-img" alt="format_h2_24.png" />
    </button>
    <button class="btn-input-tools" :title="t('tools.h3')" @click="insert('### ')">
      <img src="/format_h3_24.png" class="btn-input-tools-img" alt="format_h3_24.png" />
    </button>
    <button class="btn-input-tools" :title="t('tools.bold')" @click="insert('**')">
      <img src="/format_bold_24.png" class="btn-input-tools-img" alt="format_bold_24.png" />
    </button>
    <button class="btn-input-tools" :title="t('tools.bulletList')" @click="insert('- ')">
      <img
        src="/format_list_bulleted_24.png"
        class="btn-input-tools-img"
        alt="format_list_bulleted_24.png"
      />
    </button>
    <button class="btn-input-tools" :title="t('tools.numberList')" @click="insert('1. ')">
      <img
        src="/format_list_numbered_24.png"
        class="btn-input-tools-img"
        alt="format_list_numbered_24.png"
      />
    </button>
    <button class="btn-input-tools" :title="t('tools.table')" @click="insert('|')">
      <img src="/table_24.png" class="btn-input-tools-img" alt="table_24.png" />
    </button>
    <button class="btn-input-tools" :title="t('tools.horizontalRule')" @click="insert('---')">
      <img src="/more_horiz_24.png" class="btn-input-tools-img" alt="more_horiz_24.png" />
    </button>
    <button class="btn-input-tools" :title="t('tools.strike')" @click="insert('~')">
      <img src="/strikethrough_24.png" class="btn-input-tools-img" alt="strikethrough_24.png" />
    </button>
    <button class="btn-input-tools" :title="t('tools.codeBlock')" @click="insert('```')">
      <img src="/code_24.png" class="btn-input-tools-img" alt="code_24.png" />
    </button>
    <button class="btn-input-tools" :title="t('tools.inlineCode')" @click="insert('`')">
      <img src="/ink_highlighter_24.png" class="btn-input-tools-img" alt="ink_highlighter_24.png" />
    </button>
    <button class="btn-input-tools" :title="t('tools.quote')" @click="insert('>')">
      <img src="/chat_24.png" class="btn-input-tools-img" alt="chat_24.png" />
    </button>
    <button
      class="btn-input-tools"
      :title="t('tools.link')"
      @click="insert(t('tools.linkTemplate'))"
    >
      <img src="/link_24.png" class="btn-input-tools-img" alt="link_24.png" />
    </button>
    <button
      class="btn-input-tools"
      :title="t('tools.details')"
      @click="insert(t('tools.detailsTemplate'))"
    >
      <img src="/more_24.png" class="btn-input-tools-img" alt="more_24.png" />
    </button>
    <button
      class="btn-input-tools"
      :title="t('tools.note')"
      @click="insert(t('tools.noteTemplate'))"
    >
      <img src="/info_24.png" class="btn-input-tools-img" alt="info_24.png" />
    </button>
    <button
      class="btn-input-tools"
      :title="t('tools.warning')"
      @click="insert(t('tools.warningTemplate'))"
    >
      <img src="/warning_24.png" class="btn-input-tools-img" alt="warning_24.png" />
    </button>
    <button
      class="btn-input-tools"
      :title="t('tools.math')"
      @click="insert(t('tools.mathTemplate'))"
    >
      <img src="/math24.png" class="btn-input-tools-img" alt="math24.png" />
    </button>
    <button class="btn-input-tools" :title="t('tools.pageBreak')" @click="insert('@@@')">
      <img src="/keyboard_return_24.png" class="btn-input-tools-img" alt="keyboard_return_24.png" />
    </button>
    <button class="btn-input-tools" :title="t('tools.tel')" @click="insert('[](tel:+81)')">
      <img src="/tel_24.png" class="btn-input-tools-img" alt="tel_24.png" />
    </button>
    <button class="btn-input-tools" :title="t('tools.mail')" @click="insert('[](mailto:)')">
      <img src="/mail_24.png" class="btn-input-tools-img" alt="mail_24.png" />
    </button>
    <button
      class="btn-input-tools"
      :title="t('tools.slides')"
      @click="insert(t('tools.slideTemplate'))"
    >
      <img
        src="/wallpaper_slideshow_24.png"
        class="btn-input-tools-img"
        alt="wallpaper_slideshow_24.png"
      />
    </button>
  </div>
</template>
