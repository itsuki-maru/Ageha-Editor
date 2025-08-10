<script setup lang="ts">
import { open, save, confirm } from '@tauri-apps/plugin-dialog';
import { invoke } from "@tauri-apps/api/core";
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ref, onMounted, onUnmounted, onBeforeUnmount, watch } from "vue";
import { convertFileSrc } from '@tauri-apps/api/core';
import type { Ref } from "vue";
import { FilterXSS, getDefaultWhiteList } from "xss";
import type { IFilterXSSOptions } from "xss"
import { marked } from "marked";
import type { MarkedOptions, Tokens } from "marked";
import type { LocalStrageItem, ResponseTextData, DiffEditorData, StatusCode } from "./interface";
import * as ace from "ace-builds";
import "ace-builds/src-noconflict/ext-searchbox"; // Ctrl+Fで検索ボックスを使用するために必要なモジュール
import "ace-builds/src-noconflict/mode-markdown"; // Aceでマークダウンを使用するためのモジュール
import "ace-builds/src-noconflict/theme-monokai"; // Aceのテーマのモジュール
import { videoToken, detailsToken, noteToken, warningToken, mathExtentionToken, renderer } from "./utils/markedSetup";
import "katex/dist/katex.min.css";
import mermaid from 'mermaid';
import Help from "@/components/Help.vue";


// アプリケーション起動処理完了後の引数受け取り
type RustArgs = {
    status: StatusCode,
    file_abs_path: string;
    text_data: string;
};

// ウィンドウ起動後にRustバックエンドに起動時の引数状況を要求
onMounted(async () => {
    try {
        const result = await invoke<RustArgs | null>("request_launch_args");
        if (result) {
            const textData = result.text_data
            activeFilePath.value = result.file_abs_path;
            editorContent.value = textData;
            diffEditorRef.value.oldEditorContent = textData;
            diffEditorRef.value.newEdirotContent = textData;
        }
    } catch (error) {
    }
});

// imgタグをオーバーライド
renderer.image = (tokens: Tokens.Image) => {
    let width = "";
    let href = tokens.href;
    let text = tokens.text;
    const match = tokens.href.match(/\s*=(\d+)(x)?$/);
    if (match) {
        width = match[1];
        href = href.replace(/\s*=.*$/, "");
    }
    const widthAttr = width ? ` width="${width}px"` : "";

    // 相対パスが指定された場合、絶対パスに変換してレンダリングするカスタマイズ
    // セキュリティ上、`./`のみを許可
    if (!href.startsWith("http://") && !href.startsWith("https://")) {
        if (href.startsWith("./") || href.startsWith(".\\")) {
            // 現在選択されているマークダウンファイルを起点に絶対パスに変換
            const trimSavePath = activeFilePath.value.replace(/\*/g, "");
            const fileParentPath = getParentPath(trimSavePath);
            href = href.replace(/^./, fileParentPath);
        }
        href = convertFileSrc(href);
        return `<img src="${href}" alt="${text}" ${widthAttr}>`;
    }
    return `<img src="${href}" alt="${text}" ${widthAttr}>`;
};

// 親ディレクトリを取得
function getParentPath(filePath: string) {
    // 最後の`/`を見つける
    let lastSlashIndex = filePath.lastIndexOf("/");
    // `/`が見つからない場合
    if (lastSlashIndex === -1) {
        // 区切り文字を`\`に変えて再度試みる
        lastSlashIndex = filePath.lastIndexOf("\\");
        if (lastSlashIndex === -1) {
            return "";
        }
    }
    // 最後の`/`若しくは`\`までの文字列を返す
    return filePath.substring(0, lastSlashIndex);
}

