<script setup lang="ts">
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
</script>

<template>
  <div
    class="input-tools"
    :style="[
      isPreview ? { right: '54%' } : { right: '6%' },
      isHeightScreen ? { height: '60%' } : { height: '50%' },
    ]"
  >
    <button class="btn-input-tools" title="# を挿入&#10;一番大きい見出し" @click="insert('# ')">
      <img src="/format_h1_24.png" class="btn-input-tools-img" alt="format_h1_24.png" />
    </button>
    <button
      class="btn-input-tools"
      title="## を挿入&#10;二番目に大きい見出し"
      @click="insert('## ')"
    >
      <img src="/format_h2_24.png" class="btn-input-tools-img" alt="format_h2_24.png" />
    </button>
    <button
      class="btn-input-tools"
      title="### を挿入&#10;三番目に大きい見出し"
      @click="insert('### ')"
    >
      <img src="/format_h3_24.png" class="btn-input-tools-img" alt="format_h3_24.png" />
    </button>
    <button
      class="btn-input-tools"
      title="** を挿入&#10;文字を ** で囲むと太字で協調"
      @click="insert('**')"
    >
      <img src="/format_bold_24.png" class="btn-input-tools-img" alt="format_bold_24.png" />
    </button>
    <button class="btn-input-tools" title="- を挿入" @click="insert('- ')">
      <img
        src="/format_list_bulleted_24.png"
        class="btn-input-tools-img"
        alt="format_list_bulleted_24.png"
      />
    </button>
    <button class="btn-input-tools" title="1. を挿入" @click="insert('1. ')">
      <img
        src="/format_list_numbered_24.png"
        class="btn-input-tools-img"
        alt="format_list_numbered_24.png"
      />
    </button>
    <button class="btn-input-tools" title="|を挿入" @click="insert('|')">
      <img src="/table_24.png" class="btn-input-tools-img" alt="table_24.png" />
    </button>
    <button class="btn-input-tools" title="---を挿入" @click="insert('---')">
      <img src="/more_horiz_24.png" class="btn-input-tools-img" alt="more_horiz_24.png" />
    </button>
    <button class="btn-input-tools" title="~を挿入" @click="insert('~')">
      <img src="/strikethrough_24.png" class="btn-input-tools-img" alt="strikethrough_24.png" />
    </button>
    <button class="btn-input-tools" title="```を挿入" @click="insert('```')">
      <img src="/code_24.png" class="btn-input-tools-img" alt="code_24.png" />
    </button>
    <button class="btn-input-tools" title="`を挿入" @click="insert('`')">
      <img
        src="/ink_highlighter_24.png"
        class="btn-input-tools-img"
        alt="ink_highlighter_24.png"
      />
    </button>
    <button class="btn-input-tools" title=">を挿入" @click="insert('>')">
      <img src="/chat_24.png" class="btn-input-tools-img" alt="chat_24.png" />
    </button>
    <button class="btn-input-tools" title="[Title](URL)を挿入" @click="insert('[Title](URL)')">
      <img src="/link_24.png" class="btn-input-tools-img" alt="link_24.png" />
    </button>
    <button
      class="btn-input-tools"
      title=":::detailsを挿入"
      @click="insert(':::details タイトル\n非表示にする内容\n:::')"
    >
      <img src="/more_24.png" class="btn-input-tools-img" alt="more_24.png" />
    </button>
    <button
      class="btn-input-tools"
      title=":::noteを挿入"
      @click="insert(':::note タイトル\n内容\n:::')"
    >
      <img src="/info_24.png" class="btn-input-tools-img" alt="info_24.png" />
    </button>
    <button
      class="btn-input-tools"
      title=":::warningを挿入"
      @click="insert(':::warning タイトル\n内容\n:::')"
    >
      <img src="/warning_24.png" class="btn-input-tools-img" alt="warning_24.png" />
    </button>
    <button class="btn-input-tools" title="$$を挿入" @click="insert('$$\n数式\n$$')">
      <img src="/math24.png" class="btn-input-tools-img" alt="math24.png" />
    </button>
    <button class="btn-input-tools" title="@@@（改ページ）を挿入" @click="insert('@@@')">
      <img
        src="/keyboard_return_24.png"
        class="btn-input-tools-img"
        alt="keyboard_return_24.png"
      />
    </button>
    <button
      class="btn-input-tools"
      title="[](tel:+81)を挿入&#10;0 を省略した番号をハイフンなしで入力&#10;例）080-1234-5678 => +818012345678"
      @click="insert('[](tel:+81)')"
    >
      <img src="/tel_24.png" class="btn-input-tools-img" alt="tel_24.png" />
    </button>
    <button
      class="btn-input-tools"
      title="[](mailto:)を挿入&#10;mailto:maru@example.com のようにメールアドレスを入力"
      @click="insert('[](mailto:)')"
    >
      <img src="/mail_24.png" class="btn-input-tools-img" alt="mail_24.png" />
    </button>
  </div>
</template>
