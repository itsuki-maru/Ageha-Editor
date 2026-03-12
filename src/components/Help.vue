<script setup lang="ts">
import { onMounted, nextTick } from "vue";
import Prism from "prismjs";
import "prismjs/themes/prism-okaidia.css";

const highlight = async () => {
  await nextTick();
  Prism.highlightAll();
};

onMounted(highlight);

// codeタグのコピー機能
function copyClipBoard(codeId: string) {
  let element = document.getElementById(codeId);
  if (!element || !element.textContent) return;

  navigator.clipboard.writeText(element.textContent);

  // すでにメッセージがあれば削除
  const existingTooltip = element.parentElement?.querySelector(".copy-tooltip");
  if (existingTooltip) existingTooltip.remove();

  // メッセージを作成
  const tooltip = document.createElement("div");
  tooltip.textContent = "コピーしました";
  tooltip.className = "copy-tooltip";

  // ボタンの親要素（code-container）に追加
  element.parentElement?.appendChild(tooltip);

  // 一定時間後に非表示
  setTimeout(() => {
    tooltip.style.opacity = "0";
    setTimeout(() => tooltip.remove(), 300);
  }, 1000);
}
</script>

<template>
  <h1 id="sample-markdown" style="margin-top: 3%">マークダウン文書を作成</h1>
  <p>
    「<strong>マークダウン</strong>」は特定の記号と組み合わせることで文書を整形する手法であり、<strong>Wikipedia</strong>などで使用されているこの形式は、インターネットやイントラネット上で共有・公開される文書の作成に適しています。まずはマークダウン文書をコピー＆ペーストで簡単に作成してみましょう。
  </p>

  <div class="code-container" style="position: relative">
    <button
      class="copy-btn"
      data-target="help-title"
      style="position: absolute; top: 5px; right: 5px; z-index: 1"
      v-on:click="copyClipBoard('help-title')"
    >
      コピー
    </button>
    <pre><code id="help-title" class="language-markdown"># マークダウンによる文書資料の作成</code></pre>
  </div>

  <p>
    今度は次のテキストをコピーして編集エディタに貼り付けてみましょう。先に入力したタイトルと組み合わせてプレビューが現れます。
  </p>

  <div class="code-container" style="position: relative">
    <button
      class="copy-btn"
      data-target="help-what-markdown"
      style="position: absolute; top: 5px; right: 5px; z-index: 1"
      v-on:click="copyClipBoard('help-what-markdown')"
    >
      コピー
    </button>
    <pre><code id="help-what-markdown" class="language-markdown">## 1. マークダウンとは何か?

「**マークダウン**」は、記号と組み合わせることで文書を整形する方法のことです。

- ハッシュ記号 `#` を文頭に置くと、それは「**見出し**」になります。
- asterisk `*` を使うと「**文章を強調（太字）**」、ハイフン `-` を使うと「**リスト項目**」を作ることができます。

これは一部の例で、他にもさまざまな整形方法があります。

## 2. なぜマークダウンを使用するのか？

### Microsoft Word

「**Word**」のような文書作成ソフトは、さまざまな整形やレイアウトを行うことができます。

しかし、これらの機能は非常に複雑で、学習コストが大きいものです。このため次のような問題をしばし引き起こします。

- **統一性**:
    - 文書を作成する人によって、レイアウトや書式がバラバラになる問題が発生します。

- **複雑な書式や機能**:
    - Microsoft Officeソフトは機能が豊富ですが、バージョンによって使い方や表示が異なります。
    - ユーザーは「**行頭 揃え方**」や「**均等割り付け うまくいかない**」とGoogleで検索をするでしょう。
    - 結果、書式設定に囚われ「**文章の内容よりも見た目**」に労力を割いてしまうという現象が発生します。

### マークダウン

一方、マークダウンは「**シンプルさが魅力**」です。

基本的な機能は数分で学ぶことができ、基本的な記号だけで「**見栄えの良い文書を作成する**」ことができます。


- **統一性**:
    - 予め決められた書式に自動で変換されるため「**誰が書いても同じ見栄え**」になります。

- **複雑な書式や機能**:
    - 複雑な機能がないため「**文章の内容を考える**」ことに集中できます。


| 項目           | マークダウン | Microsoft Word |
| -------------- | ------------ | -------------- |
| **機能**       | シンプル     | 多機能         |
| **学習コスト** | 低い         | 学ぶことが多い |
| **書式**       | 自動で設定   | ユーザーが設定 |

上記のような違いから「**複雑・高度な書式を求められる文書（通知、様式、広報誌）**」はMicrosoft Wordを選択するところです。

しかし、大半の文書はそれ以外です。新たな選択肢として「**マークダウン**」は業務に大いに役立つと考えられます。</code></pre>
  </div>

  <h1 id="書き方" style="margin-top: 5%">解説</h1>
  <p>
    マークダウンは記号を使ってスタイルを整える文書作成の技術です。この先はそれぞれの記号がどのような意味を持つか解説します。
  </p>

  <h2 id="見出しの書き方">見出しの書き方</h2>
  <p>
    見出しは<code>#(シャープ)</code>を使います。シャープの数で見出しの大きさ（レベル）を変えることができます。また、<code>#</code>の次は必ず<strong>半角スペース</strong>を入れます。
  </p>

  <div class="code-container" style="position: relative">
    <button
      class="copy-btn"
      data-target="help-header"
      style="position: absolute; top: 5px; right: 5px; z-index: 1"
      v-on:click="copyClipBoard('help-header')"
    >
      コピー
    </button>
    <pre><code id="help-header" class="language-markdown"># 見出し1

