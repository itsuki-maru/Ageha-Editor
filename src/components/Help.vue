<script setup lang="ts">
import { onMounted, nextTick, computed, watch } from "vue";
import Prism from "prismjs";
import "prismjs/themes/prism-okaidia.css";
import { copyElementText } from "@/utils/clipboard";
import { useI18n } from "@/i18n";

const { t, locale } = useI18n();

const markdownTitleSample = computed(() =>
  locale.value === "ja"
    ? "# マークダウンによる文書資料の作成"
    : "# Creating documents with Markdown",
);

const markdownBodySample = computed(() =>
  locale.value === "ja"
    ? `## 1. マークダウンとは何か?

「**マークダウン**」は、記号と組み合わせることで文書を整形する方法のことです。

- ハッシュ記号 \`#\` を文頭に置くと、それは「**見出し**」になります。
- アスタリスク \`*\` を使うと「**文章を強調（太字）**」、ハイフン \`-\` を使うと「**リスト項目**」を作れます。

## 2. なぜ使うのか？

- **統一性**: 誰が書いても見た目を揃えやすい
- **シンプル**: 書式より内容に集中しやすい

| 項目 | マークダウン | Word |
| ---- | ------------ | ---- |
| 学習コスト | 低い | 高い |
| 書式 | 自動で揃えやすい | 手動で調整する |`
    : `## 1. What is Markdown?

Markdown is a simple way to format text with symbols.

- Put \`#\` at the start of a line to create a **heading**.
- Use asterisks like \`**text**\` for **bold text**.
- Use hyphens like \`-\` to create list items.

## 2. Why use it?

- **Consistency**: documents are easier to keep uniform
- **Simplicity**: you can focus on content instead of formatting

| Item | Markdown | Word |
| ---- | -------- | ---- |
| Learning cost | Low | High |
| Formatting | Easier to standardize | Often manual |`,
);

const slideSample = computed(() =>
  locale.value === "ja"
    ? `---
marp: true
---

# Ageha Slide

- VSCode の Marp に近い記法で作成
- Mermaid と数式にも対応

---

## 2枚目のスライド

\`\`\`mermaid
graph LR
  Plan --> Build --> Present
\`\`\`

$$E = mc^2$$`
    : `---
marp: true
---

# Ageha Slide

- Author slides with a Marp-like syntax
- Supports Mermaid and math

---

## Second slide

\`\`\`mermaid
graph LR
  Plan --> Build --> Present
\`\`\`

$$E = mc^2$$`,
);

const headingSample = computed(() =>
  locale.value === "ja"
    ? `# 見出し1

## 見出し2

### 見出し3`
    : `# Heading 1

## Heading 2

### Heading 3`,
);

const listSample = computed(() =>
  locale.value === "ja"
    ? `- 議題
    - 会議室の使用方法について
    - 車の駐車について

- その他
    - 休暇のとり方`
    : `- Agenda
    - How to use meeting rooms
    - Parking rules

- Other topics
    - How to request leave`,
);

const tableSample = computed(() =>
  locale.value === "ja"
    ? `| 施設名   | 住所         | 備考 |
| -------- | ------------ | ---- |
| 保養施設 | 東京都品川区 | なし |
| 社員食堂 | 東京都港区   | なし |`
    : `| Facility | Address | Notes |
| -------- | ------- | ----- |
| Retreat center | Shinagawa, Tokyo | None |
| Cafeteria | Minato, Tokyo | None |`,
);

const inlineCodeSample = computed(() => (locale.value === "ja" ? "`○×商事`" : "`Example Corp.`"));

const highlight = async () => {
  await nextTick();
  Prism.highlightAll();
};

onMounted(highlight);
watch(locale, highlight);

function copyClipBoard(codeId: string) {
  const element = document.getElementById(codeId);
  if (!element) return;
  copyElementText(element);
}
</script>

