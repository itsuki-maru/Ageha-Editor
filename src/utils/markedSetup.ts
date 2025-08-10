import { marked, Renderer } from "marked";
import type { Token, Tokens } from "marked";
import katex from "katex";

// カスタムトークンの型定義
interface CustomVideoToken {
    type: "video" | Token["type"]; // 既存の型に "video"を追加
    href: string;
    text: string;
}

// カスタムトークン"video"の定義（型は緩くanyとする）
const videoToken: any = {
    name: "video",
    level: "inline",
    start(src: string) {
        return src.match(/\?\[.*\]\(.*\)/)?.index;
    },
    tokenizer(src: string, _tokens: Token[]): CustomVideoToken | null {
        const rule = /^\?\[(.*?)\]\((.*?)\)/;
        const match = rule.exec(src);
        if (match) {
            return {
                type: "video", // カスタムトークンタイプ
                raw: match[0],
                text: match[1],
                href: match[2],
            } as CustomVideoToken; // 型アサーション
        }
        return null;
    },
    renderer(token: CustomVideoToken) {
        return `<video controls src="${token.href}">${token.text}</video>`;
    }
};

// 共通インターフェース
interface CustomDetailsToken {
    type: "details" | "note" | "warning" | Token["type"];
    raw: string;
    title: string;
    tokens: Token[];
}

// ネスト対応トークナイザの共通関数
function createNestedTokenizer(typeName: "details" | "note" | "warning") {
    return {
        name: typeName,
        level: "block",
        start(src: string) {
            const re = new RegExp(`^:::${typeName}\\s`, "m");
            return src.match(re)?.index;
        },
        tokenizer(src: string, _tokens: Token[]): CustomDetailsToken | null {
            const self = this as any;
            if (!src.startsWith(`:::${typeName}`)) return null;

            const lines = src.split(/\r?\n/);
            let nestLevel = 0;
            let endIndex = -1;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (/^:::(\w+)/.test(line)) {
                    nestLevel++;
                } else if (/^:::\s*$/.test(line)) {
                    nestLevel--;
                    if (nestLevel === 0) {
                        endIndex = i;
                        break;
                    }
                }
            }

            if (endIndex === -1) return null;

            const rawLines = lines.slice(0, endIndex + 1);
            const raw = rawLines.join("\n");

            const titleMatch = lines[0].match(new RegExp(`^:::${typeName}\\s+(.+)`));
            const title = titleMatch ? titleMatch[1].trim() : typeName.toUpperCase();

            const content = lines.slice(1, endIndex).join("\n");

            return {
                type: typeName,
                raw,
                title,
                tokens: self.lexer.blockTokens(content),
            } as CustomDetailsToken;
        },
        renderer(token: CustomDetailsToken) {
            const body = marked.parser(token.tokens);
            if (token.type === "details") {
                return `<details>\n<summary>${token.title}</summary>\n${body}\n</details>\n`;
            } else {
                return `<div class="box ${token.type}">\n<summary>${token.title}</summary>\n${body}\n</div>\n`;
            }
        },
    };
}

// それぞれのトークンを生成
const detailsToken = createNestedTokenizer("details");
const noteToken = createNestedTokenizer("note");
const warningToken = createNestedTokenizer("warning");


// markedのスラッグ化機能をカスタマイズ
const renderer = new Renderer();

// ヘッダーを定義
renderer.heading = function (tokens: Tokens.Heading) {
    return `<h${tokens.depth} class="head${tokens.depth}">${tokens.text}</h${tokens.depth}>\n`; // class属性のCSSはトップレベル（App.vue）で定義
};

// [テキスト](URL)で定義された外部リンクを別タブで開かせるカスタムレンダラ設定
// 元のlink関数を保存
const originalLinkRenderer = renderer.link.bind(renderer);

// link関数をオーバーライド
renderer.link = (tokens: Tokens.Link) => {
    // 外部リンクかどうかをチェック
    const isExternal = /^https?:\/\//.test(tokens.href!);
    let isLocal = false;
    let isPDFHref = false;
    const html = originalLinkRenderer(tokens);
    if (isExternal) {
        if (isLocal && isPDFHref) {
            return html.replace(/^<a /, '<a target="_blank" rel="noopener noreferrer" title="PDFリンク" ');
        }
        // 外部リンクの場合、targetとrel属性を追加
        return html.replace(/^<a /, '<a target="_blank" rel="noopener noreferrer" title="外部リンク" ');
    } else {
        // 内部リンクかつPDFの場合
        if (isPDFHref) {
            return html.replace(/^<a /, '<a target="_blank" rel="noopener noreferrer" title="PDFリンク" ');
        }
        // 内部リンクの場合、元の処理を使用
        return originalLinkRenderer(tokens);
    }
};

// mermaidの処理
const originalCodeRenderer = renderer.code.bind(renderer);
renderer.code = (tokens: Tokens.Code) => {
    if (tokens.lang == "mermaid") {
        return '<pre class="mermaid">' + escapeHtml(tokens.text) + '\n</pre>';
    } else {
        return originalCodeRenderer(tokens);
    }
}

// HTMLエスケープ関数
function escapeHtml(html: string) {
    return html
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// カスタムトークンの型定義
interface CustomKatexToken {
    type: "math" | Token["type"]; // 既存の型に "math"を追加
    text: string;
    displayMode: boolean;
}

const mathExtentionToken: any = {
    name: "math",
    level: "inline",
    start(src: string) {
        return src.match(/\$+/)?.index;
    },
    tokenizer(src: string, _tokens: Token[]): CustomKatexToken | null {
        const blockMath = /^\$\$([^$]+)\$\$/; // $$...$$
        const inlineMath = /^\$([^$\n]+)\$/;  // $...$

        const blockMatch = blockMath.exec(src);
        if (blockMatch) {
            return {
                type: "math",
                raw: blockMatch[0],
                text: blockMatch[1],
                displayMode: true,
            } as CustomKatexToken;
        }
        const inlineMatch = inlineMath.exec(src);
        if (inlineMatch) {
            return {
                type: "math",
                raw: inlineMatch[0],
                text: inlineMatch[1],
                displayMode: false,
            } as CustomKatexToken;
        }
        return null;
    },
    renderer(token: any) {
        try {
            return katex.renderToString(token.text, {
                throwOnError: false,
                displayMode: token.displayMode,
                output: "html",
            });
        } catch (error) {
            return token.text;
        }
    }
};

export { videoToken, detailsToken, noteToken, warningToken, mathExtentionToken, renderer }