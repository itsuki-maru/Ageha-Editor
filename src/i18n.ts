import { computed, readonly, type ComputedRef, type Ref, ref } from "vue";
import type { AppLocale } from "@/interface";

type MessageValue = string | MessageTree;
interface MessageTree {
  [key: string]: MessageValue;
}
type MessageParams = Record<string, string | number>;

const messages: Record<AppLocale, MessageTree> = {
  ja: {
    app: {
      versionTitle: "Version",
      versionMessage: "Ageha Editor: Version {version}",
      languageButton: "JA",
      languageSwitch: "表示言語を英語に切り替え",
    },
    common: {
      close: "閉じる",
      message: "メッセージ",
      copy: "コピー",
      copied: "コピーしました",
      externalLink: "外部リンク",
    },
    editor: {
      title: "Editor",
      preview: "Preview",
      slidePreview: "Slides",
      editorTooltip:
        "作成したい文書をマークダウンで記述します。\n作成はリアルタイムで左側のプレビューエリアに反映されます。",
      emptyInput: "入力がありません。",
    },
    toolbar: {
      markdownMode: "Markdown",
      slidesMode: "Slides",
      openFile: "ファイルを開く\nショートカット: Ctrl + o",
      saveFile: "保存\nショートカット: Ctrl + s",
      readImage: "画像読み込み\nショートカット: Ctrl + r",
      printOut: "出力（PDFまたは紙）\nショートカット: Ctrl + Alt + p",
      exportHtml: "HTML出力\nショートカット: Ctrl + Alt + f",
      togglePreview: "プレビュー切り替え\nショートカット: Ctrl + Alt + /",
      toggleScrollSync: "スクロール同期の切り替え\nMarkdown プレビュー時に有効",
      toggleTools: "マークダウン入力ツール\nショートカット: Ctrl + Alt + i",
      openViewer: "別ウィンドウ（閲覧）\nショートカット: Ctrl + Alt + w",
      openSlideshow: "スライドショー\nショートカット: Ctrl + Alt + s",
      toggleVim: "Vimモード切り替え\nショートカット: Ctrl + ,",
      newWindow: "新しいエディターを起動\nショートカット: Ctrl + Alt + n",
      help: "書き方のヘルプを表示\nショートカット: Ctrl + Alt + h",
    },
    tools: {
      h1: "# を挿入\n一番大きい見出し",
      h2: "## を挿入\n二番目に大きい見出し",
      h3: "### を挿入\n三番目に大きい見出し",
      bold: "** を挿入\n文字を ** で囲むと太字で強調",
      bulletList: "- を挿入",
      numberList: "1. を挿入",
      table: "| を挿入",
      horizontalRule: "--- を挿入",
      strike: "~ を挿入",
      codeBlock: "``` を挿入",
      inlineCode: "` を挿入",
      quote: "> を挿入",
      link: "[Title](URL) を挿入",
      details: ":::details を挿入",
      note: ":::note を挿入",
      warning: ":::warning を挿入",
      math: "$$ を挿入",
      pageBreak: "@@@（改ページ）を挿入",
      tel: "[](tel:+81) を挿入\n0 を省略した番号をハイフンなしで入力\n例）080-1234-5678 => +818012345678",
      mail: "[](mailto:) を挿入\nmailto:maru@example.com のようにメールアドレスを入力",
      slides: "スライドモードに変更\nmarp: true を挿入",
      detailsTemplate: ":::details タイトル\n非表示にする内容\n:::",
      noteTemplate: ":::note タイトル\n内容\n:::",
      warningTemplate: ":::warning タイトル\n内容\n:::",
      mathTemplate: "$$\n数式\n$$",
      slideTemplate: "---\nmarp: true\n\n---",
      linkTemplate: "[Title](URL)",
    },
    dialog: {
      unsavedTitle: "保存の確認",
      unsavedMessage: "ファイルが保存されていません。よろしいですか？",
      fileSelectError: "ファイル選択時にエラーが発生しました",
      versionInfo: "Version",
    },
    export: {
      printTitle: "印刷",
      viewerTitle: "Ageha Editor Viewer",
      slidesTitle: "Ageha Editor Slides",
      slideshowTitle: "Ageha Editor Slideshow",
      viewerOpenError: "ウィンドウの表示に失敗しました。",
      printOverlay: "保存出力の完了後、このウィンドウを閉じてください。",
      exportComplete: "出力処理が完了しました。",
    },
    file: {
      markdownFilter: "Markdown File",
      imageFilter: "Image File",
      markdownSaveFilter: "markdowntext",
      htmlSaveFilter: "html",
    },
    help: {
      title: "マークダウン文書を作成",
      intro:
        "「マークダウン」は特定の記号と組み合わせることで文書を整形する手法であり、Wikipedia などで使用されているこの形式は、インターネットやイントラネット上で共有・公開される文書の作成に適しています。まずはマークダウン文書をコピー＆ペーストで簡単に作成してみましょう。",
      slidesTitle: "スライド文書を作成",
      slidesIntro:
        "Ageha Editor は文書先頭の frontmatter に marp: true を書くと、スライドモードとしてプレビューします。スライドの区切りは --- を使います。",
      slidesCss:
        "スライド専用の見た目は、ユーザー設定フォルダ内の ~/.ageha/ageha-slide.css を編集すると上書きできます。この CSS はプレビュー、別ウィンドウ表示、HTML 出力、印刷に共通で反映されます。",
      bodyLead:
        "今度は次のテキストをコピーして編集エディタに貼り付けてみましょう。先に入力したタイトルと組み合わせてプレビューが現れます。",
      guideTitle: "解説",
      guideIntro:
        "マークダウンは記号を使ってスタイルを整える文書作成の技術です。この先はそれぞれの記号がどのような意味を持つか解説します。",
      headingTitle: "見出しの書き方",
      headingBody:
        "見出しは #(シャープ) を使います。シャープの数で見出しの大きさ（レベル）を変えることができます。また、# の次は必ず半角スペースを入れます。",
      boldTitle: "文字の強調",
      boldBody: "文字を強調したい場合は強調したい文字を ** で囲みます。",
      bulletTitle: "箇条書き（点）",
      bulletBody:
        "箇条書きは -(ハイフン) を使い、- の後には半角スペースを必ず入れます。また、入れ子の見出しを作る場合は半角スペースを4つ入れます。",
      numberTitle: "箇条書き（数字）",
      numberBody:
        "数字の箇条書きは 1. のように記述します。1. の後には半角スペースを必ず入れます。また、入れ子の見出しを作る場合は点の箇条書きと同様に半角スペースを4つ入れます。",
      tableTitle: "表の作り方",
      tableBody:
        "表は | の記号を使用して作ります。またタイトル行と内容の区切りは | --- | --- | --- | のように記述します。次の表は 3×3 の表の作成例です。",
      codeTitle: "マーキング",
      codeBody:
        "このようにマーキングしたい場合は、マーキングしたい箇所をバッククォートで囲みます。",
    },
  },
  en: {
    app: {
      versionTitle: "Version",
      versionMessage: "Ageha Editor: Version {version}",
      languageButton: "EN",
      languageSwitch: "Switch display language to Japanese",
    },
    common: {
      close: "Close",
      message: "Message",
      copy: "Copy",
      copied: "Copied",
      externalLink: "External link",
    },
    editor: {
      title: "Editor",
      preview: "Preview",
      slidePreview: "Slides",
      editorTooltip:
        "Write your document in Markdown here.\nYour changes are reflected in the preview area in real time.",
      emptyInput: "There is no content to output.",
    },
    toolbar: {
      markdownMode: "Markdown",
      slidesMode: "Slides",
      openFile: "Open file\nShortcut: Ctrl + O",
      saveFile: "Save\nShortcut: Ctrl + S",
      readImage: "Insert image\nShortcut: Ctrl + R",
      printOut: "Print (PDF or paper)\nShortcut: Ctrl + Alt + P",
      exportHtml: "Export HTML\nShortcut: Ctrl + Alt + F",
      togglePreview: "Toggle preview\nShortcut: Ctrl + Alt + /",
      toggleScrollSync: "Toggle scroll sync\nEnabled for Markdown preview",
      toggleTools: "Markdown tools\nShortcut: Ctrl + Alt + I",
      openViewer: "Open in separate window\nShortcut: Ctrl + Alt + W",
      openSlideshow: "Slideshow\nShortcut: Ctrl + Alt + S",
      toggleVim: "Toggle Vim mode\nShortcut: Ctrl + ,",
      newWindow: "Open a new editor window\nShortcut: Ctrl + Alt + N",
      help: "Show writing help\nShortcut: Ctrl + Alt + H",
    },
    tools: {
      h1: "Insert #\nLargest heading",
      h2: "Insert ##\nSecond largest heading",
      h3: "Insert ###\nThird largest heading",
      bold: "Insert **\nWrap text with ** for bold emphasis",
      bulletList: "Insert -",
      numberList: "Insert 1.",
      table: "Insert |",
      horizontalRule: "Insert ---",
      strike: "Insert ~",
      codeBlock: "Insert ```",
      inlineCode: "Insert `",
      quote: "Insert >",
      link: "Insert [Title](URL)",
      details: "Insert :::details",
      note: "Insert :::note",
      warning: "Insert :::warning",
      math: "Insert $$",
      pageBreak: "Insert @@@ (page break)",
      tel: "Insert [](tel:+81)\nEnter the number without the leading 0 and without hyphens\nExample: 080-1234-5678 => +818012345678",
      mail: "Insert [](mailto:)\nEnter an email address like mailto:maru@example.com",
      slides: "Switch to slide mode\nInsert marp: true",
      detailsTemplate: ":::details Title\nHidden content\n:::",
      noteTemplate: ":::note Title\nContent\n:::",
      warningTemplate: ":::warning Title\nContent\n:::",
      mathTemplate: "$$\nformula\n$$",
      slideTemplate: "---\nmarp: true\n\n---",
      linkTemplate: "[Title](URL)",
    },
    dialog: {
      unsavedTitle: "Unsaved changes",
      unsavedMessage: "This file has unsaved changes. Continue?",
      fileSelectError: "An error occurred while selecting a file.",
      versionInfo: "Version",
    },
    export: {
      printTitle: "Print",
      viewerTitle: "Ageha Editor Viewer",
      slidesTitle: "Ageha Editor Slides",
      slideshowTitle: "Ageha Editor Slideshow",
      viewerOpenError: "Failed to open the viewer window.",
      printOverlay: "Close this window after the save or print operation finishes.",
      exportComplete: "The output operation has completed.",
    },
    file: {
      markdownFilter: "Markdown File",
      imageFilter: "Image File",
      markdownSaveFilter: "markdown",
      htmlSaveFilter: "html",
    },
    help: {
      title: "Create a Markdown document",
      intro:
        "Markdown is a lightweight way to format text with simple symbols. It is widely used on the web, including sites like Wikipedia, and is well suited for documents shared on the internet or an intranet. Start by copying and pasting the sample below.",
      slidesTitle: "Create slide documents",
      slidesIntro:
        "Ageha Editor switches to slide mode when you put marp: true in the frontmatter at the top of the document. Use --- to separate slides.",
      slidesCss:
        "You can override the slide appearance by editing ~/.ageha/ageha-slide.css in the user settings folder. The same CSS is applied to preview, separate windows, HTML export, and printing.",
      bodyLead:
        "Next, copy the following text and paste it into the editor. Combined with the title above, the preview will appear immediately.",
      guideTitle: "Guide",
      guideIntro:
        "Markdown uses symbols to style plain text documents. The sections below explain what each symbol means.",
      headingTitle: "Headings",
      headingBody:
        "Use # for headings. The number of # characters controls the heading level. Always put a half-width space after #.",
      boldTitle: "Bold text",
      boldBody: "To emphasize text, wrap the target words with **.",
      bulletTitle: "Bulleted lists",
      bulletBody:
        "Use - (hyphen) for a bulleted list, and always add a space after -. To create a nested list, indent with four spaces.",
      numberTitle: "Numbered lists",
      numberBody:
        "Use 1. for numbered lists, and always add a space after it. For nested items, indent with four spaces just like bulleted lists.",
      tableTitle: "Tables",
      tableBody:
        "Use the | character to create tables. Separate the header row from the body with a line like | --- | --- | --- |. The sample below shows a 3 x 3 table.",
      codeTitle: "Inline code",
      codeBody: "To mark text like code, wrap the target text with backticks.",
    },
  },
};