listen("tauri://drag-drop", async (event) => {
    const allowTextFiles = [
        "md",
        "txt",
    ];

    const allowImageExtentions = [
        "jpg",
        "JPG",
        "jpeg",
        "JPEG",
        "png",
        "PNG",
        "svg",
        "svg",
        "webp",
        "WEBP",
    ];

    const paths = (event.payload as { paths: string[] }).paths;
    const dropFilePath = paths[0];
    const fileExtention = dropFilePath?.split(".").pop();
    if (!fileExtention) return;

    // 拡張子が.mdならファイルオープン
    if (allowTextFiles.includes(fileExtention)) {
        // 変更フラグにより未保存警告
        if (isEdit.value) {
            const confirmation = await confirm(
                "ファイルが保存されていません。よろしいですか??",
                { title: "保存の確認", kind: "warning" }
            );
            if (!confirmation) return;
        };

        const textData = await callRustReadMarkdownFile(dropFilePath);
        
        // 変更フラグをfalse
        isEdit.value = false;
        if (textData || textData === "") {
            editorContent.value = textData;
            diffEditorRef.value.oldEditorContent = textData;
            diffEditorRef.value.newEdirotContent = textData;
        }
        activeFilePath.value = dropFilePath;
    };

    // 拡張子が画像形式なら画像挿入
    if (allowImageExtentions.includes(fileExtention)) {
        const replacePath = dropFilePath?.replace(/\\/g, "/");
        const fileName = getFileName(replacePath);
        const imageUrlMarkdown = `![${fileName}](${replacePath})`;
        insertMarkdown(imageUrlMarkdown);
        return;
    } else {
        return;
    }
});

// ウィンドウクローズ時の処理追加
onMounted(async () => {
    await getCurrentWindow().onCloseRequested(async (event) => {
        // 未保存のテキストが存在する場合の終了確認
        if (isEdit.value) {
            const confirmation = await confirm(
                "ファイルが保存されていません。よろしいですか??",
                { title: "終了の確認", kind: "warning" }
            );
            if (!confirmation) {
                event.preventDefault();
            }
        }
    })
});

// Mermaidの初期読み込みを阻止（MarkedによるHTMLレンダリング後にinitで読み込み）
mermaid.initialize({ 
    startOnLoad: false,
    theme: "default",
});

// markedの設定をカスタマイズ
marked.setOptions({
    renderer,
    async: false
});

// Markedにカスタムトークンを追加
marked.use(
    {
        extensions: [
            videoToken,
            detailsToken,
            noteToken,
            warningToken,
            mathExtentionToken,
        ],
    }
);

// XSSフィルタの設定をカスタマイズする
let xssOptions: IFilterXSSOptions = {
    whiteList: {
        ...getDefaultWhiteList(), // デフォルトの許可リストを維持
        h1: ['id', 'class'], // h1-h6タグのid属性を許可 h1-h2のclass属性を許可
        h2: ['id', 'class'],
        h3: ['id'],
        h4: ['id'],
        h5: ['id'],
        h6: ['id'],
        pre: ['class'],
        a: ['target', 'rel', 'href', 'title'],
        div: ['class'],
        span: ['class', 'aria-hidden', 'style'],
    },
    // Katexでサニタイズされてしまうスタイルを再定義
    css: {
        whiteList: {
            height: true,
            'margin-right': true,
            top: true,
            width: true,
            'margin-left': true,
            left: true, right: true, bottom: true,
        }
    }
};
const myXss = new FilterXSS(xssOptions);

// Aceエディタを定義
const editorRef = ref<HTMLDivElement | null>(null);
let editor: any | null = null;

// editorContent（bodyの要素）の変化を監視
const editorContent = ref<string>("");
watch(editorContent, (newEditorContent) => {
    diffEditorRef.value.newEdirotContent = newEditorContent;
    if (editor && editor.getValue() !== newEditorContent) {
        editor.setValue(newEditorContent, 1);
    }
});

// ローカルストレージから最後のアプリケーション設定情報を取得
const localStorageItems = getLocalStrageInfo();
const isShowTools = ref(false); // マークダウン入力ツール表示コントロール
const isPreview = ref(true); // プレビューの表示非表示