<template>
  <h1 id="sample-markdown" style="margin-top: 3%">{{ t("help.title") }}</h1>
  <p>{{ t("help.intro") }}</p>

  <h2 id="slide-sample" style="margin-top: 4%">{{ t("help.slidesTitle") }}</h2>
  <p>{{ t("help.slidesIntro") }}</p>
  <p>{{ t("help.slidesCss") }}</p>

  <div class="code-container" style="position: relative">
    <button
      class="copy-btn"
      data-target="help-slide"
      style="position: absolute; top: 5px; right: 5px; z-index: 1"
      @click="copyClipBoard('help-slide')"
    >
      {{ t("common.copy") }}
    </button>
    <pre><code id="help-slide" class="language-markdown">{{ slideSample }}</code></pre>
  </div>

  <div class="code-container" style="position: relative">
    <button
      class="copy-btn"
      data-target="help-title"
      style="position: absolute; top: 5px; right: 5px; z-index: 1"
      @click="copyClipBoard('help-title')"
    >
      {{ t("common.copy") }}
    </button>
    <pre><code id="help-title" class="language-markdown">{{ markdownTitleSample }}</code></pre>
  </div>

  <p>{{ t("help.bodyLead") }}</p>

  <div class="code-container" style="position: relative">
    <button
      class="copy-btn"
      data-target="help-body"
      style="position: absolute; top: 5px; right: 5px; z-index: 1"
      @click="copyClipBoard('help-body')"
    >
      {{ t("common.copy") }}
    </button>
    <pre><code id="help-body" class="language-markdown">{{ markdownBodySample }}</code></pre>
  </div>

  <h1 id="guide" style="margin-top: 5%">{{ t("help.guideTitle") }}</h1>
  <p>{{ t("help.guideIntro") }}</p>

  <h2 id="headings">{{ t("help.headingTitle") }}</h2>
  <p>{{ t("help.headingBody") }}</p>
  <div class="code-container" style="position: relative">
    <button
      class="copy-btn"
      data-target="help-heading"
      style="position: absolute; top: 5px; right: 5px; z-index: 1"
      @click="copyClipBoard('help-heading')"
    >
      {{ t("common.copy") }}
    </button>
    <pre><code id="help-heading" class="language-markdown">{{ headingSample }}</code></pre>
  </div>

  <h2 id="bold">{{ t("help.boldTitle") }}</h2>
  <p>{{ t("help.boldBody") }}</p>
  <div class="code-container" style="position: relative">
    <button
      class="copy-btn"
      data-target="help-bold"
      style="position: absolute; top: 5px; right: 5px; z-index: 1"
      @click="copyClipBoard('help-bold')"
    >
      {{ t("common.copy") }}
    </button>
    <pre><code id="help-bold" class="language-markdown">This place is **very dangerous**.</code></pre>
  </div>

  <h2 id="bullets">{{ t("help.bulletTitle") }}</h2>
  <p>{{ t("help.bulletBody") }}</p>
  <div class="code-container" style="position: relative">
    <button
      class="copy-btn"
      data-target="help-list"
      style="position: absolute; top: 5px; right: 5px; z-index: 1"
      @click="copyClipBoard('help-list')"
    >
      {{ t("common.copy") }}
    </button>
    <pre><code id="help-list" class="language-markdown">{{ listSample }}</code></pre>
  </div>

  <h2 id="numbers">{{ t("help.numberTitle") }}</h2>
  <p>{{ t("help.numberBody") }}</p>

  <h2 id="tables">{{ t("help.tableTitle") }}</h2>
  <p>{{ t("help.tableBody") }}</p>
  <div class="code-container" style="position: relative">
    <button
      class="copy-btn"
      data-target="help-table"
      style="position: absolute; top: 5px; right: 5px; z-index: 1"
      @click="copyClipBoard('help-table')"
    >
      {{ t("common.copy") }}
    </button>
    <pre><code id="help-table" class="language-markdown">{{ tableSample }}</code></pre>
  </div>

  <h2 id="inline-code">{{ t("help.codeTitle") }}</h2>
  <p>{{ t("help.codeBody") }}</p>
  <div class="code-container" style="position: relative">
    <button
      class="copy-btn"
      data-target="help-inline-code"
      style="position: absolute; top: 5px; right: 5px; z-index: 1"
      @click="copyClipBoard('help-inline-code')"
    >
      {{ t("common.copy") }}
    </button>
    <pre><code id="help-inline-code" class="language-markdown">{{ inlineCodeSample }}</code></pre>
  </div>
</template>

<style scoped></style>