const currentLocale = ref<AppLocale>("ja");

function isMessageTree(value: MessageValue | undefined): value is MessageTree {
  return typeof value === "object" && value !== null;
}

function getMessage(locale: AppLocale, key: string): string | undefined {
  const path = key.split(".");
  let current: MessageValue | undefined = messages[locale];
  for (const segment of path) {
    if (!isMessageTree(current)) return undefined;
    current = current[segment];
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(template: string, params?: MessageParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? `{${key}}`));
}

export function translate(
  key: string,
  params?: MessageParams,
  locale = currentLocale.value,
): string {
  const message = getMessage(locale, key) ?? getMessage("ja", key) ?? key;
  return interpolate(message, params);
}

export function setLocale(locale: AppLocale): void {
  currentLocale.value = locale;
}

export function getLocale(): AppLocale {
  return currentLocale.value;
}

export function useI18n(): {
  locale: Readonly<Ref<AppLocale>>;
  languageLabel: ComputedRef<string>;
  toggleLocale: () => AppLocale;
  t: (key: string, params?: MessageParams) => string;
} {
  return {
    locale: readonly(currentLocale),
    languageLabel: computed(() => translate("app.languageButton")),
    toggleLocale: () => {
      const next = currentLocale.value === "ja" ? "en" : "ja";
      currentLocale.value = next;
      return next;
    },
    t: (key: string, params?: MessageParams) => translate(key, params),
  };
}