if (localStorageItems.isShowToolsFromLocalStrage === null) {
    localStorage.setItem("isShowTools", "false");
};

if (localStorageItems.isShowToolsFromLocalStrage === "true") {
    isShowTools.value = true;
};

if (localStorageItems.isPreviewFromLocalStrage === null) {
    localStorage.setItem("isPreview", "true");
};

if (localStorageItems.isPreviewFromLocalStrage === "false") {
    isPreview.value = false;
}

// ローカルストレージから前回起動時の状況を取得
function getLocalStrageInfo(): LocalStrageItem {
    const localstrageItem = {
        isShowToolsFromLocalStrage: localStorage.getItem("isShowTools"),
        isPreviewFromLocalStrage: localStorage.getItem("isPreview")
    }
    return localstrageItem;
}

// マークダウン記号入力ボタンの表示非表示切替
const handleInputTool = (): void => {
    if (isShowTools.value) {
        isShowTools.value = false;
        localStorage.setItem("isShowTools", "false");
    } else {
        isShowTools.value = true;
        localStorage.setItem("isShowTools", "true");
    }
};

// マークダウンプレビューの表示非表示切替
const handlePreview = (): void => {
    if (isPreview.value) {
        isPreview.value = false;
        localStorage.setItem("isPreview", "false");
    } else {
        isPreview.value = true
        localStorage.setItem("isPreview", "true");
    }
};

// HTML描画後にAceエディタを反映
onMounted(() => {
    // Aceの設定
    if (editorRef.value) {
        editor = ace.edit(editorRef.value);
        editor.getSession().setMode("ace/mode/markdown");
        editor.getSession().setUseWrapMode(true);
        editor.setFontSize(16);
        // 80文字の縦ラインを消す
        editor.setShowPrintMargin(false);
    }
    // editorの変更を監視
    editor.on("change", () => {
        // mermaid.jsによるフロー図レンダリング
        drawMermaid();
        const newValue = editor.getValue();
        if (newValue !== editorContent.value) {
            editorContent.value = newValue;
        }
    });

    let isEditorScrolling = false;
    let isPreviewScrolling = false;
    if (isEditorScrolling) {} // ビルドエラー回避

    // editorからpreviewへのスクロールの同期
    // previewからeditorの同期は不可（画像の差分を微調整するため）
    editor.getSession().on("changeScrollTop", function () {
        if (isPreviewScrolling) return;

        const editorScroll = editor.getSession().getScrollTop();
        const editorMaxScroll = editor.renderer.layerConfig.maxHeight - editor.renderer.$size.scrollerHeight;
        const preview = document.getElementById("result")!;
        if (!preview) return;

        const previewMaxScroll = preview.scrollHeight - preview.clientHeight;

        isEditorScrolling = true;
        preview.scrollTop = (editorScroll / editorMaxScroll) * previewMaxScroll;
        setTimeout(() => isEditorScrolling = false, 50);
    });
});

// Mermaid.jsのエラーハンドリング
async function drawMermaid() {
    try {
        await mermaid.init();
    } catch (error) {
        console.error("Mermaid.js Syntax Error.")
    }
}

onUnmounted(() => {
    if (editor) {
        editor.destroy()
    }
});

// ヘルプモーダルの描画
const showHelpContent = ref(false);
const handleHelpModal = (): void => {
    if (showHelpContent.value) {
        showHelpContent.value = false;
    } else {
        showHelpContent.value = true;
    }
};

// ヘルプモーダル表示時に灰色の部分のクリック時にもヘルプモーダルを閉じる処理
// HTMLが描画後に組み込む（onmoutedを利用）
onMounted(() => {
    // オーバレイとヘルプの内容を取得
    const helpModal = document.getElementById("overlay-help");
    const helpModalContent = document.getElementById("content-help");
    // 灰色部分クリック時にクローズ処理がなされるようにイベント設定
    if (helpModal) {
        helpModal.addEventListener("click", function (_event) {
            if (showHelpContent.value === true) {
                showHelpContent.value = false
            } else {
                return;
            }
        });
    }
    // 灰色の部分以外（content-help）をクリックした時にはイベント伝搬を止め、クローズさせない
    if (helpModalContent) {
        helpModalContent.addEventListener("click", function (event) {
            event.stopPropagation();
        });
    }
});