## 見出し2

### 見出し3

#### 見出し4

##### 見出し5

###### 見出し6</code></pre>
  </div>

  <h2 id="文字の強調">文字の強調</h2>
  <p><strong>文字を強調したい場合</strong>は強調したい文字を<code>**</code>で囲みます。</p>

  <div class="code-container" style="position: relative">
    <button
      class="copy-btn"
      data-target="help-bold"
      style="position: absolute; top: 5px; right: 5px; z-index: 1"
      v-on:click="copyClipBoard('help-bold')"
    >
      コピー
    </button>
    <pre><code id="help-bold" class="language-markdown">この場所は**非常に危険**です。</code></pre>
  </div>

  <p>この場所は<strong>非常に危険</strong>です。</p>

  <h2 id="箇条書き（点）">箇条書き（点）</h2>
  <p>
    箇条書きは<code>-(ハイフン)</code>を使い、<code>-</code>の後には<strong>半角スペース</strong>を必ず入れます。また、入れ子の見出しを作る場合は<strong>半角スペースを4つ</strong>入れ子にしたい箇条書きの次に入れます。具体例を見ていきましょう。
  </p>

  <div class="code-container" style="position: relative">
    <button
      class="copy-btn"
      data-target="help-list"
      style="position: absolute; top: 5px; right: 5px; z-index: 1"
      v-on:click="copyClipBoard('help-list')"
    >
      コピー
    </button>
    <pre><code id="help-list" class="language-markdown">- 議題
    - 会議室の使用方法について
    - 車の駐車について
    - 大掃除について

- その他
    - 休暇のとり方</code></pre>
  </div>

  <ul>
    <li>
      議題
      <ul>
        <li>会議室の使用方法について</li>
        <li>車の駐車について</li>
        <li>大掃除について</li>
      </ul>
    </li>
    <li>
      その他
      <ul>
        <li>休暇のとり方</li>
      </ul>
    </li>
  </ul>

  <h2 id="箇条書き（数字）">箇条書き（数字）</h2>
  <p>
    数字の箇条書きは<code>1.</code>のように記述します。<code>1.</code>の後には<strong>半角スペース</strong>を必ず入れます。また、入れ子の見出しを作る場合は点の箇条書きと同様に<strong>半角スペースを4つ</strong>入れ子にしたい箇条書きの次に入れます。具体例を見ていきましょう。
  </p>

  <div class="code-container" style="position: relative">
    <button
      class="copy-btn"
      data-target="help-number-list"
      style="position: absolute; top: 5px; right: 5px; z-index: 1"
      v-on:click="copyClipBoard('help-number-list')"
    >
      コピー
    </button>
    <pre><code id="help-number-list" class="language-markdown">1. 議題
    1. 会議室の使用方法について
    2. 車の駐車について
    3. 大掃除について
2. その他
    - 休暇のとり方</code></pre>
  </div>

  <ol>
    <li>
      議題
      <ol>
        <li>会議室の使用方法について</li>
        <li>車の駐車について</li>
        <li>大掃除について</li>
      </ol>
    </li>
    <li>
      その他
      <ul>
        <li>休暇のとり方</li>
      </ul>
    </li>
  </ol>

  <h2 id="表の作り方">表の作り方</h2>
  <p>
    表は<code>|</code>の記号を使用して作ります。また<strong>タイトル行と内容の区切り</strong>は<code
      >| --- | --- | --- |</code
    >のように記述します。次の表は3×3の表の作成例です。
  </p>

  <div class="code-container" style="position: relative">
    <button
      class="copy-btn"
      data-target="help-table"
      style="position: absolute; top: 5px; right: 5px; z-index: 1"
      v-on:click="copyClipBoard('help-table')"
    >
      コピー
    </button>
    <pre><code id="help-table" class="language-markdown">| 施設名   | 住所         | 備考 |
| -------- | ------------ | ---- |
| 保養施設 | 東京都品川区 | なし |
| 社員食堂 | 東京都港区   | なし |</code></pre>
  </div>

  <table>
    <thead>
      <tr>
        <th>施設名</th>
        <th>住所</th>
        <th>備考</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>保養施設</td>
        <td>東京都品川区</td>
        <td>なし</td>
      </tr>
      <tr>
        <td>社員食堂</td>
        <td>東京都港区</td>
        <td>なし</td>
      </tr>
    </tbody>
  </table>

  <h2 id="マーキング">マーキング</h2>
  <p>
    <code>このように</code
    >マーキングしたい場合はマーキングしたい箇所を次のように<strong>バッククォート</strong>で囲みます。
  </p>

  <div class="code-container" style="position: relative">
    <button
      class="copy-btn"
      data-target="help-markup"
      style="position: absolute; top: 5px; right: 5px; z-index: 1"
      v-on:click="copyClipBoard('help-markup')"
    >
      コピー
    </button>
    <pre><code id="help-markup" class="language-markdown">`○×商事`</code></pre>
  </div>

  <p><code>○×商事</code></p>
</template>

<style scoped></style>
