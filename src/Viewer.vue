<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, onBeforeUnmount } from "vue";
import { marked } from "marked";
import type { MarkedOptions, Tokens } from "marked";
import { convertFileSrc } from '@tauri-apps/api/core';
import { FilterXSS, getDefaultWhiteList } from "xss";
import type { IFilterXSSOptions } from "xss"
import { 
    videoToken,
    detailsToken,
    noteToken,
    warningToken,
    mathExtentionToken,
    PageBreakToken,
    renderer} from "./utils/markedSetup";
import "katex/dist/katex.min.css";
import mermaid from 'mermaid';
import { useRustArgsStore } from './stores/markdownDatas';


const rustArgsStore = useRustArgsStore();
const parsedHtml = ref<string>("");
const activeFilePath = ref("");

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

// ウィンドウ起動後にRustバックエンドに起動時の引数状況を要求
onMounted(async () => {
    try {
        const textData = rustArgsStore.rustArgsData.text_data;
        const options: MarkedOptions = { async: false };
        const htmlStr = marked.parse(textData, options);
        parsedHtml.value = myXss.process(htmlStr as string);
    } catch (error) {
    }
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
            PageBreakToken
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
const isHeightScreen = ref(false);
const divHeight = ref(0);
if (height.value > 850) {
    isHeightScreen.value = true;
    divHeight.value = height.value * 0.83;
} else if (height.value > 400) {
    isHeightScreen.value = false;
    divHeight.value = height.value * 0.78;
}

watch(height, (newHeight) => {
    if (newHeight > 800) {
        isHeightScreen.value = true;
        divHeight.value = newHeight * 0.83;
    } else {
        isHeightScreen.value = false;
        divHeight.value = newHeight * 0.78;
    }
});

// 出力処理の開始
const printOut = () => {
    printPreviewWindow(parsedHtml.value);
};

// OSのプリント出力を起動
async function printPreviewWindow(htmlBody: string) {
    if (rustArgsStore.rustArgsData.text_data === "") {
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

// ショートカットキーを追加
const handleKeyDown = (event: KeyboardEvent) => {
    // 印刷
    if (event.ctrlKey && event.altKey && event.key === "p") {
        event.preventDefault();
        printOut();
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
</script>

<template>
    <div class="contants-area" :style="{ height: divHeight + 'px' }">
        <div class="preview-area" :style="{ height: (divHeight) + 'px' }">
            <section v-html="parsedHtml"></section>
        </div>
        <div>
            <button class="btn-head-image" id="print-viewer-btn" title="出力（PDFまたは紙）&#10;ショートカット: Ctrl + Alt + p" v-on:click="printOut()"><img
                src="/print_24.png" class="btn-img" alt="print_24.png"></button>
        </div>
    </div>
</template>

<style scoped>
#print-viewer-btn {
    position: absolute;
    right: 8%;
    bottom: 15%;
}
</style>