const parsedHtml = ref<string>("");

// マークダウンからHTMLへのパース処理
watch(
    editorContent,
    (md) => {
        const options: MarkedOptions = { async: false };
        const htmlStr = marked.parse(md, options);
        parsedHtml.value = myXss.process(htmlStr as string);
    },
    { flush: "post" } // DOM更新後に走らせて描画と競合しにくくする
);

// スクロール同期の設定
const formArea: Ref<HTMLElement | null> = ref(null);
const previewArea: Ref<HTMLElement | null> = ref(null);
onMounted(() => {
    formArea.value?.addEventListener("scroll", function (this: HTMLElement) {
        if (previewArea.value && this.scrollTop !== undefined) {
            previewArea.value.scrollTop = this.scrollTop;
        }
    });

    previewArea.value?.addEventListener("scroll", function (this: HTMLElement) {
        if (formArea.value && this.scrollTop !== undefined) {
            formArea.value.scrollTop = this.scrollTop;
        }
    });
});

// メッセージ表示モーダル機能
const isMessageModal = ref(false);
const messageText = ref("");
const handleMessageModal = (message: string): void => {
    if (!isMessageModal.value) {
        messageText.value = message;
        isMessageModal.value = true;
    } else {
        isMessageModal.value = false;
        messageText.value = "";
    }
};

// ウィンドウサイズでエディタのサイズを自動調整
function useWindowSize() {
    const width = ref(window.innerWidth);
    const height = ref(window.innerHeight);

    const updateSize = () => {
        width.value = window.innerWidth;
        height.value = window.innerHeight;
    };
    onMounted(() => {
        window.addEventListener("resize", updateSize);
    });

    onBeforeUnmount(() => {
        window.removeEventListener("resize", updateSize);
    });
    return { width, height };
}

const { height } = useWindowSize();
const divHeight = ref(0);
if (height.value > 850) {
    divHeight.value = height.value * 0.74;
} else if (height.value > 400) {
    divHeight.value = height.value * 0.6;
}

watch(height, (newHeight) => {
    if (newHeight > 800) {
        divHeight.value = newHeight * 0.74;
    } else {
        divHeight.value = newHeight * 0.6;
    }
});

// ショートカットキーを追加
const handleKeyDown = (event: KeyboardEvent) => {
    // プレビューの表示非表示
    if (event.ctrlKey && event.key === "o") {
        event.preventDefault();
        fileOpen();

    // 保存
    } else if (event.ctrlKey && event.key === "s") {
        event.preventDefault();
        fileSave();

    // 画像ファイル取得
    } else if (event.ctrlKey && event.key === "r") {
        event.preventDefault();
        readImage();

    // 印刷
    } else if (event.ctrlKey && event.altKey && event.key === "p") {
        event.preventDefault();
        printOut();

    // プレビュー切り替え
    } else if (event.ctrlKey && event.altKey && event.key === "/") {
        event.preventDefault();
        handlePreview();

    // マークダウン入力ツール
    } else if (event.ctrlKey && event.altKey && event.key === "i") {
        event.preventDefault();
        handleInputTool();

    // ヘルプモーダル
    } else if (event.ctrlKey && event.altKey && event.key === "h") {
        event.preventDefault();
        handleHelpModal();

    } else if (event.ctrlKey && event.key === "m") {
        drawMermaid();

    // Escapeキーでモーダルウィンドウをクローズ
    } else if (event.key === "Escape") {
        event.preventDefault();
        if (isMessageModal.value) {
            isMessageModal.value = false;
        }
        if (showHelpContent.value) {
            showHelpContent.value = false;
        }
    }
};

// コンポーネントマウント時にイベントリスナーを追加
onMounted(() => {
    window.addEventListener("keydown", handleKeyDown);
});

// コンポーネントがアンマウントされた際にイベントリスナーを削除
onUnmounted(() => {
    window.removeEventListener("keydown", handleKeyDown);
});

// マークダウン記号をエディタに挿入
function insertMarkdown(text: string) {
    const corsorPosition = editor.getCursorPosition();
    editor.session.insert(corsorPosition, text);
    editor.focus();
};

// 編集中のアクティブファイル
const activeFilePath = ref("");
// 初期ファイル読み込み情報を保持
const diffEditor: DiffEditorData = {
    newEdirotContent: "",
    oldEditorContent: "",
};
const diffEditorRef = ref<DiffEditorData>(diffEditor);

// 読み取ったファイル内容の初期状態との変更を監視
const isEdit = ref(false); // 変更フラグ
watch(
    () => [diffEditorRef.value.oldEditorContent, diffEditorRef.value.newEdirotContent],
    ([oldVal, newVal]) => {
        if (oldVal === newVal) {
            if (activeFilePath.value.includes("*")) {
                activeFilePath.value = activeFilePath.value.replace(/\*/g, "");
                isEdit.value = false;
            }
        } else if (oldVal !== newVal) {
            if (!activeFilePath.value.includes("*")) {
                activeFilePath.value = `*${activeFilePath.value}`;
                isEdit.value = true;
            }
        }
    }
);

// ファイルを開く
const fileOpen = async () => {
    // 変更フラグにより未保存警告
    if (isEdit.value) {
        const confirmation = await confirm(
            "ファイルが保存されていません。よろしいですか??",
            { title: "保存の確認", kind: "warning" }
        );
        if (!confirmation) return;
    };

    const filePath = await selectFile("Markdown File", ["md", "txt"]);
    if (!filePath) return;

    const textData = await callRustReadMarkdownFile(filePath);
    if (textData || textData === "") {
        editorContent.value = textData;
        diffEditorRef.value.oldEditorContent = textData;
        diffEditorRef.value.newEdirotContent = textData;
        activeFilePath.value = filePath;
    }
    isEdit.value = false;
};

// Rust側でのマークダウンファイル取得処理
async function callRustReadMarkdownFile(filePath: string) {
    try {
        const response: ResponseTextData = await invoke(
            "read_file",
            { targetFile: filePath }
        );
        return response.text_data;
    } catch (error) {
        console.error(error)
    }
}

// 新規ファイルの保存処理
async function newWriteSave(filePath: string, fileData: string) {
    // Rust側で保存処理
    const status = await callRustSaveFile(
        filePath,
        fileData,
    );
    if (status.status_code === 200) {
        activeFilePath.value = filePath;
        return true;
    } else {
        return false;
    }
}

// ファイルの上書き保存処理
async function overWriteSave() {
    // Rust側で保存処理
    const trimSavePath = activeFilePath.value.replace(/\*/g, "");
    const status = await callRustSaveFile(
        trimSavePath,
        editor.getValue(),
    );
    if (status.status_code === 200) {
        activeFilePath.value = trimSavePath;
        return true;
    } else {
        return false;
    }
}

// ファイル選択ダイアログ起動
async function selectFile(
    name: string,
    extentions: string[],
) {
    try {
        const selectedFilePath = await open({
            directory: false,
            multiple: false,
            filters: [{ name: name, extensions: extentions }]
        });
        if (!selectedFilePath) return;
        return selectedFilePath;
    } catch (error) {
        console.error(error);
        handleMessageModal("ファイル選択時にエラーが発生しました");
    }
}

// ファイル保存
const fileSave = async () => {
    const markdownText = editor.getValue();
    // 新規ファイル保存
    if (activeFilePath.value === "*" || (markdownText === "" && activeFilePath.value === "")) {
        const saveNewPath = await saveNewFile();
        if (saveNewPath) {
            const isSaved = await newWriteSave(saveNewPath, markdownText);
            if (!isSaved) return;
        }

    // 上書き保存
    } else {
        const isSaved = await overWriteSave();
        if (!isSaved) return;
    }

    // 変更フラグをfalse
    isEdit.value = false;
};

// Rust側での保存処理
async function callRustSaveFile(
    saveFileParh: string,
    markdown_text_data: string
): Promise<StatusCode> {
    try {
        const response: StatusCode = await invoke(
            "save_file",
            { savePath: saveFileParh, markdownTextData: markdown_text_data }
        );
        return response;
    } catch (error) {
        const errorStatus: StatusCode = {
            status_code: 500,
            message: `${error}`,
        }
        return errorStatus
    }
}

// 新規ファイル保存ダイアログ
async function saveNewFile(): Promise<string | null> {
    const path = await save({
        filters: [{ name: "markdowntext", extensions: ["md"] }]
    });
    return path;
};

// 出力処理の開始
const printOut = () => {
    printPreviewWindow(parsedHtml.value);
};

async function renderMermaidToSvg(html: string): Promise<string> {
    const container = document.createElement("div");
    container.innerHTML = html;
    const blocks = container.querySelectorAll<HTMLElement>(".mermaid");
    let i = 0;

    for (const block of Array.from(blocks)) {
        const code = block.textContent ?? "";
        const { svg } = await mermaid.render(`print-graph-${i++}`, code);
        // SVGで置換
        block.outerHTML = svg;
    }
    return container.innerHTML;
}

// OSのプリント出力を起動
async function printPreviewWindow(htmlBody: string) {
    if (editorContent.value === "") {
        handleMessageModal("入力がありません。");
        return;
    };

    // 事前にmermaidの記述をSVGへ変換
    const rendered = await renderMermaidToSvg(htmlBody);

    // 印刷ウィンドウに投入
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;
    printWindow.document.writeln(
        `
        <html>
            <head>
                <meta charset="UTF-8">
                <title>印刷</title>
                <link rel="stylesheet" href="print.css">
                <link rel="stylesheet" href="katex.css">
                
            </head>
            
            <body>${rendered}</body>
        </html>
    `
    );
    printWindow.document.close();
    printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };
};

// 画像ファイルパスを取得
const readImage = async () => {
    const imageFilePath = await selectFile("Image File", ["png", "jpg", "jpeg", "svg"]);
    if (!imageFilePath) return;
    const fileName = getFileName(imageFilePath);
    const imageUrlMarkdown = `![${fileName}](${imageFilePath})`;
    insertMarkdown(imageUrlMarkdown);
};

// ファイル名を取得
function getFileName(path: string): string {
    const segments = path.split(/[/\\]/);
    return segments[segments.length -1];
}
</script>

<template>
    <!-- 機能ボタン -->
    <div id="btn-head-zone">
        <div id="btn-head-left">
            <button class="btn-head-image" title="ファイルを開く&#10;ショートカット: Ctrl + o" v-on:click="fileOpen()"><img
                    src="/file_open_24.png" class="btn-img" alt="file_open_24.png"></button>
            <button class="btn-head-image" title="保存&#10;ショートカット: Ctrl + s" v-on:click="fileSave()"><img
                    src="/file_save_24.png" class="btn-img" alt="file_save_24.png"></button>
            <button class="btn-head-image" title="画像読み込み&#10;ショートカット: Ctrl + r" v-on:click="readImage()"><img
                    src="/smartphone_line24.png" class="btn-img" alt="smartphone_line24.png"></button>
            <button class="btn-head-image" title="出力（PDFまたは紙）&#10;ショートカット: Ctrl + Alt + p" v-on:click="printOut()"><img
                    src="/print_24.png" class="btn-img" alt="print_24.png"></button>
            <button v-if="isPreview" class="btn-head-image" title="プレビュー切り替え&#10;ショートカット: Ctrl + Alt + /"
                v-on:click="handlePreview()"><img src="/preview_off_24.png" class="btn-img"
                    alt="preview_off_24.png"></button>
            <button v-else class="btn-head-image" title="プレビュー切り替え&#10;ショートカット: Ctrl + Alt + /"
                v-on:click="handlePreview()"><img src="/preview_on_24.png" class="btn-img"
                    alt="preview_on_24.png"></button>
            <button class="btn-head-image" title="マークダウン入力ツール&#10;ショートカット: Ctrl + Alt + i" v-on:click="handleInputTool()"><img
                    src="/markdown_24.png" class="btn-img" alt="markdown_24.png"></button>
        </div>
        <div id="btn-head-right">
            <button class="btn-head-image" title="書き方のヘルプを表示&#10;ショートカット: Ctrl + Alt + h" v-on:click="handleHelpModal"><img
                    src="/help_24.png" class="btn-img" alt="help_24.png"></button>
        </div>
    </div>

    <!-- エディタとプレビュー -->
    <div class="contants-area" :style="{ height: divHeight + 'px' }">
        <!-- エディター -->
        <div class="left-area-isprev" :style="{ width: isPreview ? '50%' : '100%', marginRight: isPreview ? '10px' : '0px' }">
            <div class="left-h3">
                <h3 class="editor-and-preview-title" id="title_h3_1">Editor</h3>
            </div>
            <div class="edit-area" :style="{ height: divHeight + 'px' }">
                <div ref="editorRef" class="editor-div" id="editor"
                    title="マークダウンエディター&#10;Wikiとして作成したい文書をマークダウンで記述します。&#10;作成はリアルタイムで左側のプレビューエリアに反映されます。">
                </div>
            </div>
        </div>
        <!-- プレビュー -->
        <div class="right-area-preview" v-if="isPreview">
            <div class="right-h3">
                <h3 class="editor-and-preview-title" id="title_h3_2">Preview</h3>
            </div>
            <div class="preview-area" id="result" ref="previewArea" :style="{ height: (divHeight) + 'px' }">
                <section v-html="parsedHtml"></section>
            </div>
        </div>
    </div>

    <!-- マークダウン入力支援ボタン -->
    <div class="input-tools" v-show="isShowTools" :style="{ width: isPreview ? '40%' : '85%' }">
        <button class="btn-input-tools" title="## を挿入" v-on:click="insertMarkdown('## ')"><img
                src="/format_h2_24.png" class="btn-input-tools-img" alt="format_h2_24.png"></button>
        <button class="btn-input-tools" title="### を挿入" v-on:click="insertMarkdown('### ')"><img
                src="/format_h3_24.png" class="btn-input-tools-img" alt="format_h3_24.png"></button>
        <button class="btn-input-tools" title="** を挿入" v-on:click="insertMarkdown('**')"><img
                src="/format_bold_24.png" class="btn-input-tools-img" alt="format_bold_24.png"></button>
        <button class="btn-input-tools" title="- を挿入" v-on:click="insertMarkdown('- ')"><img
                src="/format_list_bulleted_24.png" class="btn-input-tools-img"
                alt="format_list_bulleted_24.png"></button>
        <button class="btn-input-tools" title="1. を挿入" v-on:click="insertMarkdown('1. ')"><img
                src="/format_list_numbered_24.png" class="btn-input-tools-img"
                alt="format_list_numbered_24.png"></button>
        <button class="btn-input-tools" title="|を挿入" v-on:click="insertMarkdown('|')"><img src="/table_24.png"
                class="btn-input-tools-img" alt="table_24.png"></button>
        <button class="btn-input-tools" title="---を挿入" v-on:click="insertMarkdown('---')"><img
                src="/more_horiz_24.png" class="btn-input-tools-img" alt="more_horiz_24.png"></button>
        <button class="btn-input-tools" title="~を挿入" v-on:click="insertMarkdown('~')"><img
                src="/strikethrough_24.png" class="btn-input-tools-img" alt="strikethrough_24.png"></button>
        <button class="btn-input-tools" title="```を挿入" v-on:click="insertMarkdown('```')"><img
                src="/code_24.png" class="btn-input-tools-img" alt="code_24.png"></button>
        <button class="btn-input-tools" title="`を挿入" v-on:click="insertMarkdown('`')"><img
                src="/ink_highlighter_24.png" class="btn-input-tools-img"
                alt="ink_highlighter_24.png"></button>
        <button class="btn-input-tools" title=">を挿入" v-on:click="insertMarkdown('>')"><img src="/chat_24.png"
                class="btn-input-tools-img" alt="chat_24.png"></button>
        <button class="btn-input-tools" title="[Title](URL)を挿入" v-on:click="insertMarkdown('[Title](URL)')"><img
                src="/link_24.png" class="btn-input-tools-img" alt="link_24.png"></button>
        <button class="btn-input-tools" title=":::detailsを挿入"
            v-on:click="insertMarkdown(':::details タイトル\n非表示にする内容\n:::')"><img src="/more_24.png"
                class="btn-input-tools-img" alt="more_24.png"></button>
        <button class="btn-input-tools" title=":::noteを挿入" v-on:click="insertMarkdown(':::note タイトル\n内容\n:::')"><img
                src="/info_24.png" class="btn-input-tools-img" alt="info_24.png"></button>
        <button class="btn-input-tools" title=":::warningを挿入"
            v-on:click="insertMarkdown(':::warning タイトル\n内容\n:::')"><img src="/warning_24.png"
                class="btn-input-tools-img" alt="warning_24.png"></button>
    </div>

    <!-- ヘルプモーダル -->
    <transition>
        <div id="overlay-help" v-show="showHelpContent">
            <div id="content-help">
                <Help></Help>
                <button v-on:click="handleHelpModal()">閉じる</button>
            </div>
        </div>
    </transition>

    <!-- 各種メッセージモーダル -->
    <div id="overlay-message" v-show="isMessageModal">
        <div id="content-message">
            <h2 class="modal-h2">メッセージ</h2>
            <div class="input-text-zone">
                <p><strong>{{ messageText }}</strong></p>
            </div>
            <div class="btn-close">
                <button id="message-close-btn" v-on:click="handleMessageModal('No Message')">閉じる</button>
            </div>
        </div>
    </div>

    <!-- ファイルパス -->
    <footer>
        <p class="footer-path">{{ activeFilePath }}</p>
    </footer>
</template>

<style scoped>
h3 {
    /* h3タグのテキストを左寄せにする */
    text-align: left;
    margin-bottom: 0;
}

#btn-head-zone {
    display: flex;
    justify-content: space-between;
}

#btn-head-left {
    display: flex;
}

.v-enter-active,
.v-leave-active {
    transition: all 0.3s ease-in-out;
}

.v-enter-from,
.v-leave-to {
    opacity: 0;
}

.contants-area {
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
    content: '';
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
    content: '';
    bottom: -3px;
    left: 0px;
    width: 100%;
    border-bottom: solid 3px rgb(17, 105, 86);
}

/* Aceエディタの上にモーダルを出した際の崩れ（スクロールバーが前面に現れる）を解消 */
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
    font-size: 22px;
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
    content: '';
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
    content: '';
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

/* ヘルプモーダル */
#overlay-help {
    z-index: 1;
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
}

/* ヘルプモーダルのコンテンツ */
#content-help {
    z-index: 2;
    height: 100%;
    width: 70%;
    padding: 1em;
    margin-left: 47%;
    background: #fff;
    overflow-y: scroll;
}

/* メッセージモーダル */
#overlay-message {
    z-index: 3;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
}

#content-message {
    z-index: 4;
    width: 30%;
    padding: 1em;
    background: whitesmoke;
    border-radius: 10px;
    text-align: center;
}

.footer-path {
    position: fixed;
    bottom: 1px;
    left: 1%;
    text-align: right;
    font-size: 14px;
    color: #f0f0f0;
}
</style>